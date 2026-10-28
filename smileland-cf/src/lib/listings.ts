import { and, asc, count, desc, eq, gte, inArray, lte, sql, type SQL } from 'drizzle-orm';
import type { Bindings } from '../env';
import { db } from '../db';
import { listings, listingImages, listingTokens, priceHistory, timeline, type Listing } from '../db/schema';
import { indexTokens, queryTokens } from './thai';
import { geo } from './geo';
import { SERVICE_PROVINCES } from './service-area';
import { DEALS, TYPES, DEED_TYPES, FEATURES } from './util';

export type SearchParams = {
  deal?: 'sale' | 'rent';
  type?: 'house' | 'land' | 'condo';
  province?: number;
  district?: number;
  q?: string;
  realOnly?: boolean; // ไม่นับประกาศตัวอย่าง
  min?: number;
  max?: number;
  bed?: number;
  sort?: 'new' | 'price-asc' | 'price-desc' | 'size';
  page?: number;
  per?: number;
};

export const cardColumns = {
  id: listings.id, ref: listings.ref, deal: listings.deal, type: listings.type, title: listings.title, price: listings.price,
  provinceCode: listings.provinceCode, districtCode: listings.districtCode, landSqw: listings.landSqw, usableSqm: listings.usableSqm,
  bedrooms: listings.bedrooms, bathrooms: listings.bathrooms, coverKey: listings.coverKey, imageCount: listings.imageCount,
  featured: listings.featured, lat: listings.lat, lng: listings.lng, createdAt: listings.createdAt, projectName: listings.projectName,
  status: listings.status,
};
export type Card = {
  id: number; ref: string; deal: 'sale' | 'rent'; type: 'house' | 'land' | 'condo'; title: string; price: number;
  provinceCode: number; districtCode: number; landSqw: number | null; usableSqm: number | null; bedrooms: number | null;
  bathrooms: number | null; coverKey: string | null; imageCount: number; featured: number; lat: number | null; lng: number | null;
  createdAt: number; projectName: string | null; status: string;
  provinceName?: string; districtName?: string; provinceSlug?: string;
};

export function imgUrl(env: Bindings, coverKey: string | null, size: 400 | 800 | 1600 = 800): string | null {
  if (!coverKey) return null;
  const [base, ext = 'webp'] = coverKey.split(':');
  if (base.startsWith('/')) return `${base}-${size}.${ext}`; // รูปที่เป็นไฟล์ static (ประกาศตัวอย่าง)
  return `${env.IMG_BASE}/${base}-${size}.${ext}`;
}
export function imgSrcset(env: Bindings, coverKey: string | null): string | undefined {
  if (!coverKey) return;
  return ([400, 800, 1600] as const).map((s) => `${imgUrl(env, coverKey, s)} ${s}w`).join(', ');
}
export const placeholder = (type: string) => `/assets/img/ph-${type}.svg`;

function tokenCondition(q: string): SQL | null {
  const toks = queryTokens(q);
  if (!toks.length) return null;
  const conds = toks.map((t) => sql`${listings.id} IN (SELECT ${listingTokens.listingId} FROM ${listingTokens} WHERE ${listingTokens.token} >= ${t} AND ${listingTokens.token} < ${t + '￿'})`);
  return and(...conds)!;
}

/* ---------- ประกาศตัวอย่าง: ซ่อนอัตโนมัติเมื่อประกาศจริงครบตามที่ตั้ง (settings.demo_hide_at, ค่าเริ่มต้น 20) ---------- */
export const DEMO_HIDE_DEFAULT = 20;
const SA = sql.raw(SERVICE_PROVINCES.join(','));
/** เงื่อนไข SQL: ประกาศจริงแสดงเสมอ ประกาศตัวอย่างแสดงเฉพาะตอนที่ประกาศจริงยังไม่ครบเกณฑ์ */
export const demoVisibleSql = sql`(${listings.ref} NOT LIKE 'SL-DEMO%' OR (SELECT count(*) FROM listings r WHERE r.status = 'active' AND r.ref NOT LIKE 'SL-DEMO%' AND r.province_code IN (${SA})) < coalesce((SELECT CAST(value AS INTEGER) FROM settings WHERE key = 'demo_hide_at' AND value <> ''), ${DEMO_HIDE_DEFAULT}))`;
/** เรียงประกาศจริงขึ้นก่อนประกาศตัวอย่างเสมอ */
export const realFirst = sql`CASE WHEN ${listings.ref} LIKE 'SL-DEMO%' THEN 1 ELSE 0 END`;

