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
  <div class="wrap">
    <Crumbs items={crumbs} />
    <div class="page-head">
      <h1>{h1}</h1>
      {intro && <p class="muted">{intro}</p>}
    </div>
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
          <h3>ตัวกรอง</h3>
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
              <option value="">ทั่วประเทศ</option>
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
      <section>
        <div class="results-bar">
          <div class="count">พบ <b>{formatPrice(result.total)}</b> ประกาศ</div>
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
          <div class="empty">
            <h3>ยังไม่พบประกาศที่ตรงกับเงื่อนไข</h3>
            <p class="muted">ลองขยายพื้นที่ ปรับช่วงราคา หรือเปลี่ยนคำค้น</p>
            <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
              <a class="btn btn-line" href="/search">ดูประกาศทั้งหมด</a>
              <a class="btn btn-gold" href="/post">ลงประกาศในพื้นที่นี้</a>
            </div>
          </div>
        )}
        <Pager page={result.page} pages={result.pages} href={pageHref} />
        {seo && <div class="seo-text">{seo}</div>}
      </section>
    </div>
  </div>
);
