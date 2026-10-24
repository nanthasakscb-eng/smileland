/** @jsxImportSource hono/jsx */
import { Hono, type Context } from 'hono';
import type { Child } from 'hono/jsx';
import { and, desc, eq } from 'drizzle-orm';
import type { AppEnv } from '../env';
import { db } from '../db';
import { leads, listings, priceHistory, timeline } from '../db/schema';
import { Layout, crumbsLd, type Meta } from '../views/ui';
import { HomePage } from '../views/pages/home';
import { SearchPage, type SubLink } from '../views/pages/search';
import { ListingPage } from '../views/pages/listing';
import { PostDone, PostPage } from '../views/pages/post';
import { ConsignPage, ManagePage, NotFoundPage, PrivacyPage, ProvincesPage, StatusPage, TermsPage, ToolsPage } from '../views/pages/misc';
import { geo, provinceBySlug, districtBySlug, districtsOf, subdistrictName, districtLabel } from '../lib/geo';
import {
  search, stats, provinceCounts, districtCounts, getListing, getImages, getTimeline, getPriceHistory, similar, imgUrl, addTimeline,
  cardColumns, decorate, countActive, type SearchParams, type Card,
} from '../lib/listings';
import { isDemo, DEALS, TYPES, formatPrice, landText, nowSec, normPhone, truncate, clampInt, type Deal, type PType } from '../lib/util';
import { clientIp, rateLimit, sha256Hex, verifyTurnstile, sameOrigin } from '../lib/security';

export const pub = new Hono<AppEnv>();

export function render(c: Context<AppEnv>, meta: Meta, body: Child, status = 200) {
  return c.html(<Layout env={c.env} meta={meta} settings={c.get('settings')}>{body}</Layout>, status as 200);
}
export function notFound(c: Context<AppEnv>) {
  return render(c, { title: 'ไม่พบหน้า', noindex: true }, <NotFoundPage />, 404);
}

const site = (c: Context<AppEnv>) => c.env.SITE_URL.replace(/\/$/, '');
const thaiMonthYear = () => new Intl.DateTimeFormat('th-TH', { month: 'long', year: 'numeric', timeZone: 'Asia/Bangkok' }).format(new Date());

/* ================= หน้าแรก ================= */
pub.get('/', async (c) => {
  const d = db(c.env);
  const [g, st, pc, featuredRows, latestRows] = await Promise.all([
    geo(c.env), stats(c.env), provinceCounts(c.env),
    d.select(cardColumns).from(listings).where(and(eq(listings.status, 'active'), eq(listings.featured, 1))).orderBy(desc(listings.approvedAt)).limit(8),
    d.select(cardColumns).from(listings).where(eq(listings.status, 'active')).orderBy(desc(listings.approvedAt), desc(listings.id)).limit(8),
  ]);
  const [featured, latest] = await Promise.all([decorate(c.env, featuredRows as Card[]), decorate(c.env, latestRows as Card[])]);
  return render(c, {
    title: 'SMILELAND — ประกาศขาย/ให้เช่า บ้าน ที่ดิน คอนโด ทั่วไทย ลงประกาศฟรี',
    description: `ค้นหาบ้าน ที่ดิน คอนโด ขายและให้เช่าทั่ว 77 จังหวัด ${formatPrice(st.total)} ประกาศที่ผ่านการตรวจสอบ ลงประกาศฟรี บริการฝากขาย/ฝากเช่า`,
    canonical: '/', page: 'home',
    jsonld: [
      { '@context': 'https://schema.org', '@type': 'WebSite', name: 'SMILELAND', url: site(c) + '/', potentialAction: { '@type': 'SearchAction', target: site(c) + '/search?q={q}', 'query-input': 'required name=q' } },
      { '@context': 'https://schema.org', '@type': 'Organization', name: 'SMILELAND', url: site(c) + '/', logo: site(c) + '/assets/img/logo.svg' },
    ],
  }, <HomePage env={c.env} provinces={g.provinces} featured={featured} latest={latest} stats={st} pcounts={pc} />);
});

