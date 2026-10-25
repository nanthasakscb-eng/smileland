/** @jsxImportSource hono/jsx */
import { Hono, type Context } from 'hono';
import type { Child } from 'hono/jsx';
import { and, count, desc, eq, gte, like, or, sql, type SQL } from 'drizzle-orm';
import type { AppEnv, AdminSession } from '../env';
import { db } from '../db';
import { admins, leads, listings, listingTokens, outbox, priceHistory, settings, timeline, users } from '../db/schema';
import { AdminLayout, Dashboard, LeadsAdminPage, ListingAdminDetail, ListingsAdminPage, LoginPage, MembersPage, NoPermPage, OutboxPage, PasswordPage, SettingsPage, StaffPage } from '../views/admin/admin';
import { createSession, destroySession, ensureBootstrapAdmin, loadSession, setAdminPassword, updateSession } from '../lib/session';
import { clientIp, hashPassword, rateLimit, sameOrigin, timingSafeEqual, verifyPassword, verifyTurnstile } from '../lib/security';
import { geo } from '../lib/geo';
import { inServiceArea } from '../lib/service-area';
import { addTimeline, getImages, getListing, getTimeline, reindex } from '../lib/listings';
import { clampInt, formatPrice, normPhone, nowSec } from '../lib/util';
import { PERMS, can, getUser, sendVerifyEmail } from '../lib/users';
import type { Next } from 'hono';
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
  let username = '';
  const page = (error: string, status = 400) => c.html(<AdminLayout title="เข้าสู่ระบบ"><LoginPage env={c.env} error={error} username={username} /></AdminLayout>, status as 400);
  if (!sameOrigin(c)) return page('คำขอไม่ถูกต้อง');
  const rl = await rateLimit(c.env, `login:${ip}`, 8, 900);
  if (!rl.ok) return page('พยายามเข้าสู่ระบบบ่อยเกินไป กรุณารอ 15 นาที', 429);
  const f = await c.req.parseBody();
  username = String(f.username || '').trim().toLowerCase().slice(0, 40);
  if (!(await verifyTurnstile(c.env, String(f['cf-turnstile-response'] || ''), ip))) return page('กรุณายืนยันว่าไม่ใช่บอท');
  await ensureBootstrapAdmin(c);
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
  const s0 = await loadSession(c);
  if (!s0) return c.redirect('/admin/login');
  // โหลดสิทธิ์ล่าสุดทุกครั้ง (ถอนสิทธิ์/ลบผู้ดูแลมีผลทันที)
  const row = (await db(c.env).select().from(admins).where(eq(admins.id, s0.adminId)).limit(1))[0];
  if (!row) { await destroySession(c); return c.redirect('/admin/login'); }
  let perms: string[] = []; try { perms = JSON.parse(row.permissions || '[]'); } catch { /* ignore */ }
  const s = { ...s0, isOwner: !!row.isOwner, perms };
  c.set('admin', s);
  if (c.req.method === 'POST') {
    if (!sameOrigin(c)) return c.text('Bad origin', 403);
    const f = await c.req.parseBody();
    if (!timingSafeEqual(String(f.csrf || ''), s.csrf)) return c.text('Bad CSRF token', 403);
  }
  if (s.mustChange && !['/admin/password', '/admin/logout'].includes(c.req.path)) return c.redirect('/admin/password');
  await next();
});

