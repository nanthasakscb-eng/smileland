/** @jsxImportSource hono/jsx */
import { Hono, type Context } from 'hono';
import type { Child } from 'hono/jsx';
import { and, count, desc, eq, gte, like, or, type SQL } from 'drizzle-orm';
import type { AppEnv, AdminSession } from '../env';
import { db } from '../db';
import { admins, leads, listings, listingTokens, priceHistory, settings, timeline } from '../db/schema';
import { AdminLayout, Dashboard, LeadsAdminPage, ListingAdminDetail, ListingsAdminPage, LoginPage, PasswordPage, SettingsPage, UsersPage } from '../views/admin/admin';
import { createSession, destroySession, ensureBootstrapAdmin, loadSession, setAdminPassword, updateSession } from '../lib/session';
import { clientIp, hashPassword, rateLimit, sameOrigin, timingSafeEqual, verifyPassword, verifyTurnstile } from '../lib/security';
import { geo } from '../lib/geo';
import { addTimeline, getImages, getListing, getTimeline, reindex } from '../lib/listings';
import { clampInt, formatPrice, normPhone, nowSec } from '../lib/util';
import { invalidateSettings } from '../lib/settings';

export const admin = new Hono<AppEnv>();

admin.use('*', async (c, next) => {
  c.header('Cache-Control', 'no-store');
  c.header('X-Robots-Tag', 'noindex, nofollow');
  c.header('X-Frame-Options', 'DENY');
  await next();
});

/* ---------- login / logout ---------- */
admin.get('/login', async (c) => {
  await ensureBootstrapAdmin(c);
  if (await loadSession(c)) return c.redirect('/admin');
  return c.html(<AdminLayout title="เข้าสู่ระบบ"><LoginPage env={c.env} /></AdminLayout>);
});

admin.post('/login', async (c) => {
  const ip = clientIp(c);
  const page = (error: string, status = 400) => c.html(<AdminLayout title="เข้าสู่ระบบ"><LoginPage env={c.env} error={error} /></AdminLayout>, status as 400);
  if (!sameOrigin(c)) return page('คำขอไม่ถูกต้อง');
  const rl = await rateLimit(c.env, `login:${ip}`, 8, 900);
  if (!rl.ok) return page('พยายามเข้าสู่ระบบบ่อยเกินไป กรุณารอ 15 นาที', 429);
  const f = await c.req.parseBody();
  if (!(await verifyTurnstile(c.env, String(f['cf-turnstile-response'] || ''), ip))) return page('กรุณายืนยันว่าไม่ใช่บอท');
  await ensureBootstrapAdmin(c);
  const username = String(f.username || '').trim().toLowerCase().slice(0, 40);
  const password = String(f.password || '').slice(0, 200);
  const r = await db(c.env).select().from(admins).where(eq(admins.username, username)).limit(1);
  const a = r[0];
  const ok = a ? await verifyPassword(password, a.passHash, a.salt, a.iterations) : (await hashPassword(password), false);
  if (!a || !ok) return page('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง', 401);
  await db(c.env).update(admins).set({ lastLoginAt: nowSec() }).where(eq(admins.id, a.id));
  await createSession(c, { adminId: a.id, username: a.username, mustChange: !!a.mustChange });
  return c.redirect(a.mustChange ? '/admin/password' : '/admin', 303);
});

/* ---------- ต้องเข้าสู่ระบบสำหรับทุกหน้าด้านล่าง ---------- */
admin.use('*', async (c, next) => {
  const s = await loadSession(c);
  if (!s) return c.redirect('/admin/login');
  c.set('admin', s);
  if (c.req.method === 'POST') {
    if (!sameOrigin(c)) return c.text('Bad origin', 403);
    const f = await c.req.parseBody();
    if (!timingSafeEqual(String(f.csrf || ''), s.csrf)) return c.text('Bad CSRF token', 403);
  }
  if (s.mustChange && !['/admin/password', '/admin/logout'].includes(c.req.path)) return c.redirect('/admin/password');
  await next();
});