/* ================= ค้นหา (query string) ================= */
function parseParams(q: Record<string, string>): SearchParams {
  const deal = q.deal === 'rent' ? 'rent' : q.deal === 'sale' ? 'sale' : undefined;
  const type = (['house', 'land', 'condo'] as const).find((t) => t === q.type);
  const sort = (['new', 'price-asc', 'price-desc', 'size'] as const).find((s) => s === q.sort);
  return {
    deal, type, sort,
    province: clampInt(q.province, 1, 999) || undefined,
    district: clampInt(q.district, 1, 9999) || undefined,
    min: clampInt(q.min, 0, 10_000_000_000) || undefined,
    max: clampInt(q.max, 0, 10_000_000_000) || undefined,
    bed: clampInt(q.bed, 1, 20) || undefined,
    q: q.q ? q.q.trim().slice(0, 120) : undefined,
    page: clampInt(q.page, 1, 500) || 1,
  };
}

async function landingPath(c: Context<AppEnv>, p: SearchParams) {
  const g = await geo(c.env);
  const prov = p.province ? g.provinces.find((x) => x.code === p.province) : undefined;
  const dist = p.district ? g.districts.find((x) => x.code === p.district && x.provinceCode === p.province) : undefined;
  let path = `/${p.deal || 'sale'}/${p.type || 'property'}`;
  if (prov) path += `/${prov.slug}`;
  if (prov && dist) path += `/${dist.slug}`;
  return path;
}

pub.get('/search', async (c) => {
  const q = c.req.query();
  const p = parseParams(q);
  // ถ้าเงื่อนไขตรงกับหน้า landing (ไม่มีคำค้น/ช่วงราคา) → 301 ไปหน้า SEO ที่เป็น canonical
  if (!p.q && !p.min && !p.max && !p.bed && !p.sort && (p.page || 1) === 1) return c.redirect(await landingPath(c, p), 301);
  if (!p.deal) p.deal = 'sale';
  return renderListingSearch(c, p, null);
});

/* ================= หน้า landing: /{deal}/{type}/{province?}/{district?} ================= */
const landingHandler = async (c: Context<AppEnv>) => {
  const { deal, type, province, district } = c.req.param() as Record<string, string | undefined>;
  const p: SearchParams = { deal: deal as Deal, type: type === 'property' ? undefined : (type as PType), page: clampInt(c.req.query('page'), 1, 500) || 1 };
  let prov, dist;
  if (province) {
    prov = await provinceBySlug(c.env, province);
    if (!prov) return notFound(c);
    p.province = prov.code;
    if (district) {
      dist = await districtBySlug(c.env, prov.code, district);
      if (!dist) return notFound(c);
      p.district = dist.code;
    }
  }
  return renderListingSearch(c, p, { deal: deal as Deal, type: type!, prov, dist });
};
const LANDING = '/:deal{(?:sale|rent)}/:type{(?:house|land|condo|property)}';
pub.get(LANDING, landingHandler);
pub.get(`${LANDING}/:province{[a-z0-9-]+}`, landingHandler);
pub.get(`${LANDING}/:province{[a-z0-9-]+}/:district{[a-z0-9-]+}`, landingHandler);
// ลิงก์สั้น /sale → /sale/property
pub.get('/:deal{(?:sale|rent)}', (c) => c.redirect(`/${c.req.param('deal')}/property`, 301));

type LandingCtx = { deal: Deal; type: string; prov?: { code: number; nameTh: string; slug: string; nameEn: string }; dist?: { code: number; nameTh: string; slug: string } };

