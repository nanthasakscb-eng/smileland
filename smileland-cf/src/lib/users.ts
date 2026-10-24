import type { Context, Next } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { and, eq, gt, isNull } from 'drizzle-orm';
import type { AppEnv, UserSession } from '../env';
import { db } from '../db';
import { emailTokens, users, type User } from '../db/schema';
import { randomToken, sha256Hex } from './security';
import { mailTemplate, sendMail } from './mail';
import { nowSec } from './util';

/* ---------- session ของสมาชิก (KV, cookie แยกจากแอดมิน) ---------- */
const COOKIE = 'sl_user';
const TTL = 60 * 60 * 24 * 30; // 30 วัน

export async function createUserSession(c: Context<AppEnv>, u: User) {
  const id = randomToken(32);
  const sess: UserSession = { userId: u.id, email: u.email, name: u.name, verified: !!u.emailVerifiedAt, csrf: randomToken(16) };
  await c.env.SESSIONS.put(`u:${id}`, JSON.stringify(sess), { expirationTtl: TTL });
  setCookie(c, COOKIE, id, { httpOnly: true, sameSite: 'Lax', path: '/', maxAge: TTL, secure: new URL(c.req.url).protocol === 'https:' });
  return sess;
}
export async function loadUserSession(c: Context<AppEnv>): Promise<UserSession | undefined> {
  const id = getCookie(c, COOKIE);
  if (!id || id.length > 64) return;
  const raw = await c.env.SESSIONS.get(`u:${id}`);
  return raw ? (JSON.parse(raw) as UserSession) : undefined;
}
export async function refreshUserSession(c: Context<AppEnv>, u: User) {
  const id = getCookie(c, COOKIE);
  const cur = await loadUserSession(c);
  if (!id || !cur) return;
  const next: UserSession = { ...cur, email: u.email, name: u.name, verified: !!u.emailVerifiedAt };
  await c.env.SESSIONS.put(`u:${id}`, JSON.stringify(next), { expirationTtl: TTL });
  c.set('user', next);
}
export async function destroyUserSession(c: Context<AppEnv>) {
  const id = getCookie(c, COOKIE);
  if (id) await c.env.SESSIONS.delete(`u:${id}`);
  deleteCookie(c, COOKIE, { path: '/' });
}

/** middleware: โหลดสมาชิกที่ล็อกอิน (ถ้ามี cookie) ใส่ c.var.user */
export async function withUser(c: Context<AppEnv>, next: Next) {
  if (getCookie(c, COOKIE)) {
    const s = await loadUserSession(c);
    if (s) c.set('user', s);
  }
  await next();
}

export async function getUser(c: Context<AppEnv>, id: number) {
  const r = await db(c.env).select().from(users).where(eq(users.id, id)).limit(1);
  return r[0] ?? null;
}
export const normEmail = (e: string) => String(e || '').trim().toLowerCase().slice(0, 120);

/* ---------- token ยืนยันอีเมล / รีเซ็ตรหัสผ่าน ---------- */
const TOKEN_TTL = { verify: 60 * 60 * 48, reset: 60 * 60 } as const;

export async function issueToken(c: Context<AppEnv>, userId: number, purpose: 'verify' | 'reset') {
  const token = randomToken(32);
  await db(c.env).insert(emailTokens).values({ tokenHash: await sha256Hex(token), userId, purpose, expiresAt: nowSec() + TOKEN_TTL[purpose] });
  return token;
}
export async function consumeToken(c: Context<AppEnv>, token: string, purpose: 'verify' | 'reset') {
  if (!/^[A-Za-z0-9_-]{30,60}$/.test(token)) return null;
  const h = await sha256Hex(token);
  const d = db(c.env);
  const r = await d.select().from(emailTokens).where(and(eq(emailTokens.tokenHash, h), eq(emailTokens.purpose, purpose), isNull(emailTokens.usedAt), gt(emailTokens.expiresAt, nowSec()))).limit(1);
  if (!r[0]) return null;
  await d.update(emailTokens).set({ usedAt: nowSec() }).where(eq(emailTokens.tokenHash, h));
  return r[0].userId;
}

const origin = (c: Context<AppEnv>) => new URL(c.req.url).origin;

export async function sendVerifyEmail(c: Context<AppEnv>, u: User) {
  const token = await issueToken(c, u.id, 'verify');
  const url = `${origin(c)}/verify?token=${token}`;
  const m = mailTemplate('ยืนยันอีเมลเพื่อเริ่มลงประกาศ', [
    `สวัสดีคุณ${u.name}`,
    'ขอบคุณที่สมัครสมาชิก SMILELAND กรุณากดปุ่มด้านล่างเพื่อยืนยันอีเมล หลังยืนยันแล้วคุณจะลงประกาศขาย/ให้เช่าได้ทันที',
    'ลิงก์นี้ใช้ได้ภายใน 48 ชั่วโมง',
  ], { label: 'ยืนยันอีเมล', url });
  return sendMail(c.env, { to: u.email, subject: 'ยืนยันอีเมล SMILELAND', ...m, kind: 'verify', userId: u.id });
}
export async function sendResetEmail(c: Context<AppEnv>, u: User) {
  const token = await issueToken(c, u.id, 'reset');
  const url = `${origin(c)}/reset?token=${token}`;
  const m = mailTemplate('ตั้งรหัสผ่านใหม่', [
    `สวัสดีคุณ${u.name}`,
    'มีการขอตั้งรหัสผ่านใหม่สำหรับบัญชี SMILELAND ของคุณ กดปุ่มด้านล่างเพื่อตั้งรหัสใหม่ (ลิงก์ใช้ได้ 1 ชั่วโมง)',
    'หากคุณไม่ได้ขอ ไม่ต้องทำอะไร รหัสผ่านเดิมยังใช้ได้ตามปกติ',
  ], { label: 'ตั้งรหัสผ่านใหม่', url });
  return sendMail(c.env, { to: u.email, subject: 'ตั้งรหัสผ่านใหม่ SMILELAND', ...m, kind: 'reset', userId: u.id });
}

/* ---------- สิทธิ์ทีมผู้ดูแล ---------- */
export const PERMS: Record<string, string> = {
  'listings.review': 'ตรวจ/อนุมัติประกาศ',
  'listings.edit': 'แก้ไขประกาศ (ราคา ปิดประกาศ ประกาศแนะนำ)',
  leads: 'ดู/จัดการผู้สนใจ และคำขอฝากขาย',
  members: 'จัดการสมาชิก (ยืนยันอีเมล ระงับบัญชี)',
  settings: 'ตั้งค่าเว็บไซต์ กล่องอีเมล ประกาศตัวอย่าง',
  staff: 'จัดการทีมผู้ดูแลและสิทธิ์',
};
export const can = (s: { isOwner?: boolean; perms?: string[] } | undefined, perm: string) => !!s && (!!s.isOwner || (s.perms ?? []).includes(perm));
