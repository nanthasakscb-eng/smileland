import { Hono, type Context } from 'hono';
import { and, eq, gte } from 'drizzle-orm';
import type { AppEnv } from '../env';
import { db } from '../db';
import { leads, listingImages, listings, priceHistory, timeline } from '../db/schema';
import { districtsOf, geo, subdistrictsOf } from '../lib/geo';
import { search } from '../lib/listings';
import { getUser } from '../lib/users';
import { clientIp, randomToken, rateLimit, sameOrigin, sha256Hex, verifyTurnstile } from '../lib/security';
import { FEATURES, DEED_TYPES, ZONING, clampInt, clampNum, isEmail, isThaiPhone, newRef, normPhone, nowSec, str, toSqw } from '../lib/util';

export const api = new Hono<AppEnv>();

api.use('*', async (c, next) => {
  c.header('Cache-Control', 'no-store');
  if (c.req.method !== 'GET' && !sameOrigin(c)) return c.json({ ok: false, error: 'คำขอไม่ถูกต้อง (origin)' }, 403);
  await next();
});

/* ---------- ภูมิศาสตร์ ---------- */
api.get('/geo/provinces', async (c) => {
  const g = await geo(c.env);
  c.header('Cache-Control', 'public, max-age=86400');
  return c.json(g.provinces.map((p) => ({ code: p.code, name: p.nameTh, slug: p.slug })));
});
api.get('/geo/districts', async (c) => {
  const code = clampInt(c.req.query('province'), 1, 999);
  if (!code) return c.json([]);
  c.header('Cache-Control', 'public, max-age=86400');
  return c.json((await districtsOf(c.env, code)).map((d) => ({ code: d.code, name: d.nameTh, slug: d.slug })));
});
api.get('/geo/subdistricts', async (c) => {
  const code = clampInt(c.req.query('district'), 1, 9999);
  if (!code) return c.json([]);
  c.header('Cache-Control', 'public, max-age=86400');
  return c.json((await subdistrictsOf(c.env, code)).map((s) => ({ code: s.code, name: s.nameTh, postal: s.postalCode })));
});

/* ---------- อ่านพิกัดจากลิงก์ย่อ Google Maps (maps.app.goo.gl) ----------
   browser อ่าน redirect ข้ามโดเมนเองไม่ได้ จึงให้ server ตามลิงก์ให้ — อนุญาตเฉพาะโดเมน Google Maps (กัน SSRF) */
const GMAP_HOST = /^(maps\.app\.goo\.gl|goo\.gl|maps\.google\.[a-z.]+|www\.google\.[a-z.]+|google\.[a-z.]+)$/i;
function latLngFrom(text: string): [number, number] | null {
  const t = decodeURIComponent(text);
  for (const re of [/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/, /@(-?\d+\.\d+),(-?\d+\.\d+)/, /[?&](?:q|query|ll|center|destination)=(-?\d+\.\d+),\s*(-?\d+\.\d+)/]) {
    const m = t.match(re);
    if (m) return [parseFloat(m[1]), parseFloat(m[2])];
  }
  return null;
}
api.get('/geo/resolve', async (c) => {
  const rl = await rateLimit(c.env, `gres:${clientIp(c)}`, 30, 3600);
  if (!rl.ok) return c.json({ ok: false }, 429);
  let url = String(c.req.query('url') || '').slice(0, 2000);
  for (let hop = 0; hop < 4; hop++) {
    let u: URL;
    try { u = new URL(url); } catch { return c.json({ ok: false }); }
    if (u.protocol !== 'https:' || !GMAP_HOST.test(u.hostname)) return c.json({ ok: false });
    const ll = latLngFrom(u.href);
    if (ll) return c.json({ ok: true, lat: ll[0], lng: ll[1] });
    const r = await fetch(u.href, { redirect: 'manual', headers: { 'User-Agent': 'Mozilla/5.0 SMILELAND' } });
    const loc = r.headers.get('location');
    if (!loc) {
      if (r.status === 200) { const m = latLngFrom((await r.text()).slice(0, 200000)); if (m) return c.json({ ok: true, lat: m[0], lng: m[1] }); }
      return c.json({ ok: false });
    }
    url = new URL(loc, u).href;
  }
  return c.json({ ok: false });
});