async function counts(c: Context<AppEnv>) {
  const d = db(c.env);
  const [p, l] = await Promise.all([
    d.select({ n: count() }).from(listings).where(eq(listings.status, 'pending')),
    d.select({ n: count() }).from(leads).where(eq(leads.status, 'new')),
  ]);
  return { pending: p[0].n, leads: l[0].n };
}
async function page(c: Context<AppEnv>, title: string, nav: string, body: Child) {
  return c.html(<AdminLayout title={title} admin={c.get('admin')} nav={nav} counts={await counts(c)}>{body}</AdminLayout>);
}

admin.post('/logout', async (c) => {
  await destroySession(c);
  return c.redirect('/admin/login', 303);
});

/* ---------- เปลี่ยนรหัสผ่าน ---------- */
admin.get('/password', (c) => page(c, 'เปลี่ยนรหัสผ่าน', 'password', <PasswordPage admin={c.get('admin')!} forced={c.get('admin')!.mustChange} />));
admin.post('/password', async (c) => {
  const s = c.get('admin')!;
  const f = await c.req.parseBody();
  const cur = String(f.current || ''), next = String(f.next || ''), next2 = String(f.next2 || '');
  const show = (error?: string, ok?: string) => page(c, 'เปลี่ยนรหัสผ่าน', 'password', <PasswordPage admin={c.get('admin')!} forced={c.get('admin')!.mustChange} error={error} ok={ok} />);
  const r = await db(c.env).select().from(admins).where(eq(admins.id, s.adminId)).limit(1);
  if (!r[0] || !(await verifyPassword(cur, r[0].passHash, r[0].salt, r[0].iterations))) return show('รหัสผ่านปัจจุบันไม่ถูกต้อง');
  if (next.length < 10) return show('รหัสผ่านใหม่ต้องมีอย่างน้อย 10 ตัวอักษร');
  if (next !== next2) return show('รหัสผ่านใหม่ทั้งสองช่องไม่ตรงกัน');
  if (next === cur) return show('รหัสผ่านใหม่ต้องไม่ซ้ำรหัสเดิม');
  await setAdminPassword(c, s.adminId, next);
  await updateSession(c, { mustChange: false });
  c.set('admin', { ...s, mustChange: false });
  return show(undefined, 'เปลี่ยนรหัสผ่านเรียบร้อย');
});

/* ---------- ภาพรวม ---------- */
admin.get('/', async (c) => {
  const d = db(c.env);
  const byStatus = await d.select({ s: listings.status, n: count() }).from(listings).groupBy(listings.status);
  const k: Record<string, number> = { pending: 0, active: 0, sold: 0 };
  for (const r of byStatus) k[r.s] = r.n;
  const [ln, cn, wk, recent, ls] = await Promise.all([
    d.select({ n: count() }).from(leads).where(eq(leads.status, 'new')),
    d.select({ n: count() }).from(leads).where(and(eq(leads.kind, 'consign'), eq(leads.status, 'new'))),
    d.select({ n: count() }).from(listings).where(gte(listings.createdAt, nowSec() - 7 * 86400)),
    d.select().from(listings).orderBy(desc(listings.id)).limit(8),
    d.select().from(leads).orderBy(desc(leads.id)).limit(8),
  ]);
  k.leadsNew = ln[0].n; k.consign = cn[0].n; k.week = wk[0].n;
  const g = await geo(c.env);
  const pm = new Map(g.provinces.map((p) => [p.code, p.nameTh]));
  return page(c, 'ภาพรวม', 'dash', <Dashboard k={k} recent={recent.map((r) => ({ ...r, provinceName: pm.get(r.provinceCode) }))} leads={ls} />);
});

