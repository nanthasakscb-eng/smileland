/** @jsxImportSource hono/jsx */
import type { Child, FC } from 'hono/jsx';
import type { Bindings } from '../../env';
import type { Card, SearchParams } from '../../lib/listings';
import type { District, Province } from '../../db/schema';
import { Cards, Crumbs, Icon, Pager } from '../ui';
import { formatPrice } from '../../lib/util';

export type SubLink = { href: string; label: string; n?: number; on?: boolean };

export const SearchPage: FC<{
  env: Bindings;
  h1: string;
  intro?: string;
  crumbs: [string, string?][];
  params: SearchParams;
  result: { items: Card[]; total: number; page: number; pages: number };
  provinces: Province[];
  districts: District[];
  subLinks?: SubLink[];
  subTitle?: string;
  pageHref: (p: number) => string;
  seo?: Child;
}> = ({ env, h1, intro, crumbs, params, result, provinces, districts, subLinks, subTitle, pageHref, seo }) => (
  <div class="wrap property-search">
    <Crumbs items={crumbs} />
    <div class="page-head property-search-hero">
      <div class="property-search-heading"><span class="property-eyebrow">อีสานน่าอยู่ · ค้นหาที่ของคุณ</span><h1>{h1}</h1>
      {intro && <p class="muted">{intro}</p>}<div class="property-hero-notes"><span><Icon name="pin" /> 20 จังหวัดภาคอีสาน</span><span><Icon name="check" /> ตรวจสอบก่อนเผยแพร่</span></div></div>
      <div class="property-hero-mark" aria-hidden="true"><Icon name="house" /><span>ที่อยู่ใหม่<br/>เรื่องราวบทใหม่</span></div>
    </div>
    <nav class="property-type-tabs" aria-label="เลือกประเภททรัพย์">{[['','ทุกประเภท','list'],['house','บ้าน','house'],['land','ที่ดิน','land'],['condo','คอนโด','condo']].map(([type,label,icon])=><a href={`/search?deal=${params.deal==='rent'?'rent':'sale'}${type?`&type=${type}`:''}${params.province?`&province=${params.province}`:''}`} class={(params.type||'')===type?'is-active':''} aria-current={(params.type||'')===type?'page':undefined}><Icon name={icon}/>{label}</a>)}</nav>
    {subLinks && subLinks.length > 0 && (
      <>
        {subTitle && <div class="small muted">{subTitle}</div>}
        <div class="sub-links">
          {subLinks.map((s) => <a href={s.href} class={s.on ? 'on' : ''}>{s.label}{s.n ? <span class="n">{s.n}</span> : null}</a>)}
        </div>
      </>
    )}
    <div class="layout-search">
      <aside class="filters" id="filters">
        <button type="button" class="btn btn-line btn-block filters-toggle" data-toggle="filters"><Icon name="filter" /> ตัวกรองการค้นหา</button>
        <form class="filters-body" action="/search" method="get" data-filters>
          <div class="property-filter-title"><Icon name="filter"/><h3>ค้นหาให้ตรงใจ</h3></div>
          <div class="field">
            <div class="seg" style="display:flex">
              <label style="flex:1"><input type="radio" name="deal" value="sale" checked={params.deal !== 'rent'} /><span style="text-align:center">ซื้อ</span></label>
              <label style="flex:1"><input type="radio" name="deal" value="rent" checked={params.deal === 'rent'} /><span style="text-align:center">เช่า</span></label>
            </div>
          </div>
          <div class="field">
            <label for="f-type">ประเภททรัพย์</label>
            <select id="f-type" name="type" class="input">
              <option value="">ทุกประเภท</option>
              <option value="house" selected={params.type === 'house'}>บ้าน</option>
              <option value="land" selected={params.type === 'land'}>ที่ดิน</option>
              <option value="condo" selected={params.type === 'condo'}>คอนโด</option>
            </select>
          </div>
          <div class="field">
            <label for="f-prov">จังหวัด</label>
            <select id="f-prov" name="province" class="input" data-province-select="f-dist">
              <option value="">เขตอีสาน</option>
              {provinces.map((p) => <option value={p.code} selected={params.province === p.code}>{p.nameTh}</option>)}
            </select>
          </div>
          <div class="field">
            <label for="f-dist">อำเภอ/เขต</label>
            <select id="f-dist" name="district" class="input" disabled={!params.province}>
              <option value="">ทุกอำเภอ</option>
              {districts.map((d) => <option value={d.code} selected={params.district === d.code}>{d.nameTh}</option>)}
            </select>
          </div>
          <div class="field">
            <label>ราคา (บาท{params.deal === 'rent' ? '/เดือน' : ''})</label>
            <div class="grid2" style="gap:0 10px">
              <input class="input" name="min" inputmode="numeric" placeholder="ต่ำสุด" value={params.min ? String(params.min) : ''} data-money />
              <input class="input" name="max" inputmode="numeric" placeholder="สูงสุด" value={params.max ? String(params.max) : ''} data-money />
            </div>
          </div>
          <div class="field">
            <label for="f-bed">ห้องนอน (ขั้นต่ำ)</label>
            <select id="f-bed" name="bed" class="input">
              <option value="">ไม่ระบุ</option>
              {[1, 2, 3, 4, 5].map((n) => <option value={n} selected={params.bed === n}>{n}+ ห้อง</option>)}
            </select>
          </div>
          <div class="field">
            <label for="f-q">คำค้น</label>
            <input id="f-q" name="q" class="input" value={params.q || ''} placeholder="เช่น ติดถนน, ใกล้ตลาด" maxlength={120} />
          </div>
          <input type="hidden" name="sort" value={params.sort || ''} />
          <button class="btn btn-ink btn-block" type="submit"><Icon name="search" /> ค้นหา</button>
          <a href="/search" class="btn btn-ghost btn-block btn-sm" style="margin-top:6px">ล้างตัวกรอง</a>
        </form>
      </aside>
      <section class="property-results" aria-label="ผลการค้นหาอสังหาริมทรัพย์">
        <div class="results-bar">
          <div class="count"><span class="property-result-label">ผลการค้นหา</span><strong>{formatPrice(result.total)}</strong> ประกาศ</div>
          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
            <button type="button" class="btn btn-line btn-sm" data-map-toggle><Icon name="map" /> <span>แสดงแผนที่</span></button>
            <select class="input" style="width:auto" data-sort aria-label="เรียงลำดับ">
              <option value="">แนะนำ</option>
              <option value="new" selected={params.sort === 'new'}>ใหม่ล่าสุด</option>
              <option value="price-asc" selected={params.sort === 'price-asc'}>ราคาต่ำ → สูง</option>
              <option value="price-desc" selected={params.sort === 'price-desc'}>ราคาสูง → ต่ำ</option>
              <option value="size" selected={params.sort === 'size'}>ขนาดใหญ่สุด</option>
            </select>
          </div>
        </div>
        <div class="map-box hidden" id="results-map" aria-label="แผนที่ประกาศ"></div>
        {result.items.length ? <Cards env={env} items={result.items} /> : (
          <div class="empty property-empty">
            <div class="property-empty-art" aria-hidden="true"><svg viewBox="0 0 300 165" fill="none"><ellipse cx="150" cy="149" rx="124" ry="12" fill="#edf4e5"/><circle cx="228" cy="34" r="18" fill="#e8f4ce"/><path d="M40 145V85l53-43 54 43v60" fill="#f0f7e6" stroke="#9cbd77" stroke-width="2" stroke-linejoin="round"/><path d="m30 91 63-52 64 52" stroke="#568c39" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><path d="M80 145v-39h28v39M57 90h18v18H57M112 90h18v18h-18" fill="white" stroke="#a2bf84" stroke-width="2"/><rect x="160" y="76" width="62" height="69" rx="8" fill="white" stroke="#b6cda1" stroke-width="2"/><path d="M173 93h36M173 106h25M173 119h30" stroke="#d4e4c4" stroke-width="5" stroke-linecap="round"/><circle cx="219" cy="118" r="25" fill="#f6faef" stroke="#76a64b" stroke-width="4"/><path d="m238 138 20 19" stroke="#76a64b" stroke-width="7" stroke-linecap="round"/><path d="M44 144c-16-18-14-38-14-38s21 8 20 29M265 145v-25m0 7c-14-15-11-28-11-28s20 9 11 28m0 9c13-15 25-15 25-15s-2 18-25 20" stroke="#9fbf7b" stroke-width="2" fill="#e7f1d9"/></svg></div>
            <h3>ยังไม่พบประกาศที่ตรงกับเงื่อนไข</h3>
            <p class="muted">ลองเลือกจังหวัดใกล้เคียง หรือปรับตัวกรองอีกนิด<br/>ที่ที่ใช่ อาจอยู่ในการค้นหาครั้งถัดไป</p>
            <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
              <a class="btn btn-line" href="/search">ดูประกาศทั้งหมด</a>
              <a class="btn btn-gold" href="/post">ลงประกาศในพื้นที่นี้</a>
            </div>
          </div>
        )}
        {!result.items.length && <div class="property-help"><span class="property-help-icon"><Icon name="chat"/></span><div><h3>มีทรัพย์อยากปล่อยขายหรือให้เช่า?</h3><p>ลงประกาศฟรี หรือให้ทีมงานช่วยดูแลผ่านบริการฝากขาย / ฝากเช่า</p></div><a href="/consign">ดูบริการของเรา <Icon name="arrow"/></a></div>}
        <Pager page={result.page} pages={result.pages} href={pageHref} />
        {seo && <div class="seo-text">{seo}</div>}
      </section>
    </div>
  </div>
);