/* ---------- ค้นหา (JSON) ---------- */
api.get('/listings', async (c) => {
  const q = c.req.query();
  const r = await search(c.env, {
    deal: q.deal === 'rent' ? 'rent' : q.deal === 'sale' ? 'sale' : undefined,
    type: (['house', 'land', 'condo'] as const).find((t) => t === q.type),
    province: clampInt(q.province, 1, 999) || undefined, district: clampInt(q.district, 1, 9999) || undefined,
    min: clampInt(q.min, 0, 1e10) || undefined, max: clampInt(q.max, 0, 1e10) || undefined, q: q.q?.slice(0, 120),
    page: clampInt(q.page, 1, 500) || 1, per: clampInt(q.per, 1, 60) || 24,
  });
  c.header('Cache-Control', 'public, max-age=60');
  return c.json({
    total: r.total, page: r.page, pages: r.pages,
    items: r.items.map((x) => ({ id: x.id, ref: x.ref, deal: x.deal, type: x.type, title: x.title, price: x.price, lat: x.lat, lng: x.lng, province: x.provinceName, district: x.districtName, url: `/listing/${x.id}` })),
  });
});

/* ---------- ลงประกาศ ---------- */
const MAX_IMAGES = 12;
const MAX_FILE = 4 * 1024 * 1024;
const SIZES = [400, 800, 1600] as const;

function sniff(buf: Uint8Array): 'webp' | 'jpg' | null {
  if (buf.length > 12 && buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 && buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50) return 'webp';
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  return null;
}