async function renderListingSearch(c: Context<AppEnv>, p: SearchParams, landing: LandingCtx | null) {
  const g = await geo(c.env);
  const result = await search(c.env, p);
  const prov = landing?.prov ?? (p.province ? g.provinces.find((x) => x.code === p.province) : undefined);
  const dist = landing?.dist ?? (p.district ? g.districts.find((x) => x.code === p.district) : undefined);
  const dealTh = DEALS[p.deal || 'sale'];
  const typeTh = p.type ? TYPES[p.type] : 'อสังหาฯ ';
  const dealWord = p.deal === 'rent' ? 'ให้เช่า' : 'ขาย';
  const place = dist && prov ? `${districtLabel(prov.code)}${dist.nameTh} ${prov.nameTh}` : prov ? prov.nameTh : 'ทั่วประเทศ';
  const h1 = landing ? `${typeTh}${dealWord} ${place}` : p.q ? `ผลการค้นหา "${p.q}"` : `${typeTh}${dealWord} ${place}`;
  const typeSlug = p.type || 'property';
  const base = `/${p.deal || 'sale'}/${typeSlug}`;
  const crumbs: [string, string?][] = [['หน้าแรก', '/'], [`${typeTh}${dealWord}`, base]];
  if (prov) crumbs.push([prov.nameTh, `${base}/${prov.slug}`]);
  if (dist && prov) crumbs.push([dist.nameTh, `${base}/${prov.slug}/${dist.slug}`]);
  if (!landing) crumbs.push(['ผลการค้นหา']);

  // ลิงก์ย่อย
  let subLinks: SubLink[] = [];
  let subTitle = '';
  if (landing && !prov) {
    const pc = await provinceCounts(c.env, p.deal, p.type);
    subTitle = 'เลือกจังหวัด';
    subLinks = g.provinces.filter((x) => pc.get(x.code)).sort((a, b) => (pc.get(b.code)! - pc.get(a.code)!)).slice(0, 30)
      .map((x) => ({ href: `${base}/${x.slug}`, label: x.nameTh, n: pc.get(x.code) }));
    subLinks.push({ href: '/provinces', label: 'ดูทุกจังหวัด →' });
  } else if (landing && prov && !dist) {
    const dc = await districtCounts(c.env, prov.code, p.deal, p.type);
    const ds = await districtsOf(c.env, prov.code);
    subTitle = `เลือก${districtLabel(prov.code)}ใน${prov.nameTh}`;
    const withN = ds.filter((x) => dc.get(x.code));
    subLinks = (withN.length ? withN : ds).map((x) => ({ href: `${base}/${prov.slug}/${x.slug}`, label: x.nameTh, n: dc.get(x.code) }));
  } else if (landing && prov) {
    subTitle = 'ประเภททรัพย์ในพื้นที่นี้';
    subLinks = (['property', 'house', 'land', 'condo'] as const).map((t) => ({
      href: `/${p.deal}/${t}/${prov.slug}${dist ? '/' + dist.slug : ''}`, label: t === 'property' ? 'ทั้งหมด' : TYPES[t], on: t === typeSlug,
    }));
  }

  const minN = parseInt(c.env.THIN_PAGE_MIN || '3', 10);
  const realTotal = result.total < minN ? 0 : await countActive(c.env, { ...p, realOnly: true });
  const thin = realTotal < minN; // หน้าที่มีแต่ประกาศตัวอย่าง/ประกาศน้อย → noindex
  const canonicalPath = landing ? (c.req.path + ((p.page || 1) > 1 ? `?page=${p.page}` : '')) : await landingPath(c, p);
  const pageHref = (n: number) => {
    if (landing) return n === 1 ? c.req.path : `${c.req.path}?page=${n}`;
    const u = new URL(c.req.url);
    u.searchParams.set('page', String(n));
    return u.pathname + u.search;
  };
  const priceText = result.items.length ? ` ราคาเริ่มต้น ฿${formatPrice(Math.min(...result.items.map((x) => x.price)))}` : '';
  // meta description สร้างจากชื่อพื้นที่จริงของหน้านั้นเสมอ (กันปัญหาชื่อจังหวัดผิดจากการคัดลอก template)
  const description = `${typeTh}${dealWord} ${place} ${formatPrice(result.total)} ประกาศ${priceText} อัปเดต ${thaiMonthYear()} ค้นหาพร้อมแผนที่ ติดต่อผู้ลงประกาศได้ทันที ลงประกาศฟรีที่ SMILELAND`;
  const seo: Child = landing ? (
    <>
      <h2>{typeTh}{dealWord} {place}</h2>
      <p>รวมประกาศ{typeTh}{dealWord}ใน{place} จากเจ้าของและนายหน้า ทุกประกาศผ่านการตรวจสอบก่อนเผยแพร่ ปัจจุบันมี {formatPrice(result.total)} ประกาศ{priceText ? ` ${priceText.trim()}` : ''} สามารถกรองตามราคา จำนวนห้องนอน และดูตำแหน่งบนแผนที่ได้</p>
      <p>มีทรัพย์ใน{place}ที่ต้องการ{p.deal === 'rent' ? 'ปล่อยเช่า' : 'ขาย'}? <a href="/post" style="text-decoration:underline">ลงประกาศฟรี</a> หรือใช้บริการ <a href="/consign" style="text-decoration:underline">ฝากขาย/ฝากเช่า</a> กับ SMILELAND</p>
    </>
  ) : undefined;

  const ld: object[] = [crumbsLd(site(c), crumbs)];
  if (result.items.length) ld.push({
    '@context': 'https://schema.org', '@type': 'ItemList', name: h1,
    itemListElement: result.items.map((x, i) => ({ '@type': 'ListItem', position: i + 1, url: `${site(c)}/listing/${x.id}`, name: x.title })),
  });

  return render(c, {
    title: `${h1}${result.total ? ` (${formatPrice(result.total)} ประกาศ)` : ''}`,
    description, canonical: canonicalPath, noindex: !landing || thin, maps: true, page: 'search', nav: p.deal,
    jsonld: ld,
  }, (
    <SearchPage env={c.env} h1={h1} intro={landing ? `ประกาศ${typeTh}${dealWord}ใน${place} ที่ผ่านการตรวจสอบแล้ว` : undefined}
      crumbs={crumbs} params={p} result={result} provinces={g.provinces}
      districts={prov ? g.districts.filter((x) => x.provinceCode === prov.code) : []}
      subLinks={subLinks} subTitle={subTitle} pageHref={pageHref} seo={seo} />
  ));
}

