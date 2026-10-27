/** @jsxImportSource hono/jsx */
import { Hono, type Context } from 'hono';
import { and, count, desc, eq, inArray, isNull } from 'drizzle-orm';
import type { AppEnv } from '../env';
import { db } from '../db';
import { leads, listings, listingTokens, priceHistory, timeline, users } from '../db/schema';
import { render } from './public';
import { AccountPage, CheckEmailPage, ForgotPage, LoginPage, MessagePage, RegisterPage, ResetPage } from '../views/pages/account';
import { clientIp, hashPassword, rateLimit, sameOrigin, timingSafeEqual, verifyPassword, verifyTurnstile } from '../lib/security';
import { consumeToken, createUserSession, destroyUserSession, getUser, normEmail, refreshUserSession, sendResetEmail, sendVerifyEmail } from '../lib/users';
import { clampInt, formatPrice, isEmail, isThaiPhone, normPhone, nowSec, str } from '../lib/util';
import { addTimeline, getImages, imgUrl } from '../lib/listings';
import { PostPage } from '../views/pages/post';
import { geo } from '../lib/geo';

export const account = new Hono<AppEnv>();
const meta = (title: string) => ({ title, noindex: true, turnstile: true });
const safeNext = (n: unknown) => (typeof n === 'string' && /^\/[a-z0-9/_?=&-]*$/i.test(n) && !n.startsWith('//') ? n : '/account');

/* ---------- สมัครสมาชิก ---------- */
account.get('/register', (c) => (c.get('user') ? c.redirect('/account') : render(c, meta('สมัครสมาชิก'), <RegisterPage env={c.env} />)));
account.post('/register', async (c) => {
  const f = await c.req.parseBody();
  const v = { name: str(f.name, 80), email: normEmail(String(f.email || '')), phone: String(f.phone || '').slice(0, 15) };
  const fail = (error: string, status = 400) => render(c, meta('สมัครสมาชิก'), <RegisterPage env={c.env} error={error} v={v} />, status);
  if (!sameOrigin(c)) return fail('คำขอไม่ถูกต้อง');
  const ip = clientIp(c);
  if (!(await rateLimit(c.env, `reg:${ip}`, 5, 3600)).ok) return fail('สมัครบ่อยเกินไป กรุณาลองใหม่ภายหลัง', 429);
  if (!(await verifyTurnstile(c.env, String(f['cf-turnstile-response'] || ''), ip))) return fail('กรุณายืนยันว่าไม่ใช่บอท');
  const pw = String(f.password || '');
  const phone = normPhone(v.phone);
  if (v.name.length < 2) return fail('กรุณาระบุชื่อ');
  if (!isEmail(v.email)) return fail('อีเมลไม่ถูกต้อง');
  if (!isThaiPhone(phone)) return fail('เบอร์โทรไม่ถูกต้อง (เช่น 0812345678)');
  if (pw.length < 8) return fail('รหัสผ่านอย่างน้อย 8 ตัวอักษร');
  if (f.consent !== '1') return fail('กรุณายอมรับข้อกำหนดและนโยบายความเป็นส่วนตัว');
  const d = db(c.env);
  const exist = await d.select({ id: users.id }).from(users).where(eq(users.email, v.email)).limit(1);
  if (exist.length) return fail('อีเมลนี้สมัครแล้ว — เข้าสู่ระบบ หรือกด "ลืมรหัสผ่าน"');
  const h = await hashPassword(pw);
  const r = await d.insert(users).values({ email: v.email, passHash: h.hash, salt: h.salt, iterations: h.iterations, name: v.name, phone }).returning();
  const u = r[0];
  const status = await sendVerifyEmail(c, u);
  const s = await createUserSession(c, u);
  c.set('user', s);
  return render(c, meta('ยืนยันอีเมล'), <CheckEmailPage email={u.email} csrf={s.csrf} logged={status !== 'sent'} />);
});

