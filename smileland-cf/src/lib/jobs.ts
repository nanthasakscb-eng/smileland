import { and, count, eq, lt, sql } from 'drizzle-orm';
import type { Bindings, Job } from '../env';
import { db } from '../db';
import { listings, listingTokens, timeline } from '../db/schema';
import { geo } from './geo';
import { nowSec } from './util';

const xmlEsc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const iso = (sec: number) => new Date(sec * 1000).toISOString().slice(0, 10);
const site = (env: Bindings) => env.SITE_URL.replace(/\/$/, '');

/** sitemap ของจังหวัด: หน้า landing ที่มีประกาศพอ (ไม่ thin) + ประกาศทุกรายการที่เผยแพร่อยู่ */
export async function buildProvinceSitemap(env: Bindings, provinceCode: number): Promise<string | null> {
  const g = await geo(env);
  const prov = g.provinces.find((p) => p.code === provinceCode);
  if (!prov) return null;
  const d = db(env);
  const min = parseInt(env.THIN_PAGE_MIN || '3', 10);
  const base = site(env);
  const groups = await d.select({ deal: listings.deal, type: listings.type, district: listings.districtCode, n: count(), last: sql<number>`max(${listings.updatedAt})` })
    .from(listings).where(and(eq(listings.status, 'active'), eq(listings.provinceCode, provinceCode), sql`${listings.ref} NOT LIKE 'SL-DEMO%'`))
    .groupBy(listings.deal, listings.type, listings.districtCode);
  const urls: { loc: string; lastmod?: number; pri?: string }[] = [];
  // รวมยอดตาม (deal,type) และ (deal,property) ในระดับจังหวัด/อำเภอ
  const agg = new Map<string, { n: number; last: number }>();
  const add = (k: string, n: number, last: number) => { const v = agg.get(k) || { n: 0, last: 0 }; v.n += n; v.last = Math.max(v.last, last); agg.set(k, v); };
  for (const r of groups) {
    const ds = g.districts.find((x) => x.code === r.district);
    for (const t of [r.type, 'property']) {
      add(`/${r.deal}/${t}/${prov.slug}`, r.n, r.last);
      if (ds) add(`/${r.deal}/${t}/${prov.slug}/${ds.slug}`, r.n, r.last);
    }
  }
  for (const [path, v] of agg) if (v.n >= min) urls.push({ loc: base + path, lastmod: v.last, pri: path.split('/').length > 4 ? '0.6' : '0.7' });
  const items = await d.select({ id: listings.id, updatedAt: listings.updatedAt }).from(listings)
    .where(and(eq(listings.status, 'active'), eq(listings.provinceCode, provinceCode), sql`${listings.ref} NOT LIKE 'SL-DEMO%'`)).limit(45000);
  for (const it of items) urls.push({ loc: `${base}/listing/${it.id}`, lastmod: it.updatedAt, pri: '0.8' });
  if (!urls.length) return null;
  return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls.map((u) => `<url><loc>${xmlEsc(u.loc)}</loc>${u.lastmod ? `<lastmod>${iso(u.lastmod)}</lastmod>` : ''}${u.pri ? `<priority>${u.pri}</priority>` : ''}</url>`).join('\n') +
    '\n</urlset>\n';
}

export async function writeProvinceSitemap(env: Bindings, provinceCode: number) {
  const g = await geo(env);
  const prov = g.provinces.find((p) => p.code === provinceCode);
  if (!prov) return;
  const xml = await buildProvinceSitemap(env, provinceCode);
  const key = `sitemaps/${prov.slug}.xml`;
  if (xml) await env.UPLOADS.put(key, xml, { httpMetadata: { contentType: 'application/xml; charset=utf-8' } });
  else await env.UPLOADS.delete(key);
}

export function staticSitemap(env: Bindings) {
  const base = site(env);
  const paths = ['/', '/provinces', '/post', '/consign', '/tools',
    ...['sale', 'rent'].flatMap((d) => ['property', 'house', 'land', 'condo'].map((t) => `/${d}/${t}`))];
  return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    paths.map((p) => `<url><loc>${xmlEsc(base + p)}</loc></url>`).join('\n') + '\n</urlset>\n';
}

export async function sitemapIndex(env: Bindings) {
  const base = site(env);
  const g = await geo(env);
  const rows = await db(env).select({ code: listings.provinceCode, last: sql<number>`max(${listings.updatedAt})` }).from(listings)
    .where(and(eq(listings.status, 'active'), sql`${listings.ref} NOT LIKE 'SL-DEMO%'`)).groupBy(listings.provinceCode);
  const entries = [`<sitemap><loc>${base}/sitemaps/static.xml</loc></sitemap>`];
  for (const r of rows) {
    const p = g.provinces.find((x) => x.code === r.code);
    if (p) entries.push(`<sitemap><loc>${base}/sitemaps/${p.slug}.xml</loc><lastmod>${iso(r.last)}</lastmod></sitemap>`);
  }
  return '<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + entries.join('\n') + '\n</sitemapindex>\n';
}

/** Cron รายวัน: ประกาศหมดอายุ → expired, แล้วสั่งสร้าง sitemap ทุกจังหวัดที่มีประกาศผ่าน Queue */
export async function dailyCron(env: Bindings) {
  const d = db(env);
  const now = nowSec();
  const expired = await d.select({ id: listings.id, provinceCode: listings.provinceCode }).from(listings)
    .where(and(eq(listings.status, 'active'), lt(listings.expiresAt, now))).limit(500);
  for (let i = 0; i < expired.length; i += 50) {
    const chunk = expired.slice(i, i + 50);
    await d.batch(chunk.flatMap((e) => [
      d.update(listings).set({ status: 'expired', updatedAt: now }).where(eq(listings.id, e.id)),
      d.insert(timeline).values({ listingId: e.id, event: 'expired', actor: 'system' }),
      d.delete(listingTokens).where(eq(listingTokens.listingId, e.id)),
    ]) as never);
  }
  const provs = await d.selectDistinct({ code: listings.provinceCode }).from(listings).where(eq(listings.status, 'active'));
  const touched = new Set([...provs.map((p) => p.code), ...expired.map((e) => e.provinceCode)]);
  const msgs: { body: Job }[] = [...touched].map((code) => ({ body: { kind: 'sitemap', provinceCode: code } }));
  for (let i = 0; i < msgs.length; i += 100) await env.JOBS.sendBatch(msgs.slice(i, i + 100));
  return { expired: expired.length, provinces: touched.size };
}

export async function handleJob(env: Bindings, job: Job) {
  if (job.kind === 'sitemap') await writeProvinceSitemap(env, job.provinceCode);
  if (job.kind === 'purge-images') {
    const list = await env.UPLOADS.list({ prefix: `listings/${job.listingId}/` });
    if (list.objects.length) await env.UPLOADS.delete(list.objects.map((o) => o.key));
  }
}