type ListingUp = { idx: number; ext: 'webp' | 'jpg'; files: Record<number, ArrayBuffer>; w: number | null; h: number | null };
/** ตรวจและแปลงฟอร์มประกาศ (ใช้ทั้งลงประกาศใหม่และแก้ไขแล้วส่งใหม่) */
async function parseListingForm(c: Context<AppEnv>, form: FormData, me: { email: string }, ip: string) {
  const g = (k: string) => form.get(k);
  const errors: Record<string, string> = {};

  if (!(await verifyTurnstile(c.env, String(g('cf-turnstile-response') || ''), ip))) return { fatal: 'กรุณายืนยันว่าไม่ใช่บอท (Turnstile)' as string };
  if (g('consent') !== '1') errors.consent = 'กรุณายืนยันข้อกำหนดและนโยบายความเป็นส่วนตัว';

  const deal: 'sale' | 'rent' | null = g('deal') === 'rent' ? 'rent' : g('deal') === 'sale' ? 'sale' : null;
  const type = (['house', 'land', 'condo'] as const).find((t) => t === g('type')) ?? null;
  if (!deal) errors.deal = 'เลือกขายหรือให้เช่า';
  if (!type) errors.type = 'เลือกประเภททรัพย์';
  const posterRole: 'agent' | 'owner' = g('posterRole') === 'agent' ? 'agent' : 'owner';
  const title = str(g('title'), 120);
  const description = str(g('description'), 5000);
  const price = clampInt(g('price'), 1, 10_000_000_000);
  if (title.length < 10) errors.title = 'หัวข้อประกาศอย่างน้อย 10 ตัวอักษร';
  if (description.length < 30) errors.description = 'รายละเอียดอย่างน้อย 30 ตัวอักษร';
  if (/https?:\/\/|www\./i.test(description) || /0[689]\d[-\s]?\d{3}[-\s]?\d{4}/.test(description.replace(/\s+/g, ' '))) errors.description = 'ห้ามใส่เบอร์โทรหรือลิงก์ในรายละเอียด (ใส่ในช่องข้อมูลติดต่อแทน)';
  if (!price) errors.price = 'ระบุราคา';

  const provinceCode = clampInt(g('provinceCode'), 1, 999);
  const districtCode = clampInt(g('districtCode'), 1, 9999);
  const subdistrictCode = clampInt(g('subdistrictCode'), 1, 999999);
  const geoData = await geo(c.env);
  const prov = geoData.provinces.find((p) => p.code === provinceCode);
  const dist = geoData.districts.find((d) => d.code === districtCode && d.provinceCode === provinceCode);
  if (!prov) errors.provinceCode = 'ให้บริการเฉพาะ 20 จังหวัดในภาคอีสาน';
  if (!dist) errors.districtCode = 'เลือกอำเภอ/เขต';
  if (subdistrictCode && Math.floor(subdistrictCode / 100) !== districtCode) errors.subdistrictCode = 'ตำบลไม่ตรงกับอำเภอ';

  let lat = clampNum(g('lat'), -90, 90);
  let lng = clampNum(g('lng'), -180, 180);
  if (lat == null || lng == null || lat < 5 || lat > 21 || lng < 97 || lng > 106) { lat = null; lng = null; } // นอกประเทศไทย = ไม่บันทึก

  const ownerName = str(g('ownerName'), 80);
  const ownerPhone = normPhone(String(g('ownerPhone') || ''));
  const ownerEmail = me.email;
  if (ownerName.length < 2) errors.ownerName = 'ระบุชื่อผู้ลงประกาศ';
  if (!isThaiPhone(ownerPhone)) errors.ownerPhone = 'เบอร์โทรไม่ถูกต้อง (เช่น 0812345678)';
  if (ownerEmail && !isEmail(ownerEmail)) errors.ownerEmail = 'อีเมลไม่ถูกต้อง';

  const landRai = type !== 'condo' ? clampNum(g('landRai'), 0, 100000) : null;
  const landNgan = type !== 'condo' ? clampNum(g('landNgan'), 0, 3.99) : null;
  const landWah = type !== 'condo' ? clampNum(g('landWah'), 0, 99.99) : null;
  const landSqw = toSqw(landRai, landNgan, landWah);
  if (type === 'land' && !landSqw) errors.landRai = 'ระบุขนาดที่ดิน';
  const usableSqm = type !== 'land' ? clampNum(g('usableSqm'), 1, 100000) : null;
  if (type === 'condo' && !usableSqm) errors.usableSqm = 'ระบุขนาดห้อง (ตร.ม.)';

  const features = form.getAll('features').map(String).filter((f) => f in FEATURES).slice(0, 20);
  const deedType = str(g('deedType'), 20);
  const zoningColor = str(g('zoningColor'), 20);

  // รูปภาพ
  const ups: ListingUp[] = [];
  let totalBytes = 0;
  for (let i = 0; i < MAX_IMAGES; i++) {
    const files: Record<number, ArrayBuffer> = {};
    let ext: 'webp' | 'jpg' | null = null;
    for (const s of SIZES) {
      const f = form.get(`img_${i}_${s}`);
      if (!f || typeof f === 'string') continue;
      if (f.size > MAX_FILE) { errors.images = 'ไฟล์รูปใหญ่เกินไป'; continue; }
      const buf = await f.arrayBuffer();
      const kind = sniff(new Uint8Array(buf, 0, Math.min(16, buf.byteLength)));
      if (!kind) { errors.images = 'รองรับเฉพาะรูป JPG/WebP ที่ระบบย่อแล้ว'; continue; }
      ext = ext ?? kind;
      files[s] = buf;
      totalBytes += buf.byteLength;
    }
    if (Object.keys(files).length) {
      if (!files[800]) files[800] = files[1600] ?? files[400];
      if (!files[400]) files[400] = files[800];
      if (!files[1600]) files[1600] = files[800];
      ups.push({ idx: ups.length, ext: ext!, files, w: clampInt(g(`img_${i}_w`), 1, 10000), h: clampInt(g(`img_${i}_h`), 1, 10000) });
    }
  }
  if (totalBytes > 40 * 1024 * 1024) errors.images = 'ขนาดรูปรวมเกิน 40MB';

  const vals = {
    deal: deal!, type: type!, title, description, price: price!,
    provinceCode: provinceCode!, districtCode: districtCode!, subdistrictCode: subdistrictCode ?? null,
    addressNote: str(g('addressNote'), 160) || null, lat, lng,
    landRai, landNgan, landWah, landSqw,
    deedType: deedType in DEED_TYPES ? deedType : null, frontageM: type === 'land' ? clampNum(g('frontageM'), 0, 100000) : null,
    zoningColor: zoningColor in ZONING ? zoningColor : null,
    usableSqm, bedrooms: type !== 'land' ? clampInt(g('bedrooms'), 0, 50) : null, bathrooms: type !== 'land' ? clampInt(g('bathrooms'), 0, 50) : null,
    floors: type === 'house' ? clampInt(g('floors'), 1, 20) : null, parking: type !== 'land' ? clampInt(g('parking'), 0, 50) : null,
    projectName: type === 'condo' ? str(g('projectName'), 120) || null : null, floorNo: type === 'condo' ? clampInt(g('floorNo'), 1, 200) : null,
    commonFee: type === 'condo' ? clampInt(g('commonFee'), 0, 1_000_000) : null,
    depositMonths: deal === 'rent' ? clampInt(g('depositMonths'), 0, 24) : null, minContractMonths: deal === 'rent' ? clampInt(g('minContractMonths'), 1, 120) : null,
    furnished: deal === 'rent' && g('furnished') !== '' && g('furnished') != null ? (g('furnished') === '1' ? 1 : 0) : null,
    features: JSON.stringify(features), posterRole, ownerName, ownerPhone, ownerLine: str(g('ownerLine'), 60) || null, ownerEmail: ownerEmail || null,
    deedNo: type !== 'condo' ? str(g('deedNo'), 40) || null : null, consign: g('consign') === '1' ? 1 : 0,
  };
  return { errors, vals, ups };
}