/* ---------- ยืนยันอีเมล ---------- */
account.get('/verify', async (c) => {
  const uid = await consumeToken(c, String(c.req.query('token') || ''), 'verify');
  if (!uid) return render(c, meta('ยืนยันอีเมล'), <MessagePage title="ลิงก์ไม่ถูกต้องหรือหมดอายุ" text="ลิงก์ยืนยันใช้ได้ครั้งเดียวภายใน 48 ชั่วโมง เข้าสู่ระบบแล้วกด 'ส่งลิงก์ยืนยันอีกครั้ง'" action={{ href: '/account', label: 'ไปที่บัญชีของฉัน' }} />, 400);
  const d = db(c.env);
  await d.update(users).set({ emailVerifiedAt: nowSec() }).where(and(eq(users.id, uid)));
  const u = (await getUser(c, uid))!;
  const cur = c.get('user');
  if (cur?.userId === uid) await refreshUserSession(c, u);
  else c.set('user', await createUserSession(c, u));
  return render(c, meta('ยืนยันอีเมลแล้ว'), <MessagePage ok title="ยืนยันอีเมลเรียบร้อย" text="บัญชีของคุณพร้อมใช้งานแล้ว เริ่มลงประกาศได้เลย" action={{ href: '/post', label: '+ ลงประกาศฟรี' }} />);
});

/* ---------- เข้าสู่ระบบ / ออก ---------- */
account.get('/login', (c) => (c.get('user') ? c.redirect(safeNext(c.req.query('next'))) : render(c, meta('เข้าสู่ระบบ'), <LoginPage env={c.env} next={c.req.query('next')} ok={c.req.query('reset') ? 'ตั้งรหัสผ่านใหม่แล้ว เข้าสู่ระบบได้เลย' : undefined} />)));
account.post('/login', async (c) => {
  const f = await c.req.parseBody();
  const email = normEmail(String(f.email || ''));
  const next = safeNext(f.next);
  const fail = (error: string, status = 400) => render(c, meta('เข้าสู่ระบบ'), <LoginPage env={c.env} error={error} next={next} email={email} />, status);
  if (!sameOrigin(c)) return fail('คำขอไม่ถูกต้อง');
  const ip = clientIp(c);
  if (!(await rateLimit(c.env, `ulogin:${ip}`, 10, 900)).ok) return fail('พยายามเข้าสู่ระบบบ่อยเกินไป กรุณารอ 15 นาที', 429);
  if (!(await verifyTurnstile(c.env, String(f['cf-turnstile-response'] || ''), ip))) return fail('กรุณายืนยันว่าไม่ใช่บอท');
  const r = await db(c.env).select().from(users).where(eq(users.email, email)).limit(1);
  const u = r[0];
  const ok = u ? await verifyPassword(String(f.password || ''), u.passHash, u.salt, u.iterations) : (await hashPassword(String(f.password || '')), false);
  if (!u || !ok) return fail('อีเมลหรือรหัสผ่านไม่ถูกต้อง', 401);
  if (u.status === 'suspended') return fail('บัญชีนี้ถูกระงับ กรุณาติดต่อทีมงาน', 403);
  await db(c.env).update(users).set({ lastLoginAt: nowSec() }).where(eq(users.id, u.id));
  await createUserSession(c, u);
  return c.redirect(u.emailVerifiedAt ? next : '/account', 303);
});
account.post('/logout', async (c) => {
  await destroyUserSession(c);
  return c.redirect('/', 303);
});