export async function demoStatus(env: Bindings) {
  const r = await env.DB.prepare(
    `SELECT
      (SELECT count(*) FROM listings WHERE status = 'active' AND ref NOT LIKE 'SL-DEMO%' AND province_code IN (${SERVICE_PROVINCES.join(',')})) AS real,
      (SELECT count(*) FROM listings WHERE ref LIKE 'SL-DEMO%') AS demo,
      coalesce((SELECT CAST(value AS INTEGER) FROM settings WHERE key = 'demo_hide_at' AND value <> ''), ${DEMO_HIDE_DEFAULT}) AS at`,
  ).first<{ real: number; demo: number; at: number }>();
  const s = r ?? { real: 0, demo: 0, at: DEMO_HIDE_DEFAULT };
  return { ...s, hidden: s.real >= s.at };
}

/* ---------- โซนแสดงผล (Admin จัด) ---------- */
export type ZoneKey = 'A' | 'B' | 'C';
export const ZONES: Record<ZoneKey, { label: string; where: string; max: number }> = {
  A: { label: 'โซน A · โชว์เด่น', where: 'การ์ดใหญ่ใต้ภาพหลักหน้าแรก', max: 3 },
  B: { label: 'โซน B · ประกาศแนะนำ', where: 'แถวประกาศแนะนำหน้าแรก', max: 8 },
  C: { label: 'โซน C · ปักหมุด', where: 'บนสุดของหน้าค้นหา/หน้าจังหวัดที่ตรงกับทรัพย์', max: 0 },
};
/** ทรัพย์อยู่ในโซนนี้และยังไม่หมดเวลา (โซน B รวมประกาศแนะนำแบบเดิมที่ยังไม่ได้จัดโซน) */
export const zoneLive = (z: ZoneKey) => z === 'B'
  ? sql`((${listings.zone} = 'B' OR (${listings.zone} IS NULL AND ${listings.featured} = 1)) AND (${listings.zoneUntil} IS NULL OR ${listings.zoneUntil} > unixepoch()))`
  : sql`(${listings.zone} = ${z} AND (${listings.zoneUntil} IS NULL OR ${listings.zoneUntil} > unixepoch()))`;
const pinC = sql`CASE WHEN ${listings.zone} = 'C' AND (${listings.zoneUntil} IS NULL OR ${listings.zoneUntil} > unixepoch()) THEN 1 ELSE 0 END`;
const pinOrder = sql`CASE WHEN ${listings.zone} = 'C' THEN ${listings.zoneOrder} ELSE 0 END`;

export function buildWhere(p: SearchParams): SQL {
  const w: SQL[] = [eq(listings.status, 'active'), inArray(listings.provinceCode, SERVICE_PROVINCES), demoVisibleSql];
  if (p.deal) w.push(eq(listings.deal, p.deal));
  if (p.type) w.push(eq(listings.type, p.type));
  if (p.province) w.push(eq(listings.provinceCode, p.province));
  if (p.district) w.push(eq(listings.districtCode, p.district));
  if (p.min) w.push(gte(listings.price, p.min));
  if (p.max) w.push(lte(listings.price, p.max));
  if (p.bed) w.push(gte(listings.bedrooms, p.bed));
  if (p.realOnly) w.push(sql`${listings.ref} NOT LIKE 'SL-DEMO%'`);
  if (p.q && /^sl-[a-z0-9]{4,}$/i.test(p.q.trim())) {
    w.push(eq(listings.ref, p.q.trim().toUpperCase()));
  } else if (p.q) {
    const t = tokenCondition(p.q);
    if (t) w.push(t);
  }
  return and(...w)!;
}

export async function decorate(env: Bindings, rows: Card[]): Promise<Card[]> {
  const g = await geo(env);
  const pm = new Map(g.provinces.map((p) => [p.code, p]));
  const dm = new Map(g.districts.map((d) => [d.code, d]));
  return rows.map((r) => ({ ...r, provinceName: pm.get(r.provinceCode)?.nameTh, provinceSlug: pm.get(r.provinceCode)?.slug, districtName: dm.get(r.districtCode)?.nameTh }));
}

export async function search(env: Bindings, p: SearchParams) {
  const d = db(env);
  const per = Math.min(Math.max(p.per || 24, 1), 60);
  const page = Math.max(p.page || 1, 1);
  const where = buildWhere(p);
  const order =
    p.sort === 'price-asc' ? [asc(listings.price)] :
    p.sort === 'price-desc' ? [desc(listings.price)] :
    p.sort === 'size' ? [desc(sql`coalesce(${listings.landSqw}, 0) * 4 + coalesce(${listings.usableSqm}, 0)`)] :
    [desc(pinC), asc(pinOrder), asc(realFirst), desc(listings.featured), desc(listings.approvedAt), desc(listings.id)];
  const [rows, total] = await Promise.all([
    d.select(cardColumns).from(listings).where(where).orderBy(...order).limit(per).offset((page - 1) * per),
    d.select({ n: count() }).from(listings).where(where),
  ]);
  return { items: await decorate(env, rows as Card[]), total: total[0]?.n ?? 0, page, per, pages: Math.max(1, Math.ceil((total[0]?.n ?? 0) / per)) };
}

