/** @jsxImportSource hono/jsx */
import type { FC } from 'hono/jsx';
import type { Bindings } from '../../env';
import type { Card } from '../../lib/listings';
import type { Province } from '../../db/schema';
import { Cards, Icon } from '../ui';
import { REGIONS, REGION_ORDER, formatPrice } from '../../lib/util';

/* ภาพสไลด์หน้าแรก — สุ่มลำดับฝั่งเบราว์เซอร์ (assets/js/hero.js) */
const HERO_SLIDES: { src: string; w: number; alt: string; caption: string; credit?: { by: string; url: string; license: string } }[] = [
  { src: '/assets/hero/landmark-ubon', w: 1280, alt: 'วัดสิรินธรวรารามภูพร้าว จังหวัดอุบลราชธานี', caption: 'วัดสิรินธรวรารามภูพร้าว · อุบลราชธานี', credit: { by: 'Supanut Arunoprayote', url: 'https://commons.wikimedia.org/wiki/File:Wat_Sirindhorn_Wararam_Phu_Phrao_20251227_(II).jpg', license: 'CC BY 4.0' } },
  { src: '/assets/hero/estate', w: 1600, alt: 'ถนนในโครงการบ้านเดี่ยว', caption: 'ภาพจำลอง · บ้านเดี่ยวในโครงการ' },
  { src: '/assets/hero/shop', w: 1600, alt: 'อาคารพาณิชย์ 3 ชั้นริมถนน', caption: 'ภาพจำลอง · อาคารพาณิชย์' },
  { src: '/assets/hero/condo_int', w: 1600, alt: 'ห้องนั่งเล่นในคอนโด', caption: 'ภาพจำลอง · ภายในคอนโด' },
];

const HeroSlides: FC = () => (
  <div class="hero-slides" id="hero-slides">
    {HERO_SLIDES.map((h, i) => (
      <figure class="hero-slide">
        <img src={`${h.src}-${h.w}.webp`} srcset={`${h.src}-960.webp 960w, ${h.src}-${h.w}.webp ${h.w}w`} sizes="100vw" alt={h.alt}
          width={h.w} height={Math.round(h.w * 9 / 16)} loading={i === 0 ? 'eager' : 'lazy'} decoding="async" fetchpriority={i === 0 ? 'high' : undefined} />
        <figcaption>{h.caption}{h.credit && <> · ภาพ <a href={h.credit.url} target="_blank" rel="noopener noreferrer">{h.credit.by}</a> / {h.credit.license}</>}</figcaption>
      </figure>
    ))}
  </div>
);

export const SearchPanel: FC<{ provinces: Province[]; deal?: string }> = ({ provinces, deal = 'sale' }) => (
  <form class="search-panel" action="/search" method="get" role="search">
    <div class="seg" role="radiogroup" aria-label="ประเภทประกาศ">
      <label><input type="radio" name="deal" value="sale" checked={deal === 'sale'} /><span>ซื้อ</span></label>
      <label><input type="radio" name="deal" value="rent" checked={deal === 'rent'} /><span>เช่า</span></label>
    </div>
    <div class="row">
      <div>
        <label for="hs-type">ประเภททรัพย์</label>
        <select id="hs-type" name="type" class="input">
          <option value="">ทุกประเภท</option>
          <option value="house">บ้าน</option>
          <option value="land">ที่ดิน</option>
          <option value="condo">คอนโด</option>
        </select>
      </div>
      <div>
        <label for="hs-prov">จังหวัด</label>
        <select id="hs-prov" name="province" class="input">
          <option value="">เขตอีสาน</option>
          {provinces.map((p) => <option value={p.code}>{p.nameTh}</option>)}
        </select>
      </div>
      <div>
        <label for="hs-q">คำค้น</label>
        <input id="hs-q" name="q" class="input" placeholder="เช่น บ้านเดี่ยว ใกล้ ม.อุบล, ที่ดินติดถนน" maxlength={120} />
      </div>
      <button class="btn btn-ink btn-lg" type="submit"><Icon name="search" /> ค้นหา</button>
    </div>
    <div class="quick">
      ค้นหายอดนิยม:
      <a href="/sale/land">ที่ดินขาย</a>
      <a href="/sale/house">บ้านขาย</a>
      <a href="/rent/condo">คอนโดให้เช่า</a>
      <a href="/sale/land/ubon-ratchathani">ที่ดิน อุบลราชธานี</a>
      <a href="/sale/house/khon-kaen">บ้าน ขอนแก่น</a>
    </div>
  </form>
);