/* ---------- ลืมรหัสผ่าน ---------- */
account.get('/forgot', (c) => render(c, meta('ลืมรหัสผ่าน'), <ForgotPage env={c.env} />));
account.post('/forgot', async (c) => {
  const f = await c.req.parseBody();
  const ip = clientIp(c);
  if (!sameOrigin(c)) return render(c, meta('ลืมรหัสผ่าน'), <ForgotPage env={c.env} error="คำขอไม่ถูกต้อง" />, 400);
  if (!(await rateLimit(c.env, `forgot:${ip}`, 5, 3600)).ok) return render(c, meta('ลืมรหัสผ่าน'), <ForgotPage env={c.env} error="ขอบ่อยเกินไป กรุณาลองใหม่ภายหลัง" />, 429);
  if (!(await verifyTurnstile(c.env, String(f['cf-turnstile-response'] || ''), ip))) return render(c, meta('ลืมรหัสผ่าน'), <ForgotPage env={c.env} error="กรุณายืนยันว่าไม่ใช่บอท" />, 400);
  const r = await db(c.env).select().from(users).where(eq(users.email, normEmail(String(f.email || '')))).limit(1);
  if (r[0] && r[0].status === 'active') await sendResetEmail(c, r[0]);
  return render(c, meta('ลืมรหัสผ่าน'), <ForgotPage env={c.env} sent />); // ตอบเหมือนกันเสมอ ไม่บอกว่ามีอีเมลนี้หรือไม่
});
account.get('/reset', (c) => render(c, meta('ตั้งรหัสผ่านใหม่'), <ResetPage token={String(c.req.query('token') || '')} />));
account.post('/reset', async (c) => {
  const f = await c.req.parseBody();
  const token = String(f.token || '');
  const pw = String(f.password || ''), pw2 = String(f.password2 || '');
  const fail = (e: string) => render(c, meta('ตั้งรหัสผ่านใหม่'), <ResetPage token={token} error={e} />, 400);
  if (!sameOrigin(c)) return fail('คำขอไม่ถูกต้อง');
  if (pw.length < 8) return fail('รหัสผ่านอย่างน้อย 8 ตัวอักษร');
  if (pw !== pw2) return fail('รหัสผ่านทั้งสองช่องไม่ตรงกัน');
  const uid = await consumeToken(c, token, 'reset');
  if (!uid) return render(c, meta('ตั้งรหัสผ่านใหม่'), <MessagePage title="ลิงก์หมดอายุ" text="ลิงก์ตั้งรหัสผ่านใช้ได้ครั้งเดียวภายใน 1 ชั่วโมง กรุณาขอลิงก์ใหม่" action={{ href: '/forgot', label: 'ขอลิงก์ใหม่' }} />, 400);
  const h = await hashPassword(pw);
  // ตั้งรหัสใหม่ผ่านอีเมลได้ = พิสูจน์ว่าเป็นเจ้าของอีเมล → ถือว่ายืนยันอีเมลแล้วด้วย
  await db(c.env).update(users).set({ passHash: h.hash, salt: h.salt, iterations: h.iterations, emailVerifiedAt: nowSec() }).where(eq(users.id, uid));
  return c.redirect('/login?reset=1', 303);
});

