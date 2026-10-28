/** @jsxImportSource hono/jsx */
import type { Child, FC } from 'hono/jsx';
import { raw } from 'hono/html';
import type { Bindings, UserSession } from '../env';
import { isDemo, DEALS, TYPES, formatPrice, landText, type Deal, type PType } from '../lib/util';
import { imgUrl, imgSrcset, placeholder, type Card } from '../lib/listings';
import { travelProvinces, provinceTravelHref } from '../data/travel-provinces';
import { PronetMenu } from './pronet-menu';

export const ASSET_V = '20261028-line';

/* ---------- icons ---------- */
const P = { fill: 'none', stroke: 'currentColor', 'stroke-width': '1.7', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' } as const;
export const Icon: FC<{ name: string; class?: string }> = ({ name, class: cls = 'ico' }) => {
  const paths: Record<string, Child> = {
    pin: <><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Z" /><circle cx="12" cy="9.5" r="2.5" /></>,
    bed: <><path d="M3 18V7M3 13h18v5M21 18v-5a3 3 0 0 0-3-3h-7v4" /><circle cx="7" cy="10.5" r="1.8" /></>,
    bath: <><path d="M4 12h16v3a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4v-3ZM6 12V6a2 2 0 0 1 3.5-1.3" /><path d="M7 19l-1 2M17 19l1 2" /></>,
    area: <><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" /></>,
    camera: <><path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z" /><circle cx="12" cy="13.5" r="3.5" /></>,
    image: <><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="8.5" cy="10" r="1.5" /><path d="m21 16-5-5-8 8" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>,
    map: <><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2ZM9 4v14M15 6v14" /></>,
    list: <><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></>,
    phone: <><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z" /></>,
    mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></>,
    chat: <><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z" /></>,
    check: <><path d="m5 12 5 5 9-10" /></>,
    shield: <><path d="M12 3 4 6v6c0 5 3.4 8.3 8 9 4.6-.7 8-4 8-9V6l-8-3Z" /><path d="m9 12 2 2 4-4" /></>,
    house: <><path d="M3 11 12 4l9 7M5 10v10h14V10M10 20v-6h4v6" /></>,
    land: <><path d="M3 18c3-2 6-2 9 0s6 2 9 0M3 14c3-2 6-2 9 0s6 2 9 0" /><path d="M8 11V4l3 1.5L8 7" /></>,
    condo: <><path d="M5 21V4h9v17M14 21V9h5v12M3 21h18M8 7h3M8 10h3M8 13h3M8 16h3" /></>,
    menu: <><path d="M4 7h16M4 12h16M4 17h16" /></>,
    filter: <><path d="M4 5h16l-6 7v6l-4 2v-8L4 5Z" /></>,
    share: <><circle cx="18" cy="5" r="2.5" /><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="19" r="2.5" /><path d="m8.2 10.8 7.6-4.6M8.2 13.2l7.6 4.6" /></>,
    eye: <><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></>,
    doc: <><path d="M14 3H6v18h12V7l-4-4Z" /><path d="M14 3v4h4M9 13h6M9 17h6" /></>,
    arrow: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
    star: <><path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z" /></>,
  };
  return <svg class={cls} viewBox="0 0 24 24" {...P} aria-hidden="true">{paths[name] ?? null}</svg>;
};

export const TypeIcon: FC<{ type: string }> = ({ type }) => <Icon name={type} />;

/* ---------- layout ---------- */
export type Meta = {
  title: string;
  description?: string;
  canonical?: string;
  noindex?: boolean;
  ogImage?: string | null;
  jsonld?: object | object[];
  page?: string; // data-page สำหรับ JS
  nav?: string;
  head?: Child;
  maps?: boolean;
  turnstile?: boolean;
};

export const Brand: FC<{ sub?: boolean }> = ({ sub = true }) => (
  <a href="/" class="brand" aria-label="อีสานน่าอยู่ หน้าแรก">
    <img src="/assets/img/logo.svg" class="brand-mark" alt="" width="38" height="38" />
    <span>
      <span class="brand-name">อีสานน่าอยู่</span>
      {sub && <span class="brand-sub">บ้าน · ที่ดิน · คอนโด เขตอีสาน</span>}
    </span>
  </a>
);

export const Layout: FC<{ env: Bindings; meta: Meta; settings: Record<string, string>; user?: UserSession; children?: Child }> = ({ env, meta, settings, user, children }) => {
  const site = env.SITE_URL.replace(/\/$/, '');
  const title = meta.title.includes('อีสานน่าอยู่') ? meta.title : `${meta.title} | อีสานน่าอยู่`;
  const canonical = meta.canonical ? (meta.canonical.startsWith('http') ? meta.canonical : site + meta.canonical) : undefined;
  const og = meta.ogImage ? (meta.ogImage.startsWith('http') ? meta.ogImage : site + meta.ogImage) : site + '/assets/img/og.png';
  const ld = meta.jsonld ? (Array.isArray(meta.jsonld) ? meta.jsonld : [meta.jsonld]) : [];
  const navs: [string, string, string][] = [['sale', '/sale/property', 'ซื้อ'], ['rent', '/rent/property', 'เช่า'], ['consign', '/consign', 'ฝากขาย/ฝากเช่า'], ['travel', '/travel/', 'เที่ยวอีสานกัน'], ['guide', '/guide', 'คู่มือ'], ['tools', '/tools', 'เครื่องมือ']];
  return (
    <>
      {raw('<!doctype html>')}
      <html lang="th">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>{title}</title>
          {meta.description && <meta name="description" content={meta.description} />}
          {canonical && <link rel="canonical" href={canonical} />}
          <meta name="robots" content={meta.noindex ? 'noindex, follow' : 'index, follow, max-image-preview:large'} />
          <meta property="og:type" content="website" />
          <meta property="og:site_name" content="อีสานน่าอยู่" />
          <meta property="og:locale" content="th_TH" />
          <meta property="og:title" content={title} />
          {meta.description && <meta property="og:description" content={meta.description} />}
          {canonical && <meta property="og:url" content={canonical} />}
          <meta property="og:image" content={og} />
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="theme-color" content="#8dc63f" />
          {settings.google_site_verification && <meta name="google-site-verification" content={settings.google_site_verification} />}
          {settings.bing_site_verification && <meta name="msvalidate.01" content={settings.bing_site_verification} />}
          <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
          <link rel="preload" href="/assets/fonts/sarabun-thai-400-normal.woff2" as="font" type="font/woff2" crossorigin="" />
          <link rel="stylesheet" href={`/assets/css/fonts.css?v=${ASSET_V}`} />
          <link rel="stylesheet" href={`/assets/css/site.css?v=${ASSET_V}`} />
          {meta.maps && <link rel="stylesheet" href="/assets/vendor/maplibre/maplibre-gl.css" />}
          {meta.head}
          <link rel="stylesheet" href={`/assets/css/meadow.css?v=${ASSET_V}`} />
          <link rel="stylesheet" href={`/assets/css/pronet-menu.css?v=${ASSET_V}`} />
          <link rel="stylesheet" href={`/assets/css/property-search.css?v=${ASSET_V}`} />
          {ld.map((j) => <script type="application/ld+json">{raw(JSON.stringify(j).replace(/</g, '\\u003c'))}</script>)}
        </head>
        <body data-page={meta.page || ''}>
          <div class="topbar">
            <div class="wrap">
              <span>แพลตฟอร์มประกาศอสังหาฯ เขตอีสาน · ลงประกาศฟรี</span>
              <span class="hide-m">
                {settings.contact_line_url ? <a href={settings.contact_line_url} rel="noopener">LINE: {settings.contact_line || 'อีสานน่าอยู่'}</a> : null}
                {settings.contact_phone ? <> · โทร <a href={`tel:${settings.contact_phone}`}>{settings.contact_phone}</a></> : null}
                {!settings.contact_line_url && !settings.contact_phone ? <a href="/status">ตรวจสถานะประกาศ</a> : null}
                {!user ? <> · <a href="/register">สมัครสมาชิก</a></> : null}
              </span>
            </div>
          </div>
          <header class="header">
            <div class="wrap">
              <Brand />
              <button class="menu-btn" type="button" aria-label="เมนู" aria-expanded="false" data-menu><Icon name="menu" /></button>
              <nav class="nav" id="nav">
                {navs.map(([k, href, label]) => k === 'travel' ? <details class="travel-nav"><summary class={meta.nav === k ? 'on' : ''}>เที่ยวอีสานกัน <span aria-hidden="true">▾</span></summary><div class="travel-nav-panel"><a class="travel-nav-all" href="/travel/">ดูบทความทั้งหมด →</a><div class="travel-nav-provinces">{travelProvinces.map(([name, slug]) => <a href={provinceTravelHref(slug)}>{name}<small>10 ที่เที่ยว</small></a>)}</div></div></details> : <a href={href} class={meta.nav === k ? 'on' : ''}>{label}</a>)}
                {user ? <a href="/account" class={meta.nav === 'account' ? 'on' : ''}>บัญชีของฉัน{!user.verified ? ' ⚠' : ''}</a> : <a href="/login" class={meta.nav === 'login' ? 'on' : ''}>เข้าสู่ระบบ</a>}
                <a href="/post" class="btn btn-gold btn-sm">+ ลงประกาศฟรี</a>
              </nav>
            </div>
          </header>
          <main>{children}</main>
          <Footer settings={settings} />
          <PronetMenu />
          {meta.maps && <script src="/assets/vendor/maplibre/maplibre-gl.js" defer></script>}
          {meta.turnstile && <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>}
          <script src={`/assets/js/app.js?v=${ASSET_V}`} defer></script>
          {meta.nav === 'travel' && <script src={`/assets/js/travel-provinces.js?v=${ASSET_V}`} defer></script>}
        </body>
      </html>
    </>
  );
};

export const Footer: FC<{ settings: Record<string, string> }> = ({ settings }) => (
  <footer class="footer">
    <div class="wrap">
      <div class="footer-grid">
        <div>
          <Brand />
          <p>แพลตฟอร์มประกาศขายและให้เช่า บ้าน ที่ดิน คอนโด ในเขตอีสาน ลงประกาศฟรี ตรวจสอบประกาศก่อนเผยแพร่ทุกรายการ</p>
          {settings.contact_email && <p class="small">อีเมล: <a href={`mailto:${settings.contact_email}`}>{settings.contact_email}</a></p>}
        </div>
        <div>
          <h4>ซื้อ</h4>
          <ul>
            <li><a href="/sale/house">บ้านขาย</a></li>
            <li><a href="/sale/land">ที่ดินขาย</a></li>
            <li><a href="/sale/condo">คอนโดขาย</a></li>
            <li><a href="/sale/property">อสังหาฯ ขายทั้งหมด</a></li>
          </ul>
        </div>
        <div>
          <h4>เช่า</h4>
          <ul>
            <li><a href="/rent/house">บ้านให้เช่า</a></li>
            <li><a href="/rent/land">ที่ดินให้เช่า</a></li>
            <li><a href="/rent/condo">คอนโดให้เช่า</a></li>
            <li><a href="/rent/property">อสังหาฯ ให้เช่าทั้งหมด</a></li>
          </ul>
        </div>
        <div>
          <h4>บริการ</h4>
          <ul>
            <li><a href="/post">ลงประกาศฟรี</a></li>
            <li><a href="/register">สมัครสมาชิก</a> · <a href="/account">บัญชีของฉัน</a></li>
            <li><a href="/consign">ฝากขาย / ฝากเช่า</a></li>
            <li><a href="/status">ตรวจสถานะประกาศ</a></li>
            <li><a href="/tools">เครื่องมือคำนวณ</a></li>
            <li><a href="/guide">คู่มือซื้อขายบ้าน-ที่ดิน</a></li>
            <li><a href="/articles">บทความความรู้ที่ดิน</a></li>
            <li><a href="/provinces">ทุกจังหวัด</a></li>
          </ul>
        </div>
      </div>
      <div class="footer-bottom">
        <span>© {new Date().getFullYear()} อีสานน่าอยู่ · สงวนลิขสิทธิ์</span>
        <span><a href="/privacy">นโยบายความเป็นส่วนตัว</a> · <a href="/terms">ข้อกำหนดการใช้งาน</a> · <a href="/credits">เครดิตภาพ</a></span>
      </div>
    </div>
  </footer>
);

/* ---------- listing card ---------- */
export const ListingCard: FC<{ env: Bindings; l: Card; eager?: boolean }> = ({ env, l, eager }) => {
  const src = imgUrl(env, l.coverKey, 800) || placeholder(l.type);
  return (
    <a class="card" href={`/listing/${l.id}`} data-id={l.id} data-lat={l.lat ?? ''} data-lng={l.lng ?? ''} data-price={l.price} data-deal={l.deal}>
      <div class="card-media">
        <img src={src} srcset={imgSrcset(env, l.coverKey)} sizes="(max-width: 640px) 100vw, 320px" alt={l.title} loading={eager ? 'eager' : 'lazy'} decoding="async" width="400" height="300" />
        <div class="badges">
          <span class={`badge b-${l.deal}`}>{DEALS[l.deal as Deal]}</span>
          <span class="badge b-type">{TYPES[l.type as PType]}</span>
          {l.featured ? <span class="badge b-feat">แนะนำ</span> : null}
          {isDemo(l.ref) ? <span class="badge b-demo">ตัวอย่าง</span> : null}
        </div>
        {l.imageCount > 1 && <span class="count"><Icon name="image" class="ico" /> {l.imageCount}</span>}
      </div>
      <div class="card-body">
        <div class="price">฿{formatPrice(l.price)}{l.deal === 'rent' && <small> /เดือน</small>}</div>
        <div class="card-title">{l.title}</div>
        <div class="loc"><Icon name="pin" /> {l.districtName}{l.provinceName ? `, ${l.provinceName}` : ''}</div>
        <CardSpecs l={l} />
      </div>
    </a>
  );
};

export const CardSpecs: FC<{ l: Pick<Card, 'type' | 'landSqw' | 'usableSqm' | 'bedrooms' | 'bathrooms'> }> = ({ l }) => {
  const items: Child[] = [];
  if (l.type === 'land' && l.landSqw) items.push(<span><Icon name="area" /> {landText(l.landSqw)}</span>);
  if (l.type !== 'land') {
    if (l.bedrooms != null) items.push(<span><Icon name="bed" /> {l.bedrooms} นอน</span>);
    if (l.bathrooms != null) items.push(<span><Icon name="bath" /> {l.bathrooms} น้ำ</span>);
    if (l.usableSqm) items.push(<span><Icon name="area" /> {formatPrice(l.usableSqm)} ตร.ม.</span>);
    if (l.type === 'house' && l.landSqw && !l.usableSqm) items.push(<span><Icon name="area" /> {landText(l.landSqw)}</span>);
  }
  if (!items.length) return null;
  return <div class="specs">{items}</div>;
};

export const Cards: FC<{ env: Bindings; items: Card[] }> = ({ env, items }) => (
  <div class="cards">{items.map((l, i) => <ListingCard env={env} l={l} eager={i < 3} />)}</div>
);

export const Crumbs: FC<{ items: [string, string?][] }> = ({ items }) => (
  <nav class="crumbs" aria-label="breadcrumb">
    {items.map(([label, href], i) => (
      <>
        {i > 0 && <span class="sep">/</span>}
        {href ? <a href={href}>{label}</a> : <span>{label}</span>}
      </>
    ))}
  </nav>
);

export function crumbsLd(site: string, items: [string, string?][]) {
  return {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: items.map(([name, href], i) => ({ '@type': 'ListItem', position: i + 1, name, ...(href ? { item: site + href } : {}) })),
  };
}

export const Pager: FC<{ page: number; pages: number; href: (p: number) => string }> = ({ page, pages, href }) => {
  if (pages <= 1) return null;
  const nums = new Set<number>([1, pages, page - 1, page, page + 1, page - 2, page + 2]);
  const list = [...nums].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b);
  const out: Child[] = [];
  if (page > 1) out.push(<a href={href(page - 1)} rel="prev">‹ ก่อนหน้า</a>);
  let prev = 0;
  for (const n of list) {
    if (n - prev > 1) out.push(<span>…</span>);
    out.push(n === page ? <span class="on">{n}</span> : <a href={href(n)}>{n}</a>);
    prev = n;
  }
  if (page < pages) out.push(<a href={href(page + 1)} rel="next">ถัดไป ›</a>);
  return <nav class="pager" aria-label="หน้า">{out}</nav>;
};

export const Turnstile: FC<{ env: Bindings }> = ({ env }) => (
  <div class="cf-turnstile" data-sitekey={env.TURNSTILE_SITE_KEY} data-language="th" data-theme="light"></div>
);

export const StatusBadge: FC<{ s: string }> = ({ s }) => {
  const m: Record<string, string> = { pending: 'รอตรวจสอบ', active: 'เผยแพร่แล้ว', rejected: 'ไม่อนุมัติ', sold: 'ปิดการขาย/เช่าแล้ว', expired: 'หมดอายุ', closed: 'ปิดประกาศ' };
  return <span class={`badge b-${s}`}>{m[s] || s}</span>;
};