/** ตรวจสิทธิ์: ต้องมีอย่างน้อยหนึ่งสิทธิ์ในรายการ */
const need = (...perms: string[]) => async (c: Context<AppEnv>, next: Next) => {
  const a = c.get('admin');
  if (!perms.some((p) => can(a, p))) return page(c, 'ไม่มีสิทธิ์', '', <NoPermPage need={perms.map((p) => PERMS[p] || p)} />, 403);
  await next();
};
async function counts(c: Context<AppEnv>) {
  const d = db(c.env);
  const [p, l] = await Promise.all([
    d.select({ n: count() }).from(listings).where(eq(listings.status, 'pending')),
    d.select({ n: count() }).from(leads).where(eq(leads.status, 'new')),
  ]);
  return { pending: p[0].n, leads: l[0].n };
}
async function page(c: Context<AppEnv>, title: string, nav: string, body: Child, status = 200) {
  return c.html(<AdminLayout title={title} admin={c.get('admin')} nav={nav} counts={await counts(c)}>{body}</AdminLayout>, status as 200);
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
admin.get('/listings', need('listings.review', 'listings.edit'), async (c) => {
  const status = c.req.query('status') || '';
  const q = (c.req.query('q') || '').trim().slice(0, 60);
  const pg = clampInt(c.req.query('page'), 1, 1000) || 1;
  const per = 30;
  const w: SQL[] = [];
  if (['pending', 'active', 'rejected', 'sold', 'expired', 'closed'].includes(status)) w.push(eq(listings.status, status as 'pending'));
  if (q) {
    const ph = normPhone(q);
    w.push(or(eq(listings.ref, q.toUpperCase()), like(listings.title, `%${q}%`), eq(listings.ownerEmail, q.toLowerCase()), ...(ph.length >= 9 ? [eq(listings.ownerPhone, ph)] : []))!);
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

admin.get('/listings/:id{[0-9]+}', need('listings.review', 'listings.edit'), async (c) => {
  const id = parseInt(c.req.param('id')!, 10);
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

admin.post('/listings/:id{[0-9]+}', need('listings.review', 'listings.edit'), async (c) => {
  const id = parseInt(c.req.param('id')!, 10);
  const s = c.get('admin') as AdminSession;
  const actor = `admin:${s.username}`;
  const l = await getListing(c.env, id);
  if (!l) return c.redirect('/admin/listings', 303);
  const f = await c.req.parseBody();
  const action = String(f.action || '');
  const needPerm = ['approve', 'reject'].includes(action) ? 'listings.review' : 'listings.edit';
  if (!can(s, needPerm)) return c.redirect(`/admin/listings/${id}?ok=${encodeURIComponent('ไม่มีสิทธิ์: ' + PERMS[needPerm])}`, 303);
  const d = db(c.env);
  const now = nowSec();
  const ttl = parseInt(c.env.LISTING_TTL_DAYS || '180', 10) * 86400;
  let msg = 'บันทึกแล้ว';
  switch (action) {
    case 'approve': {
      if (!inServiceArea(l.provinceCode)) { msg = 'ให้บริการเฉพาะภาคอีสาน ไม่สามารถเผยแพร่ประกาศนอกพื้นที่'; break; }
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
admin.post('/reindex', need('settings'), async (c) => {
  const after = clampInt((await c.req.parseBody()).after, 0, 1e12) || 0;
  const rows = await db(c.env).select().from(listings).where(and(eq(listings.status, 'active'), gte(listings.id, after + 1))).orderBy(listings.id).limit(200);
  for (const l of rows) await reindex(c.env, l);
  const last = rows.at(-1)?.id;
  const msg = rows.length === 200 ? `ทำดัชนีแล้วถึงประกาศ #${last} — กดอีกครั้งเพื่อทำต่อ` : `สร้างดัชนีค้นหาใหม่เรียบร้อย (${rows.length} รายการในรอบนี้)`;
  return c.redirect(`/admin/settings?ok=1&msg=${encodeURIComponent(msg)}${rows.length === 200 ? `&after=${last}` : ''}`, 303);
});

/* ---------- ลบประกาศตัวอย่างทั้งหมด (ก่อนเปิดใช้งานจริง) ---------- */
admin.post('/demo/delete', need('settings'), async (c) => {
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
admin.get('/leads', need('leads'), async (c) => {
  const status = c.req.query('status') || '';
  const kind = c.req.query('kind') || '';
  const w: SQL[] = [];
  if (['new', 'contacted', 'closed'].includes(status)) w.push(eq(leads.status, status as 'new'));
  if (['inquiry', 'consign', 'contact'].includes(kind)) w.push(eq(leads.kind, kind as 'inquiry'));
  const rows = await db(c.env).select({ lead: leads, ref: listings.ref }).from(leads).leftJoin(listings, eq(leads.listingId, listings.id))
    .where(w.length ? and(...w) : undefined).orderBy(desc(leads.id)).limit(300);
  return page(c, 'ผู้สนใจ', 'leads', <LeadsAdminPage rows={rows.map((r) => ({ ...r.lead, listingRef: r.ref }))} status={status} kind={kind} csrf={c.get('admin')!.csrf} />);
});
admin.post('/leads/:id{[0-9]+}', need('leads'), async (c) => {
  const f = await c.req.parseBody();
  const st = String(f.status || '');
  if (['new', 'contacted', 'closed'].includes(st)) await db(c.env).update(leads).set({ status: st as 'new' }).where(eq(leads.id, parseInt(c.req.param('id')!, 10)));
  return c.redirect(c.req.header('referer') || '/admin/leads', 303);
});

/* ---------- ตั้งค่า ---------- */
const SETTING_KEYS = ['contact_phone', 'contact_line', 'contact_line_url', 'contact_email', 'company_name', 'company_address', 'dpo_contact', 'privacy_effective_date', 'data_retention'];
admin.get('/settings', need('settings'), (c) => page(c, 'ตั้งค่า', 'settings', <SettingsPage admin={c.get('admin')!} s={c.get('settings')} ok={c.req.query('ok') ? (c.req.query('msg') || 'บันทึกแล้ว') : undefined} after={c.req.query('after')} />));
admin.post('/settings', need('settings'), async (c) => {
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

/* ---------- ทีมผู้ดูแล + สิทธิ์ ---------- */
const PERM_KEYS = Object.keys(PERMS);
const readPerms = (f: Record<string, unknown>) => PERM_KEYS.filter((k) => f[`perm_${k}`] === '1');
admin.get('/users', need('staff'), async (c) => {
  const rows = await db(c.env).select().from(admins).orderBy(admins.id);
  return page(c, 'ทีมผู้ดูแล', 'users', <StaffPage admin={c.get('admin')!} staff={rows} ok={c.req.query('ok') || undefined} error={c.req.query('error') || undefined} />);
});
admin.post('/users', need('staff'), async (c) => {
  const me = c.get('admin')!;
  const f = await c.req.parseBody();
  const d = db(c.env);
  const back = (k: 'ok' | 'error', m: string) => c.redirect(`/admin/users?${k}=${encodeURIComponent(m)}`, 303);
  const action = String(f.action || '');
  if (action === 'create') {
    const username = String(f.username || '').trim().toLowerCase();
    const pw = String(f.password || '');
    if (!/^[a-z0-9._-]{3,30}$/.test(username) || pw.length < 10) return back('error', 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้องตามเงื่อนไข');
    let perms = readPerms(f);
    if (!me.isOwner) perms = perms.filter((p) => p !== 'staff'); // ให้สิทธิ์จัดการทีมได้เฉพาะเจ้าของระบบ
    const h = await hashPassword(pw);
    const r = await d.insert(admins).values({ username, passHash: h.hash, salt: h.salt, iterations: h.iterations, mustChange: 1, permissions: JSON.stringify(perms), displayName: String(f.display_name || '').trim().slice(0, 60) || null }).onConflictDoNothing().returning({ id: admins.id });
    return r.length ? back('ok', `เพิ่มผู้ดูแล ${username} แล้ว — แจ้งรหัสผ่านชั่วคราวทางช่องทางส่วนตัว`) : back('error', 'ชื่อผู้ใช้นี้มีอยู่แล้ว');
  }
  const id = clampInt(f.id, 1, 1e9);
  const target = id ? (await d.select().from(admins).where(eq(admins.id, id)).limit(1))[0] : undefined;
  if (!target) return back('error', 'ไม่พบผู้ดูแล');
  if (target.isOwner) return back('error', 'แก้ไขบัญชีเจ้าของระบบไม่ได้');
  if (target.id === me.adminId) return back('error', 'แก้ไขสิทธิ์ของตัวเองไม่ได้');
  if (action === 'perms') {
    let perms = readPerms(f);
    if (!me.isOwner) { // ผู้ช่วยที่มีสิทธิ์ staff ห้ามเพิ่ม/ถอนสิทธิ์ staff
      const had = (() => { try { return JSON.parse(target.permissions || '[]') as string[]; } catch { return []; } })();
      perms = perms.filter((p) => p !== 'staff'); if (had.includes('staff')) perms.push('staff');
    }
    await d.update(admins).set({ permissions: JSON.stringify(perms), displayName: String(f.display_name || '').trim().slice(0, 60) || null }).where(eq(admins.id, id!));
    return back('ok', `บันทึกสิทธิ์ของ ${target.username} แล้ว`);
  }
  if (action === 'reset') {
    const pw = String(f.password || '');
    if (pw.length < 10) return back('error', 'รหัสผ่านชั่วคราวอย่างน้อย 10 ตัวอักษร');
    const h = await hashPassword(pw);
    await d.update(admins).set({ passHash: h.hash, salt: h.salt, iterations: h.iterations, mustChange: 1 }).where(eq(admins.id, id!));
    return back('ok', `ตั้งรหัสชั่วคราวให้ ${target.username} แล้ว (ต้องเปลี่ยนเมื่อเข้าครั้งถัดไป)`);
  }
  if (action === 'delete') {
    await d.delete(admins).where(eq(admins.id, id!));
    return back('ok', `ลบผู้ดูแล ${target.username} แล้ว`);
  }
  return back('error', 'คำสั่งไม่ถูกต้อง');
});

/* ---------- สมาชิก ---------- */
admin.get('/members', need('members'), async (c) => {
  const q = (c.req.query('q') || '').trim().toLowerCase().slice(0, 80);
  const st = c.req.query('status') || '';
  const w: SQL[] = [];
  if (q) w.push(or(like(users.email, `%${q}%`), like(users.name, `%${q}%`), ...(normPhone(q).length >= 9 ? [eq(users.phone, normPhone(q))] : []))!);
  if (st === 'unverified') w.push(sql`${users.emailVerifiedAt} IS NULL`);
  if (st === 'suspended') w.push(eq(users.status, 'suspended'));
  const d = db(c.env);
  const rows = await d.select({ u: users, n: sql<number>`(SELECT count(*) FROM listings l WHERE l.user_id = ${users.id})` }).from(users).where(w.length ? and(...w) : undefined).orderBy(desc(users.id)).limit(300);
  const total = (await d.select({ n: count() }).from(users))[0].n;
  return page(c, 'สมาชิก', 'members', <MembersPage admin={c.get('admin')!} rows={rows.map((r) => ({ ...r.u, listingCount: r.n }))} q={q} status={st} total={total} ok={c.req.query('ok') || undefined} />);
});
admin.post('/members/:id{[0-9]+}', need('members'), async (c) => {
  const id = parseInt(c.req.param('id')!, 10);
  const f = await c.req.parseBody();
  const u = await getUser(c, id);
  if (!u) return c.redirect('/admin/members', 303);
  const d = db(c.env);
  let msg = 'บันทึกแล้ว';
  switch (String(f.action || '')) {
    case 'verify': await d.update(users).set({ emailVerifiedAt: nowSec() }).where(eq(users.id, id)); msg = `ยืนยันอีเมล ${u.email} แทนแล้ว`; break;
    case 'resend': await sendVerifyEmail(c, u); msg = `ส่งลิงก์ยืนยันไปที่ ${u.email} แล้ว (ดูได้ที่กล่องอีเมลขาออก)`; break;
    case 'suspend': await d.update(users).set({ status: 'suspended' }).where(eq(users.id, id)); msg = `ระงับบัญชี ${u.email} แล้ว`; break;
    case 'activate': await d.update(users).set({ status: 'active' }).where(eq(users.id, id)); msg = `เปิดใช้บัญชี ${u.email} แล้ว`; break;
  }
  return c.redirect(`/admin/members?ok=${encodeURIComponent(msg)}&q=${encodeURIComponent(String(f.q || ''))}`, 303);
});

/* ---------- กล่องอีเมลขาออก (ใช้ระหว่างยังไม่ได้ตั้งค่าบริการส่งอีเมล) ---------- */
admin.get('/outbox', need('members'), async (c) => {
  const rows = await db(c.env).select().from(outbox).orderBy(desc(outbox.id)).limit(200);
  return page(c, 'กล่องอีเมลขาออก', 'outbox', <OutboxPage rows={rows} configured={!!(c.env.RESEND_API_KEY && c.env.MAIL_FROM)} />);
});