/* ================= รายละเอียดประกาศ ================= */
pub.get('/listing/:id{[0-9]+}', async (c) => {
  const id = parseInt(c.req.param('id'), 10);
  const l = await getListing(c.env, id);
  if (!l || !['active', 'sold', 'expired'].includes(l.status)) return notFound(c);
  const g = await geo(c.env);
  const prov = g.provinces.find((x) => x.code === l.provinceCode)!;
  const dist = g.districts.find((x) => x.code === l.districtCode)!;
  const [images, tl, prices, sim, sub] = await Promise.all([
    getImages(c.env, id), getTimeline(c.env, id), getPriceHistory(c.env, id),
    l.status === 'active' ? similar(c.env, l) : Promise.resolve([]), subdistrictName(c.env, l.subdistrictCode),
  ]);
  // นับยอดเข้าชม (ไม่นับบอท) แบบไม่หน่วงหน้าเว็บ
  const ua = c.req.header('user-agent') || '';
  if (l.status === 'active' && !/bot|crawl|spider|slurp|preview/i.test(ua)) {
    c.executionCtx.waitUntil(c.env.DB.prepare('UPDATE listings SET views = views + 1 WHERE id = ?').bind(id).run().then(() => undefined));
  }
  const typeTh = TYPES[l.type as PType];
  const dealWord = l.deal === 'rent' ? 'ให้เช่า' : 'ขาย';
  const base = `/${l.deal}/${l.type}`;
  const crumbs: [string, string?][] = [['หน้าแรก', '/'], [`${typeTh}${dealWord}`, base], [prov.nameTh, `${base}/${prov.slug}`], [dist.nameTh, `${base}/${prov.slug}/${dist.slug}`], [l.ref]];
  const cover = images[0] ? imgUrl(c.env, `${images[0].keyBase}:${images[0].ext}`, 1600) : null;
  const size = l.type === 'land' && l.landSqw ? ` ${landText(l.landSqw)}` : l.usableSqm ? ` ${l.usableSqm} ตร.ม.` : '';
  const description = truncate(`${typeTh}${dealWord} ${dist.nameTh} ${prov.nameTh}${size} ราคา ฿${formatPrice(l.price)}${l.deal === 'rent' ? '/เดือน' : ''} — ${l.description}`, 160);
  const url = `${site(c)}/listing/${l.id}`;
  const ld = [
    crumbsLd(site(c), crumbs.slice(0, -1)),
    {
      '@context': 'https://schema.org', '@type': 'RealEstateListing', name: l.title, url, description: truncate(l.description, 500),
      datePosted: new Date((l.approvedAt || l.createdAt) * 1000).toISOString(),
      image: images.slice(0, 6).map((im) => { const u = imgUrl(c.env, `${im.keyBase}:${im.ext}`, 1600)!; return u.startsWith('http') ? u : site(c) + u; }),
      offers: { '@type': 'Offer', price: l.price, priceCurrency: 'THB', availability: l.status === 'active' ? 'https://schema.org/InStock' : 'https://schema.org/SoldOut', businessFunction: l.deal === 'rent' ? 'http://purl.org/goodrelations/v1#LeaseOut' : 'http://purl.org/goodrelations/v1#Sell' },
      contentLocation: {
        '@type': 'Place', name: `${dist.nameTh}, ${prov.nameTh}`,
        address: { '@type': 'PostalAddress', addressLocality: dist.nameTh, addressRegion: prov.nameTh, postalCode: dist.postalCode || undefined, addressCountry: 'TH' },
        ...(l.lat != null ? { geo: { '@type': 'GeoCoordinates', latitude: l.lat, longitude: l.lng } } : {}),
      },
    },
  ];
  return render(c, {
    title: `${l.title} — ${typeTh}${dealWord} ${dist.nameTh} ${prov.nameTh}`, description, canonical: `/listing/${l.id}`,
    noindex: l.status !== 'active' || isDemo(l.ref), ogImage: cover, maps: l.lat != null, turnstile: l.status === 'active' && !isDemo(l.ref), page: 'listing', jsonld: ld,
  }, (
    <ListingPage env={c.env} l={l} images={images} provinceName={prov.nameTh} provinceSlug={prov.slug} districtName={dist.nameTh} districtSlug={dist.slug}
      subdistrictName={sub?.nameTh} timeline={tl} prices={prices} similar={sim} crumbs={crumbs} settings={c.get('settings')} />
  ));
});