/* ---------- ต้องล็อกอินสำหรับ /account/* ---------- */
account.use('/account/*', async (c, next) => {
  const s = c.get('user');
  if (!s) return c.redirect('/login?next=/account', 303);
  if (c.req.method === 'POST') {
    if (!sameOrigin(c)) return c.text('Bad origin', 403);
    const f = await c.req.parseBody();
    if (!timingSafeEqual(String(f.csrf || ''), s.csrf)) return c.text('Bad CSRF token', 403);
  }
  await next();
});
account.get('/account', async (c) => {
  const s = c.get('user');
  if (!s) return c.redirect('/login?next=/account', 303);
  const u = await getUser(c, s.userId);
  if (!u) { await destroyUserSession(c); return c.redirect('/login', 303); }
  if (!!u.emailVerifiedAt !== s.verified || u.name !== s.name) await refreshUserSession(c, u);
  const d = db(c.env);
  const rows = await d.select().from(listings).where(and(eq(listings.userId, u.id), isNull(listings.deletedAt))).orderBy(desc(listings.id)).limit(200);
  const ids = rows.map((r) => r.id);
  const [lc, ls] = ids.length ? await Promise.all([
    d.select({ id: leads.listingId, n: count() }).from(leads).where(inArray(leads.listingId, ids)).groupBy(leads.listingId),
    d.select({ lead: leads, ref: listings.ref }).from(leads).leftJoin(listings, eq(leads.listingId, listings.id)).where(inArray(leads.listingId, ids)).orderBy(desc(leads.id)).limit(300),
  ]) : [[], []];
  const lm = new Map(lc.map((x) => [x.id, x.n]));
  const g = await geo(c.env); const pm = new Map(g.provinces.map((p) => [p.code, p.nameTh]));
  const tab = ['leads', 'profile'].includes(c.req.query('tab') || '') ? c.req.query('tab')! : 'listings';
  const status = ['active', 'pending', 'rejected', 'sold', 'expired', 'closed'].includes(c.req.query('status') || '') ? c.req.query('status')! : '';
  return render(c, { title: 'บัญชีของฉัน', noindex: true, nav: 'account' }, (
    <AccountPage env={c.env} user={u} sess={c.get('user')!} tab={tab} status={status} msg={c.req.query('ok') || undefined} error={c.req.query('error') || undefined}
      rows={rows.map((r) => ({ ...r, leadCount: lm.get(r.id) || 0, provinceName: pm.get(r.provinceCode) }))}
      leads={ls.map((x) => ({ ...x.lead, listingRef: x.ref }))} />
  ));
});
account.post('/account/resend-verify', async (c) => {
  const s = c.get('user')!;
  const u = await getUser(c, s.userId);
  if (!u) return c.redirect('/login', 303);
  if (u.emailVerifiedAt) return c.redirect('/account?ok=' + encodeURIComponent('ยืนยันอีเมลแล้ว'), 303);
  if (!(await rateLimit(c.env, `resend:${u.id}`, 3, 3600)).ok) return c.redirect('/account?error=' + encodeURIComponent('ขอส่งบ่อยเกินไป กรุณารอสักครู่'), 303);
  const st = await sendVerifyEmail(c, u);
  return render(c, meta('ยืนยันอีเมล'), <CheckEmailPage email={u.email} csrf={s.csrf} resent logged={st !== 'sent'} />);
});
account.post('/account/profile', async (c) => {
  const s = c.get('user')!;
  const f = await c.req.parseBody();
  const name = str(f.name, 80), phone = normPhone(String(f.phone || ''));
  if (name.length < 2 || !isThaiPhone(phone)) return c.redirect('/account?tab=profile&error=' + encodeURIComponent('ชื่อหรือเบอร์โทรไม่ถูกต้อง'), 303);
  await db(c.env).update(users).set({ name, phone, line: str(f.line, 60) || null }).where(eq(users.id, s.userId));
  const u = await getUser(c, s.userId); if (u) await refreshUserSession(c, u);
  return c.redirect('/account?tab=profile&ok=' + encodeURIComponent('บันทึกข้อมูลแล้ว'), 303);
});
account.post('/account/password', async (c) => {
  const s = c.get('user')!;
  const f = await c.req.parseBody();
  const u = await getUser(c, s.userId);
  const back = (k: 'ok' | 'error', m: string) => c.redirect(`/account?tab=profile&${k}=${encodeURIComponent(m)}`, 303);
  if (!u || !(await verifyPassword(String(f.current || ''), u.passHash, u.salt, u.iterations))) return back('error', 'รหัสผ่านปัจจุบันไม่ถูกต้อง');
  const n1 = String(f.next || ''), n2 = String(f.next2 || '');
  if (n1.length < 8) return back('error', 'รหัสผ่านใหม่อย่างน้อย 8 ตัวอักษร');
  if (n1 !== n2) return back('error', 'รหัสผ่านใหม่ทั้งสองช่องไม่ตรงกัน');
  const h = await hashPassword(n1);
  await db(c.env).update(users).set({ passHash: h.hash, salt: h.salt, iterations: h.iterations }).where(eq(users.id, u.id));
  return back('ok', 'เปลี่ยนรหัสผ่านแล้ว');
});