/* ---------- รายการประกาศ ---------- */
admin.get('/listings', async (c) => {
  const status = c.req.query('status') || '';
  const q = (c.req.query('q') || '').trim().slice(0, 60);
  const pg = clampInt(c.req.query('page'), 1, 1000) || 1;
  const per = 30;
  const w: SQL[] = [];
  if (['pending', 'active', 'rejected', 'sold', 'expired', 'closed'].includes(status)) w.push(eq(listings.status, status as 'pending'));
  if (q) {
    const ph = normPhone(q);
    w.push(or(eq(listings.ref, q.toUpperCase()), like(listings.title, `%${q}%`), ...(ph.length >= 9 ? [eq(listings.ownerPhone, ph)] : []))!);
  }
  const where = w.length ? and(...w) : undefined;
  const d = db(c.env);
  const [rows, total] = await Promise.all([
    d.select().from(listings).where(where).orderBy(status === 'pending' ? listings.id : desc(listings.id)).limit(per).offset((pg - 1) * per),
    d.select({ n: count() }).from(listings).where(where),
  ]);
  const g = await geo(c.env);
  const pm = new Map(g.provinces.map((p) => [p.code, p.nameTh]));
  return page(c, 'ประกาศ', status === 'pending' ? 'pending' : 'listings',
    <ListingsAdminPage env={c.env} rows={rows.map((r) => ({ ...r, provinceName: pm.get(r.provinceCode) }))} status={status} q={q} page={pg} pages={Math.ceil(total[0].n / per)} total={total[0].n} />);
});

admin.get('/listings/:id{[0-9]+}', async (c) => {
  const id = parseInt(c.req.param('id'), 10);
  const l = await getListing(c.env, id);
  if (!l) return c.redirect('/admin/listings');
  const g = await geo(c.env);
  const loc = [g.districts.find((x) => x.code === l.districtCode)?.nameTh, g.provinces.find((x) => x.code === l.provinceCode)?.nameTh].filter(Boolean).join(', ');
  const [images, tl, ls] = await Promise.all([
    getImages(c.env, id), getTimeline(c.env, id),
    db(c.env).select().from(leads).where(eq(leads.listingId, id)).orderBy(desc(leads.id)).limit(100),
  ]);
  return page(c, l.ref, l.status === 'pending' ? 'pending' : 'listings',
    <ListingAdminDetail env={c.env} admin={c.get('admin')!} l={l} images={images} loc={loc} timeline={tl} leads={ls} msg={c.req.query('ok') || undefined} />);
});

admin.post('/listings/:id{[0-9]+}', async (c) => {
  const id = parseInt(c.req.param('id'), 10);
  const s = c.get('admin') as AdminSession;
  const actor = `admin:${s.username}`;
  const l = await getListing(c.env, id);
  if (!l) return c.redirect('/admin/listings', 303);
  const f = await c.req.parseBody();
  const action = String(f.action || '');
  const d = db(c.env);
  const now = nowSec();
  const ttl = parseInt(c.env.LISTING_TTL_DAYS || '180', 10) * 86400;
  let msg = 'บันทึกแล้ว';
  switch (action) {
    case 'approve': {
      if (l.status === 'sold') break;
      await d.update(listings).set({ status: 'active', approvedAt: l.approvedAt ?? now, expiresAt: now + ttl, rejectReason: null, updatedAt: now }).where(eq(listings.id, id));
      await addTimeline(c.env, id, l.status === 'pending' ? 'approved' : 'reopened', actor);
      await reindex(c.env, { ...l, status: 'active' });
      msg = 'อนุมัติและเผยแพร่แล้ว';
      break;
    }
    case 'reject': {
      const reason = String(f.reason || '').trim().slice(0, 300);
      if (!reason) { msg = 'กรุณาระบุเหตุผล'; break; }
      await d.update(listings).set({ status: 'rejected', rejectReason: reason, updatedAt: now }).where(eq(listings.id, id));
      await addTimeline(c.env, id, 'rejected', actor, reason);
      msg = 'ไม่อนุมัติประกาศแล้ว';
      break;
    }
    case 'feature': case 'unfeature':
      await d.update(listings).set({ featured: action === 'feature' ? 1 : 0, updatedAt: now }).where(eq(listings.id, id));
      await addTimeline(c.env, id, action === 'feature' ? 'featured' : 'unfeatured', actor);
      break;
    case 'sold': case 'close':
      await d.update(listings).set({ status: action === 'sold' ? 'sold' : 'closed', updatedAt: now }).where(eq(listings.id, id));
      await addTimeline(c.env, id, action === 'sold' ? 'sold' : 'closed', actor);
      if (action === 'close') await d.delete(listingTokens).where(eq(listingTokens.listingId, id));
      break;
    case 'price': {
      const price = clampInt(f.price, 1, 10_000_000_000);
      if (price && price !== l.price) {
        await d.batch([
          d.update(listings).set({ price, updatedAt: now }).where(eq(listings.id, id)),
          d.insert(priceHistory).values({ listingId: id, price }),
          d.insert(timeline).values({ listingId: id, event: 'price', actor, note: `฿${formatPrice(l.price)} → ฿${formatPrice(price)}` }),
        ]);
      }
      break;
    }
  }
  c.executionCtx.waitUntil(c.env.JOBS.send({ kind: 'sitemap', provinceCode: l.provinceCode }).catch(() => undefined));
  return c.redirect(`/admin/listings/${id}?ok=${encodeURIComponent(msg)}`, 303);
});

