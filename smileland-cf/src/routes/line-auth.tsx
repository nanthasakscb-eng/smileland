/** @jsxImportSource hono/jsx */
/** เข้าสู่ระบบ / สมัครสมาชิกด้วย LINE (LINE Login v2.1, OpenID Connect)
 *  - ไม่ต้องรอยืนยันอีเมล: LINE ยืนยันตัวตนให้แล้ว
 *  - ถ้า LINE ให้อีเมลมาและตรงกับบัญชีเดิม → ผูกกับบัญชีเดิม
 *  - ถ้าล็อกอินอยู่แล้วกด "เชื่อม LINE" → ผูก LINE กับบัญชีปัจจุบัน
 *  ตั้งค่า: LINE_LOGIN_CHANNEL_ID + LINE_LOGIN_CHANNEL_SECRET (set-keys.bat ข้อ 3)
 *  Callback URL ใน LINE Developers: {SITE_URL}/auth/line/callback */
import { Hono, type Context } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { and, eq, ne } from 'drizzle-orm';
import type { AppEnv } from '../env';
import { db } from '../db';
import { users, type User } from '../db/schema';
import { render } from './public';
import { MessagePage } from '../views/pages/account';
import { clientIp, hashPassword, randomToken, rateLimit, sameOrigin, timingSafeEqual } from '../lib/security';
import { createUserSession, getUser, normEmail, refreshUserSession } from '../lib/users';
import { isEmail, nowSec, str } from '../lib/util';

export const lineAuth = new Hono<AppEnv>();

const STATE_COOKIE = 'sl_line_state';
const meta = (title: string) => ({ title, noindex: true });
const safeNext = (n: unknown) => (typeof n === 'string' && /^\/[a-z0-9/_?=&-]*$/i.test(n) && !n.startsWith('//') ? n : '/account');
export const lineLoginEnabled = (env: AppEnv['Bindings']) => !!(env.LINE_LOGIN_CHANNEL_ID && env.LINE_LOGIN_CHANNEL_SECRET);
const callbackUrl = (c: Context<AppEnv>) => `${(c.env.SITE_URL || new URL(c.req.url).origin).replace(/\/+$/, '')}/auth/line/callback`;

type Pending = { nonce: string; next: string; linkUserId?: number };

const fail = (c: Context<AppEnv>, text: string, status = 400) =>
  render(c, meta('เข้าสู่ระบบด้วย LINE'), <MessagePage title="เข้าสู่ระบบด้วย LINE ไม่สำเร็จ" text={text} action={{ href: '/login', label: 'กลับไปหน้าเข้าสู่ระบบ' }} />, status);

/* ---------- เริ่ม: ส่งไปหน้า LINE ---------- */
lineAuth.get('/auth/line', async (c) => {
  if (!lineLoginEnabled(c.env)) return fail(c, 'ยังไม่เปิดใช้การเข้าสู่ระบบด้วย LINE กรุณาใช้อีเมลแทน', 503);
  if (!(await rateLimit(c.env, `line-start:${clientIp(c)}`, 20, 600)).ok) return fail(c, 'ลองบ่อยเกินไป กรุณารอสักครู่', 429);
  const me = c.get('user');
  const link = c.req.query('link') === '1' && me ? me.userId : undefined;
  const state = randomToken(24), nonce = randomToken(16);
  const p: Pending = { nonce, next: safeNext(c.req.query('next') || (link ? '/account?tab=profile' : '/account')), linkUserId: link };
  await c.env.SESSIONS.put(`line:${state}`, JSON.stringify(p), { expirationTtl: 600 });
  setCookie(c, STATE_COOKIE, state, { httpOnly: true, sameSite: 'Lax', path: '/auth/line', maxAge: 600, secure: new URL(c.req.url).protocol === 'https:' });
  const q = new URLSearchParams({
    response_type: 'code',
    client_id: c.env.LINE_LOGIN_CHANNEL_ID!,
    redirect_uri: callbackUrl(c),
    state,
    scope: 'profile openid email',
    nonce,
    bot_prompt: 'normal', // ชวนเพิ่มเพื่อน LINE OA (ถ้าผูก OA กับ channel ไว้)
  });
  return c.redirect(`https://access.line.me/oauth2/v2.1/authorize?${q}`, 302);
});