export async function countActive(env: Bindings, p: SearchParams) {
  const r = await db(env).select({ n: count() }).from(listings).where(buildWhere(p));
  return r[0]?.n ?? 0;
}

/** สถิติสำหรับหน้าแรก/หน้า landing — เรนเดอร์ฝั่ง server (Googlebot เห็นตัวเลขจริง) */
export async function stats(env: Bindings) {
  const rows = await db(env).select({ deal: listings.deal, type: listings.type, n: count() }).from(listings)
    .where(buildWhere({})).groupBy(listings.deal, listings.type);
  const s = { total: 0, sale: 0, rent: 0, house: 0, land: 0, condo: 0 } as Record<string, number>;
  for (const r of rows) { s.total += r.n; s[r.deal] += r.n; s[r.type] += r.n; }
  return s;
}

export async function provinceCounts(env: Bindings, deal?: string, type?: string) {
  const w: SQL[] = [eq(listings.status, 'active'), inArray(listings.provinceCode, SERVICE_PROVINCES), demoVisibleSql];
  if (deal) w.push(eq(listings.deal, deal as 'sale'));
  if (type) w.push(eq(listings.type, type as 'land'));
  const rows = await db(env).select({ code: listings.provinceCode, n: count() }).from(listings).where(and(...w)).groupBy(listings.provinceCode);
  return new Map(rows.map((r) => [r.code, r.n]));
}
export async function districtCounts(env: Bindings, provinceCode: number, deal?: string, type?: string) {
  const w: SQL[] = [eq(listings.status, 'active'), eq(listings.provinceCode, provinceCode), demoVisibleSql];
  if (deal) w.push(eq(listings.deal, deal as 'sale'));
  if (type) w.push(eq(listings.type, type as 'land'));
  const rows = await db(env).select({ code: listings.districtCode, n: count() }).from(listings).where(and(...w)).groupBy(listings.districtCode);
  return new Map(rows.map((r) => [r.code, r.n]));
}

export async function getListing(env: Bindings, id: number) {
  const d = db(env);
  const r = await d.select().from(listings).where(eq(listings.id, id)).limit(1);
  return r[0] ?? null;
}
export async function getImages(env: Bindings, id: number) {
  return db(env).select().from(listingImages).where(eq(listingImages.listingId, id)).orderBy(asc(listingImages.idx));
}
export async function getTimeline(env: Bindings, id: number) {
  return db(env).select().from(timeline).where(eq(timeline.listingId, id)).orderBy(asc(timeline.id));
}
export async function getPriceHistory(env: Bindings, id: number) {
  return db(env).select().from(priceHistory).where(eq(priceHistory.listingId, id)).orderBy(asc(priceHistory.id));
}

export async function similar(env: Bindings, l: Listing, n = 4) {
  const rows = await db(env).select(cardColumns).from(listings)
    .where(and(eq(listings.status, 'active'), eq(listings.deal, l.deal), eq(listings.type, l.type), eq(listings.provinceCode, l.provinceCode), sql`${listings.id} != ${l.id}`, demoVisibleSql))
    .orderBy(asc(realFirst), sql`abs(${listings.price} - ${l.price})`).limit(n);
  return decorate(env, rows as Card[]);
}

/** สร้างดัชนีคำค้นใหม่ของประกาศ (เรียกตอนอนุมัติ/แก้ไข) */
export async function reindex(env: Bindings, l: Listing) {
  const g = await geo(env);
  const p = g.provinces.find((x) => x.code === l.provinceCode);
  const dd = g.districts.find((x) => x.code === l.districtCode);
  let features: string[] = [];
  try { features = JSON.parse(l.features || '[]'); } catch { /* ignore */ }
  const toks = indexTokens(
    [l.title, l.description, l.addressNote, l.projectName, DEALS[l.deal], TYPES[l.type], l.type === 'land' ? 'ที่ดิน' : 'บ้าน',
      DEED_TYPES[l.deedType || ''], ...features.map((f) => FEATURES[f])],
    [p?.nameTh, p?.nameEn, dd?.nameTh, dd?.nameEn, l.ref, p?.nameTh.replace('จังหวัด', '')],
  );
  const d = db(env);
  const stmts = [d.delete(listingTokens).where(eq(listingTokens.listingId, l.id))];
  for (let i = 0; i < toks.length; i += 40) {
    const chunk = toks.slice(i, i + 40).map((token) => ({ token, listingId: l.id }));
    stmts.push(d.insert(listingTokens).values(chunk).onConflictDoNothing() as never);
  }
  await d.batch(stmts as never);
}

export async function addTimeline(env: Bindings, listingId: number, event: string, actor: string, note?: string | null) {
  await db(env).insert(timeline).values({ listingId, event, actor, note: note ?? null });
}

export async function idsWithImages(env: Bindings, ids: number[]) {
  if (!ids.length) return [];
  return db(env).select().from(listingImages).where(inArray(listingImages.listingId, ids));
}