api.post('/listings', async (c) => {
  const ip = clientIp(c);
  const sess = c.get('user');
  if (!sess) return c.json({ ok: false, error: 'กรุณาเข้าสู่ระบบก่อนลงประกาศ', login: true }, 401);
  const me = await getUser(c, sess.userId);
  if (!me || me.status !== 'active') return c.json({ ok: false, error: 'บัญชีนี้ไม่สามารถลงประกาศได้ กรุณาติดต่อทีมงาน' }, 403);
  if (!me.emailVerifiedAt) return c.json({ ok: false, error: 'กรุณายืนยันอีเมลก่อนลงประกาศ (ดูลิงก์ในอีเมล หรือกดส่งอีกครั้งที่บัญชีของฉัน)' }, 403);
  if (!(await rateLimit(c.env, `postu:${me.id}`, 20, 86400)).ok) return c.json({ ok: false, error: 'ลงประกาศครบจำนวนต่อวันแล้ว กรุณาลองใหม่พรุ่งนี้' }, 429);
  const rl = await rateLimit(c.env, `post:${ip}`, 6, 3600);
  if (!rl.ok) return c.json({ ok: false, error: 'ส่งประกาศบ่อยเกินไป กรุณาลองใหม่ภายหลัง' }, 429);

  let form: FormData;
  try { form = await c.req.formData(); } catch { return c.json({ ok: false, error: 'ข้อมูลไม่ถูกต้อง' }, 400); }
  const pr = await parseListingForm(c, form, me, ip);
  if ('fatal' in pr) return c.json({ ok: false, error: pr.fatal }, 400);
  const { errors, vals, ups } = pr;
  const { title, ownerPhone, price } = vals;
  if (Object.keys(errors).length) return c.json({ ok: false, error: 'กรุณาตรวจสอบข้อมูลที่กรอก', errors }, 422);

  const d = db(c.env);
  // กันส่งซ้ำ: เบอร์ + หัวข้อเดิมภายใน 24 ชม.
  const dup = await d.select({ id: listings.id }).from(listings)
    .where(and(eq(listings.ownerPhone, ownerPhone), eq(listings.title, title), gte(listings.createdAt, nowSec() - 86400))).limit(1);
  if (dup.length) return c.json({ ok: false, error: 'คุณส่งประกาศนี้ไปแล้ว กำลังรอการตรวจสอบ' }, 409);

  const token = randomToken(32);
  const ref = newRef();
  const inserted = await d.insert(listings).values({
    ...vals, ref, status: 'pending', manageTokenHash: await sha256Hex(token), userId: me.id,
  }).returning({ id: listings.id });
  const id = inserted[0].id;

  // อัปโหลดรูปขึ้น R2 (ทุกขนาดย่อไว้ล่วงหน้าแล้วจาก browser → ไม่มีค่า transformation)
  const imgRows: (typeof listingImages.$inferInsert)[] = [];
  try {
    await Promise.all(ups.flatMap((u) => SIZES.map((s) => c.env.UPLOADS.put(`listings/${id}/${u.idx}-${s}.${u.ext}`, u.files[s], {
      httpMetadata: { contentType: u.ext === 'webp' ? 'image/webp' : 'image/jpeg', cacheControl: 'public, max-age=31536000, immutable' },
    }))));
    for (const u of ups) imgRows.push({ listingId: id, idx: u.idx, keyBase: `listings/${id}/${u.idx}`, ext: u.ext, width: u.w, height: u.h });
  } catch (e) {
    console.error('r2 upload failed', e);
  }
  const stmts = [
    d.insert(priceHistory).values({ listingId: id, price: price! }),
    d.insert(timeline).values({ listingId: id, event: 'submitted', actor: 'owner' }),
    d.update(listings).set({ imageCount: imgRows.length, coverKey: imgRows[0] ? `${imgRows[0].keyBase}:${imgRows[0].ext}` : null }).where(eq(listings.id, id)),
  ];
  if (imgRows.length) stmts.push(d.insert(listingImages).values(imgRows) as never);
  await d.batch(stmts as never);

  return c.json({ ok: true, ref, manageUrl: `${new URL(c.req.url).origin}/manage/${token}` });
});

