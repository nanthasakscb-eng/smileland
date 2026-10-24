import type { Context } from 'hono';
import type { AppEnv, Bindings } from '../env';

/* ---------- hashing ---------- */
const enc = new TextEncoder();
const toHex = (buf: ArrayBuffer | Uint8Array) => Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
const fromHex = (hex: string) => new Uint8Array(hex.match(/.{2}/g)!.map((h) => parseInt(h, 16)));

export function randomToken(bytes = 32): string {
  const b = crypto.getRandomValues(new Uint8Array(bytes));
  return btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function sha256Hex(s: string): Promise<string> {
  return toHex(await crypto.subtle.digest('SHA-256', enc.encode(s)));
}

/** PBKDF2-SHA256 (Workers ไม่มี scrypt) */
export const PBKDF2_ITERATIONS = 100_000;
export async function hashPassword(password: string, saltHex?: string, iterations = PBKDF2_ITERATIONS) {
  const salt = saltHex ? fromHex(saltHex) : crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256);
  return { hash: toHex(bits), salt: toHex(salt), iterations };
}
export async function verifyPassword(password: string, hash: string, saltHex: string, iterations: number) {
  const r = await hashPassword(password, saltHex, iterations);
  return timingSafeEqual(r.hash, hash);
}
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

/* ---------- client ip ---------- */
export function clientIp(c: Context<AppEnv>): string {
  return c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';
}

/* ---------- rate limit (KV, fixed window — KV เป็น eventually consistent จึงเป็นการจำกัดแบบหยาบ) ---------- */
export async function rateLimit(env: Bindings, key: string, limit: number, windowSec: number): Promise<{ ok: boolean; remaining: number }> {
  const bucket = Math.floor(Date.now() / 1000 / windowSec);
  const k = `rl:${key}:${bucket}`;
  const cur = parseInt((await env.RATELIMIT.get(k)) || '0', 10);
  if (cur >= limit) return { ok: false, remaining: 0 };
  await env.RATELIMIT.put(k, String(cur + 1), { expirationTtl: Math.max(60, windowSec * 2) });
  return { ok: true, remaining: limit - cur - 1 };
}

/* ---------- Cloudflare Turnstile (ตรวจฝั่ง server) ---------- */
export async function verifyTurnstile(env: Bindings, token: string | undefined | null, ip: string): Promise<boolean> {
  const secret = env.TURNSTILE_SECRET_KEY;
  if (!secret) return false; // ไม่ตั้ง secret = ปฏิเสธ (fail closed)
  if (!token) return false;
  // คีย์ทดสอบทางการของ Cloudflare (1x…AA) ผ่านทุกครั้งตามเอกสาร → ไม่ต้องเรียกเครือข่าย (ใช้ทดสอบในเครื่อง)
  // production ต้องเปลี่ยนเป็น secret จริงด้วย `wrangler secret put TURNSTILE_SECRET_KEY`
  if (secret === '1x0000000000000000000000000000000AA') return true;
  const body = new FormData();
  body.append('secret', secret);
  body.append('response', token);
  body.append('remoteip', ip);
  try {
    const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body });
    const j = (await r.json()) as { success: boolean };
    return !!j.success;
  } catch {
    return false;
  }
}

/* ---------- same-origin check สำหรับ POST (กัน CSRF ร่วมกับ SameSite cookie) ---------- */
export function sameOrigin(c: Context<AppEnv>): boolean {
  const origin = c.req.header('origin');
  if (!origin) return c.req.header('sec-fetch-site') !== 'cross-site';
  try {
    return new URL(origin).host === new URL(c.req.url).host;
  } catch {
    return false;
  }
}