/* ================= ลงประกาศ ================= */
pub.get('/post', async (c) => {
  const g = await geo(c.env);
  return render(c, {
    title: 'ลงประกาศขาย/ให้เช่า บ้าน ที่ดิน คอนโด ฟรี', description: 'ลงประกาศขายหรือให้เช่า บ้าน ที่ดิน คอนโด ฟรี ทั่วประเทศ ทีมงานตรวจสอบก่อนเผยแพร่ ไม่เปิดเผยเบอร์โทรเจ้าของบนหน้าเว็บ',
    canonical: '/post', maps: true, turnstile: true, page: 'post', nav: 'post',
  }, <><PostPage env={c.env} provinces={g.provinces} consign={c.req.query('consign') === '1'} /><PostDone /></>);
});

/* ================= ตรวจสถานะ ================= */
pub.get('/status', (c) => render(c, { title: 'ตรวจสถานะประกาศ', canonical: '/status', turnstile: true, nav: 'status', noindex: true }, <StatusPage env={c.env} />));
pub.post('/status', async (c) => {
  const f = await c.req.parseBody();
  const ref = String(f.ref || '').trim().toUpperCase().slice(0, 12);
  const phone = normPhone(String(f.phone || ''));
  const meta: Meta = { title: 'ตรวจสถานะประกาศ', turnstile: true, nav: 'status', noindex: true };
  const ip = clientIp(c);
  if (!sameOrigin(c)) return render(c, meta, <StatusPage env={c.env} ref={ref} error="คำขอไม่ถูกต้อง" />, 400);
  const rl = await rateLimit(c.env, `status:${ip}`, 20, 600);
  if (!rl.ok) return render(c, meta, <StatusPage env={c.env} ref={ref} error="ตรวจสอบบ่อยเกินไป กรุณารอ 10 นาที" />, 429);
  if (!(await verifyTurnstile(c.env, String(f['cf-turnstile-response'] || ''), ip))) return render(c, meta, <StatusPage env={c.env} ref={ref} error="กรุณายืนยันว่าไม่ใช่บอท" />, 400);
  const r = await db(c.env).select().from(listings).where(eq(listings.ref, ref)).limit(1);
  const l = r[0];
  if (!l || l.ownerPhone !== phone) return render(c, meta, <StatusPage env={c.env} ref={ref} error="ไม่พบประกาศ หรือเบอร์โทรไม่ตรงกับที่ลงไว้" />, 404);
  const tl = await getTimeline(c.env, l.id);
  return render(c, meta, <StatusPage env={c.env} ref={ref} result={{ l, timeline: tl }} />);
});

