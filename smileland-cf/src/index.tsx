/** @jsxImportSource hono/jsx */
// อีสานน่าอยู่ — Cloudflare Workers entry (Hono + Drizzle + D1 + R2 + KV + Queues + Cron)
import { Hono } from 'hono';
import { secureHeaders } from 'hono/secure-headers';
import type { AppEnv, Bindings, Job } from './env';
import { pub, notFound, render } from './routes/public';
import { api } from './routes/api';
import { admin } from './routes/admin';
import { seo } from './routes/seo';
import { account } from './routes/account';
import { lineAuth } from './routes/line-auth';
import { withUser } from './lib/users';
import { loadSettings } from './lib/settings';
import { dailyCron, handleJob } from './lib/jobs';
import { recordVisit, shouldCount } from './lib/stats';

const app = new Hono<AppEnv>({ strict: false });

app.use('*', secureHeaders({
  contentSecurityPolicy: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", 'https://challenges.cloudflare.com'],
    frameSrc: ['https://challenges.cloudflare.com'],
    connectSrc: ["'self'", 'https://challenges.cloudflare.com', 'https://tiles.openfreemap.org', 'https://*.openfreemap.org', 'https://nominatim.openstreetmap.org'],
    imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
    styleSrc: ["'self'", "'unsafe-inline'"],
    fontSrc: ["'self'", 'data:', 'https://tiles.openfreemap.org'],
    workerSrc: ["'self'", 'blob:'],
    childSrc: ['blob:'],
    objectSrc: ["'none'"],
    baseUri: ["'self'"],
    formAction: ["'self'"],
    frameAncestors: ["'none'"],
  },
  referrerPolicy: 'strict-origin-when-cross-origin',
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: false,
}));

app.use('*', async (c, next) => {
  c.set('settings', await loadSettings(c.env));
  await next();
});

// ไม่ใช้ด่าน CAPTCHA แบบบล็อกทั้งเว็บอีกต่อไป (เดิมทำให้ Googlebot เข้าไม่ได้)
// ใช้ Turnstile เฉพาะตอนส่งฟอร์ม + rate limit แทน
app.use('*', withUser);
// นับผู้เข้าชม (หลังตอบกลับ ไม่ทำให้หน้าเว็บช้า)
app.use('*', async (c, next) => {
  await next();
  try { if (shouldCount(c, c.res)) c.executionCtx.waitUntil(recordVisit(c).catch((e) => console.error('stats', e))); } catch { /* ignore */ }
});
app.route('/', seo);
app.route('/api', api);
app.route('/admin', admin);
app.route('/', lineAuth);
app.route('/', account);
app.route('/', pub);

app.notFound((c) => (c.req.path.startsWith('/api/') ? c.json({ ok: false, error: 'not found' }, 404) : notFound(c)));
app.onError((err, c) => {
  console.error('unhandled', err);
  if (c.req.path.startsWith('/api/')) return c.json({ ok: false, error: 'เกิดข้อผิดพลาด กรุณาลองใหม่' }, 500);
  return render(c, { title: 'เกิดข้อผิดพลาด', noindex: true }, (
    <div class="wrap" style="padding:80px 20px;text-align:center"><h1>ขออภัย ระบบขัดข้องชั่วคราว</h1><p class="muted">กรุณาลองใหม่อีกครั้งในอีกสักครู่</p><a class="btn btn-ink" href="/">กลับหน้าแรก</a></div>
  ), 500);
});

export default {
  fetch: app.fetch,
  async scheduled(_e: ScheduledController, env: Bindings, ctx: ExecutionContext) {
    ctx.waitUntil(dailyCron(env).then((r) => console.log('cron', r)));
  },
  async queue(batch: MessageBatch<Job>, env: Bindings) {
    // รวมงานซ้ำในชุดเดียวกัน (เช่น อนุมัติหลายประกาศในจังหวัดเดียว)
    const seen = new Set<string>();
    for (const m of batch.messages) {
      const k = JSON.stringify(m.body);
      if (seen.has(k)) { m.ack(); continue; }
      seen.add(k);
      try { await handleJob(env, m.body); m.ack(); } catch (e) { console.error('job failed', m.body, e); m.retry(); }
    }
  },
} satisfies ExportedHandler<Bindings, Job>;
