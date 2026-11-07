import { Hono } from 'hono';
import type { AppEnv } from '../env';
import { geo } from '../lib/geo';
import { buildProvinceSitemap, sitemapIndex, staticSitemap } from '../lib/jobs';

export const seo = new Hono<AppEnv>();

const xml = (body: string, maxAge = 3600) => new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': `public, max-age=${maxAge}` } });

seo.get('/robots.txt', (c) => {
  const base = c.env.SITE_URL.replace(/\/$/, '');
  return c.text(`User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /manage/\nDisallow: /api/\nDisallow: /search\n\nSitemap: ${base}/sitemap.xml\n`, 200, { 'Cache-Control': 'public, max-age=86400' });
});

seo.get('/sitemap.xml', async (c) => xml(await sitemapIndex(c.env)));
seo.get('/sitemaps/static.xml', async (c) => xml(await staticSitemap(c.env), 3600));
seo.get('/sitemaps/:file{[a-z0-9-]+\\.xml}', async (c) => {
  const slug = c.req.param('file').replace(/\.xml$/, '');
  const g = await geo(c.env);
  const prov = g.provinces.find((p) => p.slug === slug);
  if (!prov) return c.notFound();
  // ใช้ไฟล์ที่ Cron/Queue สร้างไว้ใน R2 ถ้ามี ไม่มีก็สร้างสดแล้วเก็บไว้
  const obj = await c.env.UPLOADS.get(`sitemaps/${slug}.xml`);
  if (obj) return xml(await obj.text());
  const body = await buildProvinceSitemap(c.env, prov.code);
  if (!body) return c.notFound();
  c.executionCtx.waitUntil(c.env.UPLOADS.put(`sitemaps/${slug}.xml`, body, { httpMetadata: { contentType: 'application/xml; charset=utf-8' } }).then(() => undefined));
  return xml(body);
});

/* รูปภาพจาก R2 — production แนะนำให้ผูก custom domain img.<โดเมน> กับ bucket แล้วตั้ง IMG_BASE
   เพื่อให้รูปเสิร์ฟผ่าน CDN โดยตรงไม่กินโควตา request ของ Worker */
seo.get('/img/*', async (c) => {
  const key = c.req.path.slice('/img/'.length);
  if (!/^listings\/\d+\/\d+-(400|800|1600)\.(webp|jpg)$/.test(key)) return c.notFound();
  const cache = (caches as unknown as { default: Cache }).default;
  const hit = await cache.match(c.req.raw);
  if (hit) return new Response(hit.body, hit); // คัดลอกเพื่อให้ middleware ใส่ header ได้ (response จาก cache แก้ไขไม่ได้)
  const obj = await c.env.UPLOADS.get(key);
  if (!obj) return c.notFound();
  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set('ETag', obj.httpEtag);
  headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  headers.set('X-Content-Type-Options', 'nosniff');
  const res = new Response(obj.body, { headers });
  c.executionCtx.waitUntil(cache.put(c.req.raw, res.clone()));
  return res;
});
