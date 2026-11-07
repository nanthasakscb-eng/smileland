import type { Context } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { eq } from 'drizzle-orm';
import type { AppEnv, AdminSession } from '../env';
import { randomToken, hashPassword } from './security';
import { db } from '../db';
import { admins } from '../db/schema';

const COOKIE = 'sl_admin';
const TTL = 60 * 60 * 8; // 8 ชั่วโมง

export async function createSession(c: Context<AppEnv>, s: Omit<AdminSession, 'csrf'>) {
  const id = randomToken(32);
  const sess: AdminSession = { ...s, csrf: randomToken(16) };
  await c.env.SESSIONS.put(`s:${id}`, JSON.stringify(sess), { expirationTtl: TTL });
  setCookie(c, COOKIE, id, {
    httpOnly: true, sameSite: 'Strict', path: '/', maxAge: TTL,
    secure: new URL(c.req.url).protocol === 'https:',
  });
  return sess;
}

export async function loadSession(c: Context<AppEnv>): Promise<AdminSession | undefined> {
  const id = getCookie(c, COOKIE);
  if (!id || id.length > 64) return;
  const raw = await c.env.SESSIONS.get(`s:${id}`);
  if (!raw) return;
  return JSON.parse(raw) as AdminSession;
}

export async function updateSession(c: Context<AppEnv>, patch: Partial<AdminSession>) {
  const id = getCookie(c, COOKIE);
  const cur = await loadSession(c);
  if (!id || !cur) return;
  await c.env.SESSIONS.put(`s:${id}`, JSON.stringify({ ...cur, ...patch }), { expirationTtl: TTL });
}

export async function destroySession(c: Context<AppEnv>) {
  const id = getCookie(c, COOKIE);
  if (id) await c.env.SESSIONS.delete(`s:${id}`);
  deleteCookie(c, COOKIE, { path: '/' });
}

/** สร้างแอดมินคนแรกจาก ADMIN_INITIAL_PASSWORD ถ้ายังไม่มีแอดมินในระบบ (บังคับเปลี่ยนรหัสเมื่อเข้าครั้งแรก) */
export async function ensureBootstrapAdmin(c: Context<AppEnv>) {
  const d = db(c.env);
  const any = await d.select({ id: admins.id }).from(admins).limit(1);
  if (any.length) return;
  const pw = c.env.ADMIN_INITIAL_PASSWORD;
  if (!pw || pw.length < 10) return;
  const h = await hashPassword(pw);
  await d.insert(admins).values({ username: 'admin', passHash: h.hash, salt: h.salt, iterations: h.iterations, mustChange: 1, isOwner: 1 }).onConflictDoNothing();
}

export async function setAdminPassword(c: Context<AppEnv>, adminId: number, pw: string) {
  const h = await hashPassword(pw);
  await db(c.env).update(admins).set({ passHash: h.hash, salt: h.salt, iterations: h.iterations, mustChange: 0 }).where(eq(admins.id, adminId));
}
