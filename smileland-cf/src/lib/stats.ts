/** สถิติผู้เข้าชมแบบเคารพความเป็นส่วนตัว
 *  - ไม่ใช้คุกกี้ ไม่เก็บ IP: นับผู้เข้าชมไม่ซ้ำรายวันด้วยแฮช (IP + เบราว์เซอร์ + วันที่ + ค่าลับ) ที่ย้อนกลับไม่ได้ และเปลี่ยนทุกวัน
 *  - นับเฉพาะหน้าเว็บ (HTML) ที่โหลดสำเร็จ ไม่นับบอท หน้าแอดมิน และ API */
import type { Context } from 'hono';
import type { AppEnv, Bindings } from '../env';
import { clientIp, randomToken, sha256Hex } from './security';
import { invalidateSettings } from './settings';

const BOT = /bot|crawl|spider|slurp|facebookexternalhit|preview|headless|lighthouse|python|curl|wget|httpclient|axios|node-fetch|monitor|uptime|scan/i;
const SKIP = /^\/(admin|api|assets|img|demo-img|travel\/places|sitemaps?|robots|favicon|manage)/;

/** วันที่ตามเวลาไทย YYYY-MM-DD */
export const thDay = (offsetDays = 0) => new Date(Date.now() + 7 * 3600_000 - offsetDays * 86400_000).toISOString().slice(0, 10);

export function sourceOf(ref: string | undefined, host: string): string | null {
  if (!ref) return 'เข้าตรง / บุ๊กมาร์ก';
  let h = '';
  try { h = new URL(ref).hostname.toLowerCase(); } catch { return 'อื่น ๆ'; }
  if (!h || h === host) return null; // เปลี่ยนหน้าภายในเว็บ ไม่นับเป็นแหล่งที่มา
  if (/(^|\.)google\./.test(h)) return 'Google';
  if (/facebook\.com$|fb\.com$|fb\.me$|messenger\.com$/.test(h)) return 'Facebook';
  if (/line\.me$|lin\.ee$|line-apps|naver\.jp$/.test(h)) return 'LINE';
  if (/bing\.com$/.test(h)) return 'Bing';
  if (/tiktok\.com$/.test(h)) return 'TikTok';
  if (/youtube\.com$|youtu\.be$/.test(h)) return 'YouTube';
  if (/chatgpt\.com$|openai\.com$|perplexity\.ai$|claude\.ai$|gemini\.google/.test(h)) return 'AI แชตบอต';
  return h.replace(/^www\./, '').slice(0, 60);
}

async function salt(c: Context<AppEnv>): Promise<string> {
  const s = c.get('settings')?.stats_salt;
  if (s) return s;
  const v = randomToken(24);
  await c.env.DB.prepare(`INSERT OR IGNORE INTO settings (key, value) VALUES ('stats_salt', ?)`).bind(v).run();
  invalidateSettings();
  const row = await c.env.DB.prepare(`SELECT value FROM settings WHERE key = 'stats_salt'`).first<{ value: string }>();
  return row?.value || v;
}

/** เรียกหลังตอบกลับ (waitUntil) */
export async function recordVisit(c: Context<AppEnv>) {
  const day = thDay();
  const url = new URL(c.req.url);
  const path = decodeURIComponent(url.pathname).replace(/\/+$/, '') .slice(0, 120) || '/';
  const ua = c.req.header('user-agent') || '';
  const vh = (await sha256Hex(`${clientIp(c)}|${ua}|${day}|${await salt(c)}`)).slice(0, 20);
  const src = sourceOf(c.req.header('referer'), url.hostname);
  const stmts = [
    c.env.DB.prepare(`INSERT INTO visits_daily (day, path, views) VALUES (?, ?, 1) ON CONFLICT(day, path) DO UPDATE SET views = views + 1`).bind(day, path),
    c.env.DB.prepare(`INSERT OR IGNORE INTO visitors_daily (day, vh) VALUES (?, ?)`).bind(day, vh),
  ];
  if (src) stmts.push(c.env.DB.prepare(`INSERT INTO sources_daily (day, source, views) VALUES (?, ?, 1) ON CONFLICT(day, source) DO UPDATE SET views = views + 1`).bind(day, src));
  await c.env.DB.batch(stmts);
}

export function shouldCount(c: Context<AppEnv>, res: Response): boolean {
  if (c.req.method !== 'GET' || res.status !== 200) return false;
  if (!(res.headers.get('content-type') || '').includes('text/html')) return false;
  const p = c.req.path;
  if (SKIP.test(p)) return false;
  const ua = c.req.header('user-agent') || '';
  if (!ua || BOT.test(ua)) return false;
  const purpose = c.req.header('sec-purpose') || c.req.header('purpose') || '';
  if (/prefetch|prerender/i.test(purpose)) return false;
  return true;
}

export type StatsData = {
  days: { day: string; visitors: number; views: number }[];
  pages: { path: string; views: number }[];
  sources: { source: string; views: number }[];
};

export async function loadStats(env: Bindings, n = 30): Promise<StatsData> {
  const from = thDay(n - 1);
  const [v, u, p, s] = await env.DB.batch([
    env.DB.prepare(`SELECT day, sum(views) AS views FROM visits_daily WHERE day >= ? GROUP BY day`).bind(from),
    env.DB.prepare(`SELECT day, count(*) AS visitors FROM visitors_daily WHERE day >= ? GROUP BY day`).bind(from),
    env.DB.prepare(`SELECT path, sum(views) AS views FROM visits_daily WHERE day >= ? GROUP BY path ORDER BY views DESC LIMIT 25`).bind(from),
    env.DB.prepare(`SELECT source, sum(views) AS views FROM sources_daily WHERE day >= ? GROUP BY source ORDER BY views DESC LIMIT 15`).bind(from),
  ]);
  const vm = new Map((v.results as { day: string; views: number }[]).map((r) => [r.day, r.views]));
  const um = new Map((u.results as { day: string; visitors: number }[]).map((r) => [r.day, r.visitors]));
  const days = Array.from({ length: n }, (_, i) => thDay(n - 1 - i)).map((day) => ({ day, visitors: um.get(day) || 0, views: vm.get(day) || 0 }));
  return { days, pages: p.results as StatsData['pages'], sources: s.results as StatsData['sources'] };
}

/** ลบสถิติเก่ากว่า ~13 เดือน (เรียกจาก cron รายวัน) */
export async function pruneStats(env: Bindings) {
  const cut = thDay(400);
  await env.DB.batch([
    env.DB.prepare(`DELETE FROM visits_daily WHERE day < ?`).bind(cut),
    env.DB.prepare(`DELETE FROM visitors_daily WHERE day < ?`).bind(cut),
    env.DB.prepare(`DELETE FROM sources_daily WHERE day < ?`).bind(cut),
  ]);
}