export const HomePage: FC<{
  env: Bindings; provinces: Province[]; featured: Card[]; latest: Card[];
  stats: Record<string, number>; pcounts: Map<number, number>;
}> = ({ env, provinces, featured, latest, stats, pcounts }) => (
  <>
    <section class="hero hero-photo">
      <HeroSlides />
      <script src="/assets/js/hero.js?v=1"></script>
      <div class="wrap">
        <div class="eyebrow">อีสานน่าอยู่ · บ้าน ที่ดิน คอนโด</div>
        <h1>บ้าน ที่ดิน คอนโด <em>เขตอีสาน</em><br />ในที่เดียว</h1>
        <p class="lead">ค้นหาทรัพย์ขายและให้เช่าจากเจ้าของและนายหน้าเฉพาะ 20 จังหวัดภาคอีสาน ทุกประกาศผ่านการตรวจสอบก่อนเผยแพร่ ลงประกาศได้ฟรี</p>
        <SearchPanel provinces={provinces} />
        <div class="hero-stats">
          <div><b>{formatPrice(stats.total)}</b><span>ประกาศที่เผยแพร่อยู่</span></div>
          <div><b>20</b><span>จังหวัดภาคอีสาน</span></div>
          <div><b>ค้นหาตามอำเภอ</b><span>เฉพาะพื้นที่ภาคอีสาน</span></div>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="wrap">
        <div class="section-head">
          <div><div class="eyebrow">เลือกตามประเภท</div><h2>คุณกำลังมองหาอะไร</h2></div>
        </div>
        <div class="types">
          {([['house', 'บ้าน', 'บ้านเดี่ยว ทาวน์โฮม บ้านแฝด'], ['land', 'ที่ดิน', 'ที่ดินเปล่า ที่สวน ที่นา ที่ดินติดถนน'], ['condo', 'คอนโด', 'คอนโดมิเนียม อพาร์ตเมนต์ ห้องชุด']] as const).map(([k, label, sub]) => (
            <div class={`type-tile type-tile-${k}`}>
              <span class="type-tile-icon" aria-hidden="true"><Icon name={k}/></span>
              <h3>{label}</h3>
              <p>{sub} · {formatPrice(stats[k] || 0)} ประกาศ</p>
              <div class="links">
                <a href={`/sale/${k}`}>{label}ขาย</a>
                <a href={`/rent/${k}`}>{label}ให้เช่า</a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>

    {featured.length > 0 && (
      <section class="section band">
        <div class="wrap">
          <div class="section-head">
            <div><div class="eyebrow">คัดสรร</div><h2>ประกาศแนะนำ</h2></div>
            <a class="btn btn-line" href="/search">ดูทั้งหมด <Icon name="arrow" /></a>
          </div>
          <Cards env={env} items={featured} />
        </div>
      </section>
    )}

    <section class="section">
      <div class="wrap">
        <div class="section-head">
          <div><div class="eyebrow">อัปเดตล่าสุด</div><h2>ประกาศใหม่</h2><p>ทรัพย์ที่เพิ่งผ่านการตรวจสอบและเผยแพร่</p></div>
          <a class="btn btn-line" href="/search?sort=new">ดูประกาศใหม่ทั้งหมด <Icon name="arrow" /></a>
        </div>
        {latest.length ? <Cards env={env} items={latest} /> : (
          <div class="empty"><h3>ยังไม่มีประกาศ</h3><p class="muted">เป็นคนแรกที่ลงประกาศบน อีสานน่าอยู่</p><a class="btn btn-gold" href="/post">ลงประกาศฟรี</a></div>
        )}
      </div>
    </section>

    <section class="section-tight">
      <div class="wrap">
        <div class="cta">
          <div>
            <div class="eyebrow">บริการฝากขาย · ฝากเช่า</div>
            <h2>มีบ้านหรือที่ดินอยากขาย แต่ไม่มีเวลาดูแลเอง?</h2>
            <p>ส่งข้อมูลทรัพย์ให้ทีม อีสานน่าอยู่ ดูแลการประกาศ คัดกรองผู้สนใจ และประสานนัดชมทรัพย์แทนคุณ</p>
            <a class="btn btn-gold btn-lg" href="/consign">ฝากขาย/ฝากเช่ากับเรา</a>
          </div>
          <ul>
            <li>ถ่ายภาพและเขียนประกาศให้อย่างมืออาชีพ</li>
            <li>ไม่เปิดเผยเบอร์โทรเจ้าของบนหน้าเว็บ</li>
            <li>คัดกรองผู้ซื้อก่อนส่งต่อ ลดสายรบกวน</li>
            <li>ติดตามสถานะได้ด้วยเลขอ้างอิง</li>
          </ul>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="wrap">
        <div class="section-head">
          <div><div class="eyebrow">ทำไมต้อง อีสานน่าอยู่</div><h2>ประกาศที่ไว้ใจได้ ค้นหาง่ายเขตอีสาน</h2></div>
        </div>
        <div class="feature-grid">
          <div class="feature"><div class="num">01</div><h3>ตรวจสอบก่อนเผยแพร่</h3><p>ทีมงานตรวจทุกประกาศ ลดประกาศหลอกและข้อมูลซ้ำซ้อน</p></div>
          <div class="feature"><div class="num">02</div><h3>ค้นหาถึงระดับอำเภอ</h3><p>ค้นหาตามจังหวัดและอำเภอในเขตอีสาน พร้อมแผนที่ตำแหน่งทรัพย์</p></div>
          <div class="feature"><div class="num">03</div><h3>ปกป้องข้อมูลเจ้าของ</h3><p>ไม่แสดงเบอร์โทรและเลขโฉนดบนหน้าเว็บ ผู้สนใจติดต่อผ่านแบบฟอร์ม</p></div>
          <div class="feature"><div class="num">04</div><h3>จดหมายเหตุที่ดิน</h3><p>บันทึกประวัติราคาและความเคลื่อนไหวแบบแก้ย้อนหลังไม่ได้</p></div>
        </div>
      </div>
    </section>

    <section class="section band">
      <div class="wrap">
        <div class="section-head">
          <div><div class="eyebrow">ค้นหาตามพื้นที่</div><h2>อสังหาฯ เขตอีสาน</h2></div>
          <a class="btn btn-line" href="/provinces">ดูทุกจังหวัด <Icon name="arrow" /></a>
        </div>
        <RegionLinks provinces={provinces} counts={pcounts} base="/sale/property" />
      </div>
    </section>
  </>
);

export const RegionLinks: FC<{ provinces: Province[]; counts: Map<number, number>; base: string }> = ({ provinces, counts, base }) => (
  <div class="regions">
    {REGION_ORDER.filter((r) => provinces.some((p) => p.region === r)).map((r) => (
      <div>
        <h3>{REGIONS[r]}</h3>
        <div class="plinks">
          {provinces.filter((p) => p.region === r).map((p) => {
            const n = counts.get(p.code) || 0;
            return <a href={`${base}/${p.slug}`} class={n ? '' : 'dim'}>{p.nameTh}{n ? <span class="n">{n}</span> : null}</a>;
          })}
        </div>
      </div>
    ))}
  </div>
);