/* ---------- จัดการประกาศของตัวเอง ---------- */
/* ---------- แก้ไขประกาศแล้วส่งตรวจอีกครั้ง ---------- */
account.get('/account/listings/:id{[0-9]+}/edit', async (c) => {
  const s = c.get('user');
  const id = parseInt(c.req.param('id')!, 10);
  if (!s) return c.redirect('/login?next=' + encodeURIComponent(`/account/listings/${id}/edit`), 303);
  const me = await getUser(c, s.userId);
  if (!me) return c.redirect('/login', 303);
  const l = (await db(c.env).select().from(listings).where(and(eq(listings.id, id), eq(listings.userId, me.id), isNull(listings.deletedAt))).limit(1))[0];
  if (!l) return c.redirect('/account?error=' + encodeURIComponent('ไม่พบประกาศ'), 303);
  if (!['pending', 'rejected'].includes(l.status)) return c.redirect('/account?error=' + encodeURIComponent(`ประกาศ ${l.ref} อยู่ในสถานะที่แก้ไขทั้งหมดไม่ได้ (ปรับราคาได้จากตาราง)`), 303);
  const [g, imgs] = await Promise.all([geo(c.env), getImages(c.env, id)]);
  const images = imgs.map((im) => ({ idx: im.idx, url: imgUrl(c.env, `${im.keyBase}:${im.ext}`, 400) || '' }));
  return render(c, { title: `แก้ไขประกาศ ${l.ref}`, noindex: true, maps: true, turnstile: true, page: 'post', nav: 'account' },
    <PostPage env={c.env} provinces={g.provinces} consign={!!l.consign} edit={{ l, images }}
      me={{ name: l.ownerName, phone: l.ownerPhone, line: l.ownerLine, email: me.email }} />);
});

account.post('/account/listings/:id{[0-9]+}', async (c: Context<AppEnv>) => {
  const s = c.get('user')!;
  const id = parseInt(c.req.param('id')!, 10);
  const d = db(c.env);
  const r = await d.select().from(listings).where(and(eq(listings.id, id), eq(listings.userId, s.userId), isNull(listings.deletedAt))).limit(1);
  const l = r[0];
  if (!l) return c.redirect('/account?error=' + encodeURIComponent('ไม่พบประกาศ'), 303);
  const f = await c.req.parseBody();
  const now = nowSec(), ttl = parseInt(c.env.LISTING_TTL_DAYS || '180', 10) * 86400;
  let msg = 'บันทึกแล้ว';
  switch (String(f.action || '')) {
    case 'price': {
      const price = clampInt(f.price, 1, 10_000_000_000);
      if (price && price !== l.price && ['active', 'pending'].includes(l.status)) {
        await d.batch([
          d.update(listings).set({ price, updatedAt: now }).where(eq(listings.id, id)),
          d.insert(priceHistory).values({ listingId: id, price }),
          d.insert(timeline).values({ listingId: id, event: 'price', actor: 'owner', note: `฿${formatPrice(l.price)} → ฿${formatPrice(price)}` }),
        ]);
        msg = `ปรับราคา ${l.ref} เป็น ฿${formatPrice(price)} แล้ว`;
      }
      break;
    }
    case 'sold': if (l.status === 'active') { await d.update(listings).set({ status: 'sold', updatedAt: now }).where(eq(listings.id, id)); await addTimeline(c.env, id, 'sold', 'owner'); msg = `${l.ref} ปิดการขาย/เช่าแล้ว`; } break;
    case 'close': if (!['closed', 'sold'].includes(l.status)) { await d.update(listings).set({ status: 'closed', updatedAt: now }).where(eq(listings.id, id)); await addTimeline(c.env, id, 'closed', 'owner'); msg = `ปิดประกาศ ${l.ref} แล้ว`; } break;
    case 'delete': {
      await d.batch([
        d.update(listings).set({ deletedAt: now, status: ['sold', 'closed'].includes(l.status) ? l.status : 'closed', zone: null, featured: 0, updatedAt: now }).where(eq(listings.id, id)),
        d.insert(timeline).values({ listingId: id, event: 'deleted', actor: 'owner', note: `สถานะก่อนลบ: ${l.status}` }),
        d.delete(listingTokens).where(eq(listingTokens.listingId, id)),
      ]);
      msg = `ลบประกาศ ${l.ref} แล้ว`;
      break;
    }
    case 'renew': if (['active', 'expired'].includes(l.status)) { await d.update(listings).set({ status: 'active', expiresAt: now + ttl, updatedAt: now }).where(eq(listings.id, id)); await addTimeline(c.env, id, 'renewed', 'owner'); msg = `ต่ออายุ ${l.ref} อีก ${c.env.LISTING_TTL_DAYS || 180} วันแล้ว`; } break;
  }
  if (l.status === 'active') c.executionCtx.waitUntil(c.env.JOBS.send({ kind: 'sitemap', provinceCode: l.provinceCode }).catch(() => undefined));
  return c.redirect('/account?ok=' + encodeURIComponent(msg), 303);
});