/* ---------- ผู้โพสต์แก้ไขประกาศ แล้วส่งตรวจอีกครั้ง ---------- */
export const EDITABLE = ['pending', 'rejected'] as const;
api.post('/listings/:id{[0-9]+}', async (c) => {
  const ip = clientIp(c);
  const sess = c.get('user');
  if (!sess) return c.json({ ok: false, error: 'กรุณาเข้าสู่ระบบ', login: true }, 401);
  const me = await getUser(c, sess.userId);
  if (!me || me.status !== 'active') return c.json({ ok: false, error: 'บัญชีนี้ไม่สามารถแก้ไขประกาศได้ กรุณาติดต่อทีมงาน' }, 403);
  const id = parseInt(c.req.param('id'), 10);
  const d = db(c.env);
  const l = (await d.select().from(listings).where(and(eq(listings.id, id), eq(listings.userId, me.id))).limit(1))[0];
  if (!l || l.deletedAt) return c.json({ ok: false, error: 'ไม่พบประกาศ' }, 404);
  if (!(EDITABLE as readonly string[]).includes(l.status)) return c.json({ ok: false, error: 'ประกาศนี้แก้ไขทั้งหมดไม่ได้ในสถานะปัจจุบัน (ปรับราคาได้ที่บัญชีของฉัน)' }, 409);
  if (!(await rateLimit(c.env, `editu:${me.id}`, 30, 86400)).ok) return c.json({ ok: false, error: 'แก้ไขบ่อยเกินไป กรุณาลองใหม่พรุ่งนี้' }, 429);

  let form: FormData;
  try { form = await c.req.formData(); } catch { return c.json({ ok: false, error: 'ข้อมูลไม่ถูกต้อง' }, 400); }
  const pr = await parseListingForm(c, form, me, ip);
  if ('fatal' in pr) return c.json({ ok: false, error: pr.fatal }, 400);
  const { errors, vals, ups } = pr;

  // ลำดับรูปสุดท้าย: k:<idx เดิม> = เก็บรูปเดิม, n:<ลำดับรูปใหม่>
  const old = await d.select().from(listingImages).where(eq(listingImages.listingId, id));
  const oldBy = new Map(old.map((im) => [im.idx, im]));
  const newBy = new Map(ups.map((u) => [u.idx, u]));
  const order = form.getAll('order').map(String).slice(0, MAX_IMAGES * 2);
  const plan: ({ kind: 'k'; im: (typeof old)[number] } | { kind: 'n'; up: ListingUp })[] = [];
  const usedOld = new Set<number>();
  for (const o of order) {
    const [k, v] = o.split(':'); const n = parseInt(v, 10);
    if (k === 'k' && oldBy.has(n) && !usedOld.has(n)) { plan.push({ kind: 'k', im: oldBy.get(n)! }); usedOld.add(n); }
    else if (k === 'n' && newBy.has(n)) { plan.push({ kind: 'n', up: newBy.get(n)! }); newBy.delete(n); }
  }
  if (plan.length > MAX_IMAGES) errors.images = `รูปภาพสูงสุด ${MAX_IMAGES} รูป`;
  if (Object.keys(errors).length) return c.json({ ok: false, error: 'กรุณาตรวจสอบข้อมูลที่กรอก', errors }, 422);

  const rev = l.status === 'rejected' ? l.revision + 1 : l.revision;
  const stamp = String(Math.floor(Date.now() / 1000)); // ชื่อไฟล์ต้องเป็นตัวเลขล้วน (เส้นทาง /img ตรวจรูปแบบ)
  const rows: (typeof listingImages.$inferInsert)[] = [];
  try {
    await Promise.all(plan.flatMap((p, i) => p.kind === 'n' ? SIZES.map((sz) => c.env.UPLOADS.put(`listings/${id}/${stamp}${String(i).padStart(2, '0')}-${sz}.${p.up.ext}`, p.up.files[sz], {
      httpMetadata: { contentType: p.up.ext === 'webp' ? 'image/webp' : 'image/jpeg', cacheControl: 'public, max-age=31536000, immutable' },
    })) : []));
  } catch (e) {
    console.error('r2 upload failed', e);
    return c.json({ ok: false, error: 'อัปโหลดรูปไม่สำเร็จ กรุณาลองใหม่' }, 502);
  }
  plan.forEach((p, i) => rows.push(p.kind === 'k'
    ? { listingId: id, idx: i, keyBase: p.im.keyBase, ext: p.im.ext, width: p.im.width, height: p.im.height }
    : { listingId: id, idx: i, keyBase: `listings/${id}/${stamp}${String(i).padStart(2, '0')}`, ext: p.up.ext, width: p.up.w, height: p.up.h }));
  const removed = old.filter((im) => !usedOld.has(im.idx));

  const now = nowSec();
  const stmts: unknown[] = [
    d.update(listings).set({
      ...vals, status: 'pending', rejectReason: null, revision: rev, updatedAt: now,
      imageCount: rows.length, coverKey: rows[0] ? `${rows[0].keyBase}:${rows[0].ext}` : null,
    }).where(eq(listings.id, id)),
    d.delete(listingImages).where(eq(listingImages.listingId, id)),
    d.insert(timeline).values({ listingId: id, event: l.status === 'rejected' ? 'resubmitted' : 'edited', actor: 'owner', note: l.status === 'rejected' ? `ครั้งที่ ${rev}` : null }),
  ];
  if (rows.length) stmts.push(d.insert(listingImages).values(rows));
  if (vals.price !== l.price) stmts.push(d.insert(priceHistory).values({ listingId: id, price: vals.price }));
  await d.batch(stmts as never);
  if (removed.length) c.executionCtx.waitUntil(c.env.UPLOADS.delete(removed.flatMap((im) => SIZES.map((sz) => `${im.keyBase}-${sz}.${im.ext}`))).catch(() => undefined));

  const msg = l.status === 'rejected' ? `ส่งประกาศ ${l.ref} ให้ทีมงานตรวจอีกครั้งแล้ว` : `บันทึกการแก้ไข ${l.ref} แล้ว (รอตรวจสอบ)`;
  return c.json({ ok: true, ref: l.ref, redirect: '/account?ok=' + encodeURIComponent(msg) });
});