/* ---------- สร้างดัชนีค้นหาใหม่ (เช่น หลังนำเข้าข้อมูลเดิม) ---------- */
admin.post('/reindex', async (c) => {
  const after = clampInt((await c.req.parseBody()).after, 0, 1e12) || 0;
  const rows = await db(c.env).select().from(listings).where(and(eq(listings.status, 'active'), gte(listings.id, after + 1))).orderBy(listings.id).limit(200);
  for (const l of rows) await reindex(c.env, l);
  const last = rows.at(-1)?.id;
  const msg = rows.length === 200 ? `ทำดัชนีแล้วถึงประกาศ #${last} — กดอีกครั้งเพื่อทำต่อ` : `สร้างดัชนีค้นหาใหม่เรียบร้อย (${rows.length} รายการในรอบนี้)`;
  return c.redirect(`/admin/settings?ok=1&msg=${encodeURIComponent(msg)}${rows.length === 200 ? `&after=${last}` : ''}`, 303);
});

/* ---------- ลบประกาศตัวอย่างทั้งหมด (ก่อนเปิดใช้งานจริง) ---------- */
admin.post('/demo/delete', async (c) => {
  const DB = c.env.DB;
  const ids = (await DB.prepare("SELECT id FROM listings WHERE ref LIKE 'SL-DEMO%'").all<{ id: number }>()).results.map((r) => r.id);
  for (let i = 0; i < ids.length; i += 50) {
    const chunk = ids.slice(i, i + 50); const qs = chunk.map(() => '?').join(',');
    await DB.batch([
      DB.prepare(`DELETE FROM listing_tokens WHERE listing_id IN (${qs})`).bind(...chunk),
      DB.prepare(`DELETE FROM listing_images WHERE listing_id IN (${qs})`).bind(...chunk),
      DB.prepare(`DELETE FROM leads WHERE listing_id IN (${qs})`).bind(...chunk),
      DB.prepare(`DELETE FROM listings WHERE id IN (${qs})`).bind(...chunk),
    ]);
  }
  c.executionCtx.waitUntil(c.env.JOBS.send({ kind: 'sitemap-index' }).catch(() => undefined));
  return c.redirect(`/admin/settings?ok=1&msg=${encodeURIComponent(`ลบประกาศตัวอย่างแล้ว ${ids.length} รายการ`)}`, 303);
});