/* ================= จัดการประกาศด้วยลิงก์ลับ ================= */
async function byToken(c: Context<AppEnv>, token: string) {
  if (!/^[A-Za-z0-9_-]{30,60}$/.test(token)) return null;
  const h = await sha256Hex(token);
  const r = await db(c.env).select().from(listings).where(eq(listings.manageTokenHash, h)).limit(1);
  return r[0] ?? null;
}
const manageMeta: Meta = { title: 'จัดการประกาศ', noindex: true, page: 'manage' };
pub.get('/manage/:token', async (c) => {
  const token = c.req.param('token');
  const l = await byToken(c, token);
  if (!l) return notFound(c);
  const [ls, tl] = await Promise.all([
    db(c.env).select().from(leads).where(eq(leads.listingId, l.id)).orderBy(desc(leads.id)).limit(200),
    getTimeline(c.env, l.id),
  ]);
  c.header('Referrer-Policy', 'no-referrer');
  return render(c, manageMeta, <ManagePage l={l} token={token} leads={ls} timeline={tl} msg={c.req.query('ok') ? 'บันทึกเรียบร้อย' : undefined} />);
});
pub.post('/manage/:token', async (c) => {
  const token = c.req.param('token');
  if (!sameOrigin(c)) return c.text('Bad origin', 400);
  const rl = await rateLimit(c.env, `manage:${clientIp(c)}`, 30, 600);
  if (!rl.ok) return c.text('Too many requests', 429);
  const l = await byToken(c, token);
  if (!l) return notFound(c);
  const f = await c.req.parseBody();
  const action = String(f.action || '');
  const d = db(c.env);
  const now = nowSec();
  const ttl = parseInt(c.env.LISTING_TTL_DAYS || '180', 10) * 86400;
  if (action === 'price' && ['active', 'pending'].includes(l.status)) {
    const price = clampInt(f.price, 1, 10_000_000_000);
    if (price && price !== l.price) {
      await d.batch([
        d.update(listings).set({ price, updatedAt: now }).where(eq(listings.id, l.id)),
        d.insert(priceHistory).values({ listingId: l.id, price }),
        d.insert(timeline).values({ listingId: l.id, event: 'price', actor: 'owner', note: `฿${formatPrice(l.price)} → ฿${formatPrice(price)}` }),
      ]);
    }
  } else if (action === 'sold' && l.status === 'active') {
    await d.update(listings).set({ status: 'sold', updatedAt: now }).where(eq(listings.id, l.id));
    await addTimeline(c.env, l.id, 'sold', 'owner');
  } else if (action === 'close' && !['closed', 'sold'].includes(l.status)) {
    await d.update(listings).set({ status: 'closed', updatedAt: now }).where(eq(listings.id, l.id));
    await addTimeline(c.env, l.id, 'closed', 'owner');
  } else if (action === 'renew' && ['active', 'expired'].includes(l.status)) {
    await d.update(listings).set({ status: 'active', expiresAt: now + ttl, updatedAt: now }).where(eq(listings.id, l.id));
    await addTimeline(c.env, l.id, 'renewed', 'owner');
  }
  if (l.status === 'active' || action === 'renew') c.executionCtx.waitUntil(c.env.JOBS.send({ kind: 'sitemap', provinceCode: l.provinceCode }).catch(() => undefined));
  return c.redirect(`/manage/${token}?ok=1`, 303);
});

/* ================= หน้าอื่น ๆ ================= */
pub.get('/consign', async (c) => {
  const g = await geo(c.env);
  return render(c, {
    title: 'บริการฝากขาย ฝากเช่า บ้าน ที่ดิน คอนโด', description: 'ฝากขาย ฝากเช่า บ้าน ที่ดิน คอนโด กับ SMILELAND ทีมงานดูแลการประกาศ คัดกรองผู้สนใจ และประสานนัดชมทรัพย์แทนคุณ ทั่วประเทศ',
    canonical: '/consign', turnstile: true, nav: 'consign', page: 'consign',
  }, <ConsignPage env={c.env} provinces={g.provinces} />);
});
pub.get('/tools', (c) => render(c, {
  title: 'เครื่องมือคำนวณ แปลงหน่วยที่ดิน ค่างวดบ้าน ค่าโอน', description: 'แปลงหน่วยไร่ งาน ตารางวา ตารางเมตร คำนวณค่างวดผ่อนบ้าน และประมาณค่าธรรมเนียมการโอนที่ดิน',
  canonical: '/tools', nav: 'tools', page: 'tools',
}, <ToolsPage />));
pub.get('/provinces', async (c) => {
  const [g, pc] = await Promise.all([geo(c.env), provinceCounts(c.env)]);
  return render(c, { title: 'อสังหาริมทรัพย์ทุกจังหวัด 77 จังหวัด', description: 'ค้นหาบ้าน ที่ดิน คอนโด ขายและให้เช่า แยกตาม 77 จังหวัดทั่วประเทศไทย', canonical: '/provinces' },
    <ProvincesPage provinces={g.provinces} counts={pc} />);
});
pub.get('/privacy', (c) => render(c, { title: 'นโยบายความเป็นส่วนตัว', canonical: '/privacy' }, <PrivacyPage s={c.get('settings')} />));
pub.get('/terms', (c) => render(c, { title: 'ข้อกำหนดการใช้งาน', canonical: '/terms' }, <TermsPage />));