/* ---------- ผู้สนใจ / ฝากขาย ---------- */
api.post('/leads', async (c) => {
  const ip = clientIp(c);
  const rl = await rateLimit(c.env, `lead:${ip}`, 10, 3600);
  if (!rl.ok) return c.json({ ok: false, error: 'ส่งข้อความบ่อยเกินไป กรุณาลองใหม่ภายหลัง' }, 429);
  let b: Record<string, unknown>;
  try { b = await c.req.json(); } catch { return c.json({ ok: false, error: 'ข้อมูลไม่ถูกต้อง' }, 400); }
  if (!(await verifyTurnstile(c.env, String(b['cf-turnstile-response'] || ''), ip))) return c.json({ ok: false, error: 'กรุณายืนยันว่าไม่ใช่บอท' }, 400);
  const kind = b.kind === 'consign' ? 'consign' : b.kind === 'contact' ? 'contact' : 'inquiry';
  if (kind === 'consign' && !(await geo(c.env)).provinces.some((p) => p.nameTh === b.meta_province)) return c.json({ ok: false, error: 'รับฝากขาย/ฝากเช่าเฉพาะ 20 จังหวัดในภาคอีสาน กรุณาเลือกจังหวัด' }, 422);
  const name = str(b.name, 80);
  const phone = normPhone(String(b.phone || ''));
  if (name.length < 2) return c.json({ ok: false, error: 'กรุณาระบุชื่อ' }, 422);
  if (!isThaiPhone(phone)) return c.json({ ok: false, error: 'เบอร์โทรไม่ถูกต้อง' }, 422);
  if (!b.consent) return c.json({ ok: false, error: 'กรุณายืนยันความยินยอม' }, 422);
  let listingId: number | null = null;
  if (kind === 'inquiry') {
    listingId = clampInt(b.listingId, 1, 1e9);
    if (!listingId) return c.json({ ok: false, error: 'ไม่พบประกาศ' }, 404);
    const l = await db(c.env).select({ id: listings.id, status: listings.status, ref: listings.ref, provinceCode: listings.provinceCode }).from(listings).where(eq(listings.id, listingId)).limit(1);
    if (!l[0] || !(await geo(c.env)).provinces.some((p) => p.code === l[0].provinceCode) || l[0].status !== 'active') return c.json({ ok: false, error: 'ประกาศนี้ปิดแล้ว' }, 410);
    if (l[0].ref.startsWith('SL-DEMO')) return c.json({ ok: false, error: 'ประกาศตัวอย่าง ไม่รับการติดต่อ' }, 410);
  }
  const meta: Record<string, string> = {};
  for (const [k, v] of Object.entries(b)) if (k.startsWith('meta_') && typeof v === 'string' && v) meta[k.slice(5)] = v.slice(0, 80);
  await db(c.env).insert(leads).values({
    kind, listingId, name, phone, line: str(b.line, 60) || null, email: str(b.email, 120) || null,
    message: str(b.message, 2000) || null, meta: Object.keys(meta).length ? JSON.stringify(meta) : null,
  });
  return c.json({ ok: true });
});