/* ---------- ผู้สนใจ ---------- */
admin.get('/leads', async (c) => {
  const status = c.req.query('status') || '';
  const kind = c.req.query('kind') || '';
  const w: SQL[] = [];
  if (['new', 'contacted', 'closed'].includes(status)) w.push(eq(leads.status, status as 'new'));
  if (['inquiry', 'consign', 'contact'].includes(kind)) w.push(eq(leads.kind, kind as 'inquiry'));
  const rows = await db(c.env).select({ lead: leads, ref: listings.ref }).from(leads).leftJoin(listings, eq(leads.listingId, listings.id))
    .where(w.length ? and(...w) : undefined).orderBy(desc(leads.id)).limit(300);
  return page(c, 'ผู้สนใจ', 'leads', <LeadsAdminPage rows={rows.map((r) => ({ ...r.lead, listingRef: r.ref }))} status={status} kind={kind} csrf={c.get('admin')!.csrf} />);
});
admin.post('/leads/:id{[0-9]+}', async (c) => {
  const f = await c.req.parseBody();
  const st = String(f.status || '');
  if (['new', 'contacted', 'closed'].includes(st)) await db(c.env).update(leads).set({ status: st as 'new' }).where(eq(leads.id, parseInt(c.req.param('id'), 10)));
  return c.redirect(c.req.header('referer') || '/admin/leads', 303);
});

/* ---------- ตั้งค่า ---------- */
const SETTING_KEYS = ['contact_phone', 'contact_line', 'contact_line_url', 'contact_email', 'company_name', 'company_address', 'dpo_contact', 'privacy_effective_date', 'data_retention'];
admin.get('/settings', (c) => page(c, 'ตั้งค่า', 'settings', <SettingsPage admin={c.get('admin')!} s={c.get('settings')} ok={c.req.query('ok') ? (c.req.query('msg') || 'บันทึกแล้ว') : undefined} after={c.req.query('after')} />));
admin.post('/settings', async (c) => {
  const f = await c.req.parseBody();
  const d = db(c.env);
  const stmts = SETTING_KEYS.map((k) => {
    let v = String(f[k] ?? '').trim().slice(0, 300);
    if (k === 'contact_line_url' && v && !/^https:\/\//.test(v)) v = '';
    return d.insert(settings).values({ key: k, value: v }).onConflictDoUpdate({ target: settings.key, set: { value: v } });
  });
  await d.batch(stmts as never);
  invalidateSettings();
  return c.redirect('/admin/settings?ok=1', 303);
});

/* ---------- ผู้ดูแลระบบ ---------- */
admin.get('/users', async (c) => {
  const users = await db(c.env).select({ id: admins.id, username: admins.username, createdAt: admins.createdAt, lastLoginAt: admins.lastLoginAt, mustChange: admins.mustChange }).from(admins).orderBy(admins.id);
  return page(c, 'ผู้ดูแลระบบ', 'users', <UsersPage admin={c.get('admin')!} users={users} ok={c.req.query('ok') || undefined} error={c.req.query('error') || undefined} />);
});
admin.post('/users', async (c) => {
  const f = await c.req.parseBody();
  const d = db(c.env);
  if (f.action === 'create') {
    const username = String(f.username || '').trim().toLowerCase();
    const pw = String(f.password || '');
    if (!/^[a-z0-9._-]{3,30}$/.test(username) || pw.length < 10) return c.redirect('/admin/users?error=' + encodeURIComponent('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้องตามเงื่อนไข'), 303);
    const h = await hashPassword(pw);
    const r = await d.insert(admins).values({ username, passHash: h.hash, salt: h.salt, iterations: h.iterations, mustChange: 1 }).onConflictDoNothing().returning({ id: admins.id });
    return c.redirect('/admin/users?' + (r.length ? 'ok=' + encodeURIComponent('เพิ่มผู้ดูแลแล้ว') : 'error=' + encodeURIComponent('ชื่อผู้ใช้นี้มีอยู่แล้ว')), 303);
  }
  if (f.action === 'delete') {
    const id = clampInt(f.id, 1, 1e9);
    if (id && id !== c.get('admin')!.adminId) await d.delete(admins).where(eq(admins.id, id));
    return c.redirect('/admin/users?ok=' + encodeURIComponent('ลบผู้ดูแลแล้ว'), 303);
  }
  return c.redirect('/admin/users', 303);
});