/* ---------- กลับมาจาก LINE ---------- */
lineAuth.get('/auth/line/callback', async (c) => {
  if (!lineLoginEnabled(c.env)) return fail(c, 'ยังไม่เปิดใช้การเข้าสู่ระบบด้วย LINE', 503);
  const ip = clientIp(c);
  if (!(await rateLimit(c.env, `line-cb:${ip}`, 30, 600)).ok) return fail(c, 'ลองบ่อยเกินไป กรุณารอสักครู่', 429);
  const state = String(c.req.query('state') || '');
  const cookieState = getCookie(c, STATE_COOKIE) || '';
  deleteCookie(c, STATE_COOKIE, { path: '/auth/line' });
  if (!state || !cookieState || !timingSafeEqual(state, cookieState)) return fail(c, 'ลิงก์หมดอายุหรือเปิดคนละเบราว์เซอร์ กรุณากดเข้าสู่ระบบด้วย LINE อีกครั้ง');
  const raw = await c.env.SESSIONS.get(`line:${state}`);
  await c.env.SESSIONS.delete(`line:${state}`);
  if (!raw) return fail(c, 'หมดเวลา กรุณากดเข้าสู่ระบบด้วย LINE อีกครั้ง');
  const p = JSON.parse(raw) as Pending;
  if (c.req.query('error')) return c.redirect('/login', 303); // ผู้ใช้กดยกเลิกที่หน้า LINE
  const code = String(c.req.query('code') || '');
  if (!code) return fail(c, 'ไม่ได้รับข้อมูลจาก LINE');

  // แลก code เป็น token แล้วตรวจ id_token กับ LINE โดยตรง
  let prof: { sub: string; name?: string; picture?: string; email?: string };
  try {
    const tr = await fetch('https://api.line.me/oauth2/v2.1/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: callbackUrl(c), client_id: c.env.LINE_LOGIN_CHANNEL_ID!, client_secret: c.env.LINE_LOGIN_CHANNEL_SECRET! }),
    });
    if (!tr.ok) throw new Error(`token ${tr.status}`);
    const tok = await tr.json<{ id_token?: string }>();
    if (!tok.id_token) throw new Error('no id_token');
    const vr = await fetch('https://api.line.me/oauth2/v2.1/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ id_token: tok.id_token, client_id: c.env.LINE_LOGIN_CHANNEL_ID!, nonce: p.nonce }),
    });
    if (!vr.ok) throw new Error(`verify ${vr.status}`);
    prof = await vr.json();
    if (!prof.sub || !/^U[0-9a-f]{32}$/.test(prof.sub)) throw new Error('bad sub');
  } catch (e) {
    console.error('LINE login failed', String(e));
    return fail(c, 'ติดต่อ LINE ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง', 502);
  }

  const d = db(c.env);
  const email = prof.email && isEmail(normEmail(prof.email)) ? normEmail(prof.email) : '';
  const picture = prof.picture && /^https:\/\/[a-z0-9.-]+\.line-scdn\.net\//i.test(prof.picture) ? prof.picture.slice(0, 300) : null;
  const bySub = (await d.select().from(users).where(eq(users.lineSub, prof.sub)).limit(1))[0];

  /* ผูก LINE กับบัญชีที่ล็อกอินอยู่ */
  if (p.linkUserId) {
    const me = c.get('user');
    if (!me || me.userId !== p.linkUserId) return fail(c, 'กรุณาเข้าสู่ระบบก่อน แล้วกดเชื่อม LINE อีกครั้ง');
    if (bySub && bySub.id !== me.userId) return c.redirect('/account?tab=profile&error=' + encodeURIComponent('LINE นี้ผูกกับบัญชีอื่นอยู่แล้ว'), 303);
    const cur = await getUser(c, me.userId);
    if (!cur) return fail(c, 'ไม่พบบัญชี กรุณาเข้าสู่ระบบอีกครั้ง');
    // LINE ยืนยันตัวตนแล้ว → ถือว่ายืนยันบัญชีแล้ว (ใช้แทนการกดลิงก์ในอีเมล)
    await d.update(users).set({ lineSub: prof.sub, linePicture: picture, emailVerifiedAt: cur.emailVerifiedAt ?? nowSec() }).where(eq(users.id, me.userId));
    const nu = await getUser(c, me.userId); if (nu) await refreshUserSession(c, nu);
    return c.redirect('/account?tab=profile&ok=' + encodeURIComponent(cur.emailVerifiedAt ? 'เชื่อมบัญชี LINE แล้ว ครั้งต่อไปกด "เข้าสู่ระบบด้วย LINE" ได้เลย' : 'ยืนยันบัญชีด้วย LINE แล้ว ลงประกาศได้เลย'), 303);
  }

  let u: User | undefined = bySub;
  if (!u && email) {
    // อีเมลจาก LINE ผ่านการยืนยันโดย LINE แล้ว → ผูกกับบัญชีเดิมที่ใช้อีเมลเดียวกัน
    const byEmail = (await d.select().from(users).where(eq(users.email, email)).limit(1))[0];
    if (byEmail) {
      if (byEmail.lineSub && byEmail.lineSub !== prof.sub) return fail(c, 'อีเมลนี้ผูกกับ LINE บัญชีอื่นอยู่แล้ว กรุณาเข้าสู่ระบบด้วยอีเมลและรหัสผ่าน');
      await d.update(users).set({ lineSub: prof.sub, linePicture: picture, emailVerifiedAt: byEmail.emailVerifiedAt ?? nowSec() }).where(eq(users.id, byEmail.id));
      u = (await getUser(c, byEmail.id))!;
    }
  }
  if (!u) {
    // สมัครใหม่ (LINE ยืนยันตัวตนแล้ว → ไม่ต้องยืนยันอีเมล) รหัสผ่านสุ่มที่ไม่มีใครรู้
    if (!(await rateLimit(c.env, `line-reg:${ip}`, 5, 3600)).ok) return fail(c, 'สมัครบ่อยเกินไป กรุณาลองใหม่ภายหลัง', 429);
    const h = await hashPassword(randomToken(32));
    const name = (str(prof.name, 80) || 'สมาชิก LINE').trim();
    const r = await d.insert(users).values({
      email: email || `line-${prof.sub.toLowerCase()}@line.invalid`,
      passHash: h.hash, salt: h.salt, iterations: h.iterations,
      name: name.length >= 2 ? name : 'สมาชิก LINE',
      phone: null, emailVerifiedAt: nowSec(), lineSub: prof.sub, linePicture: picture,
    }).returning();
    u = r[0];
  } else if (!u.emailVerifiedAt || picture !== u.linePicture) {
    await d.update(users).set({ emailVerifiedAt: u.emailVerifiedAt ?? nowSec(), linePicture: picture }).where(eq(users.id, u.id));
    u = (await getUser(c, u.id))!;
  }
  if (u.status === 'suspended') return fail(c, 'บัญชีนี้ถูกระงับ กรุณาติดต่อทีมงาน', 403);
  await d.update(users).set({ lastLoginAt: nowSec() }).where(eq(users.id, u.id));
  await createUserSession(c, u);
  // ยังไม่มีเบอร์ → ไปกรอกเบอร์ก่อน (ใช้ตอนลงประกาศ)
  return c.redirect(u.phone ? p.next : '/account?tab=profile&ok=' + encodeURIComponent('เข้าสู่ระบบด้วย LINE แล้ว กรุณาใส่เบอร์โทรเพื่อใช้ลงประกาศ'), 303);
});

/* ---------- ยกเลิกการเชื่อม LINE (เฉพาะบัญชีที่มีอีเมลจริง ไม่งั้นจะเข้าบัญชีไม่ได้) ---------- */
lineAuth.post('/account/line/unlink', async (c) => {
  const s = c.get('user');
  if (!s) return c.redirect('/login', 303);
  const f = await c.req.parseBody();
  if (!sameOrigin(c) || !timingSafeEqual(String(f.csrf || ''), s.csrf)) return c.text('Bad CSRF token', 403);
  const u = await getUser(c, s.userId);
  if (!u) return c.redirect('/login', 303);
  if (u.email.endsWith('@line.invalid')) return c.redirect('/account?tab=profile&error=' + encodeURIComponent('บัญชีนี้ใช้ LINE เข้าสู่ระบบอย่างเดียว ยกเลิกการเชื่อมไม่ได้'), 303);
  await db(c.env).update(users).set({ lineSub: null, linePicture: null }).where(and(eq(users.id, u.id), ne(users.email, '')));
  await refreshUserSession(c, u);
  return c.redirect('/account?tab=profile&ok=' + encodeURIComponent('ยกเลิกการเชื่อม LINE แล้ว'), 303);
});
