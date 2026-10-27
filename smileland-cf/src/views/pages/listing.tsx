/** @jsxImportSource hono/jsx */
import type { Child, FC } from 'hono/jsx';
import type { Bindings } from '../../env';
import type { Listing } from '../../db/schema';
import type { Card } from '../../lib/listings';
import { imgUrl } from '../../lib/listings';
import { Cards, Crumbs, Icon, Turnstile } from '../ui';
import { isDemo, DEALS, DEED_TYPES, FEATURES, TYPES, ZONING, formatPrice, landText, pricePerUnit, thaiDate, type Deal, type PType } from '../../lib/util';

type Img = { keyBase: string; ext: string };

export const ListingPage: FC<{
  env: Bindings; l: Listing; images: Img[]; provinceName: string; provinceSlug: string; districtName: string; districtSlug: string;
  subdistrictName?: string | null; timeline: { event: string; note: string | null; createdAt: number }[];
  prices: { price: number; changedAt: number }[]; similar: Card[]; crumbs: [string, string?][]; settings: Record<string, string>;
}> = ({ env, l, images, provinceName, districtName, subdistrictName, timeline, prices, similar, crumbs, settings }) => {
  const cover = (i: Img, s: 400 | 800 | 1600) => imgUrl(env, `${i.keyBase}:${i.ext}`, s)!;
  let features: string[] = [];
  try { features = JSON.parse(l.features || '[]'); } catch { /* ignore */ }
  const ppu = pricePerUnit(l);
  const n = images.length;
  const facts: [string, Child][] = [];
  facts.push(['รหัสประกาศ', l.ref]);
  facts.push(['ประเภท', `${TYPES[l.type as PType]}${DEALS[l.deal as Deal]}`]);
  if (l.landSqw) facts.push(['ขนาดที่ดิน', landText(l.landSqw)]);
  if (l.landSqw && l.type === 'land') facts.push(['ตารางวารวม', `${formatPrice(l.landSqw)} ตร.ว.`]);
  if (l.usableSqm) facts.push([l.type === 'condo' ? 'ขนาดห้อง' : 'พื้นที่ใช้สอย', `${formatPrice(l.usableSqm)} ตร.ม.`]);
  if (l.bedrooms != null) facts.push(['ห้องนอน', `${l.bedrooms} ห้อง`]);
  if (l.bathrooms != null) facts.push(['ห้องน้ำ', `${l.bathrooms} ห้อง`]);
  if (l.floors) facts.push(['จำนวนชั้น', `${l.floors} ชั้น`]);
  if (l.parking != null && l.type !== 'land') facts.push(['ที่จอดรถ', `${l.parking} คัน`]);
  if (l.projectName) facts.push(['โครงการ', l.projectName]);
  if (l.floorNo) facts.push(['ชั้นที่', String(l.floorNo)]);
  if (l.commonFee) facts.push(['ค่าส่วนกลาง', `${formatPrice(l.commonFee)} บาท/เดือน`]);
  if (l.deedType) facts.push(['เอกสารสิทธิ์', DEED_TYPES[l.deedType] || l.deedType]);
  if (l.frontageM) facts.push(['หน้ากว้าง', `${l.frontageM} ม.`]);
  if (l.zoningColor) facts.push(['ผังเมือง', ZONING[l.zoningColor] || l.zoningColor]);
  if (l.deal === 'rent') {
    if (l.depositMonths != null) facts.push(['เงินประกัน', `${l.depositMonths} เดือน`]);
    if (l.minContractMonths) facts.push(['สัญญาขั้นต่ำ', `${l.minContractMonths} เดือน`]);
    if (l.furnished != null) facts.push(['เฟอร์นิเจอร์', l.furnished ? 'มีเฟอร์นิเจอร์' : 'ไม่มีเฟอร์นิเจอร์']);
  }
  facts.push(['ผู้ลงประกาศ', l.posterRole === 'agent' ? 'นายหน้า/ตัวแทน' : 'เจ้าของทรัพย์']);
  facts.push(['เผยแพร่เมื่อ', thaiDate(l.approvedAt || l.createdAt)]);

  const location = [subdistrictName, districtName, provinceName].filter(Boolean).join(', ');
  const demo = isDemo(l.ref);
  const closed = l.status !== 'active' || demo;
  return (
    <div class="wrap">
      <Crumbs items={crumbs} />
      {demo && <div class="alert alert-info" style="margin-top:14px"><b>ประกาศตัวอย่าง</b> — สร้างขึ้นเพื่อแสดงหน้าตาเว็บไซต์ ไม่ใช่ทรัพย์จริง ภาพเป็นภาพจำลอง 3 มิติ และไม่รับการติดต่อ</div>}
      {!demo && closed && <div class="alert alert-warn" style="margin-top:14px">ประกาศนี้ไม่ได้เผยแพร่แล้ว ({l.status === 'sold' ? 'ปิดการขาย/เช่าแล้ว' : 'ปิดประกาศ'})</div>}
      <div class={`gallery n${Math.min(Math.max(n, 1), 5)}`} data-gallery>
        {n === 0 ? (
          <a href="#" aria-label="ไม่มีรูปภาพ"><img src={`/assets/img/ph-${l.type}.svg`} alt={l.title} /></a>
        ) : images.slice(0, 5).map((im, i) => (
          <a href={cover(im, 1600)} data-full={cover(im, 1600)} data-i={i}>
            <img src={cover(im, i === 0 ? 1600 : 800)} alt={`${l.title} รูปที่ ${i + 1}`} loading={i === 0 ? 'eager' : 'lazy'} fetchpriority={i === 0 ? 'high' : undefined} />
            {i === 4 && n > 5 && <span class="more">+{n - 5} รูป</span>}
          </a>
        ))}
        {images.slice(5).map((im, i) => <a hidden href={cover(im, 1600)} data-full={cover(im, 1600)} data-i={i + 5}></a>)}
      </div>

      <div class="detail">
        <article>
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px">
            <span class={`badge b-${l.deal}`}>{DEALS[l.deal as Deal]}</span>
            <span class="badge b-type" style="border:1px solid var(--line)">{TYPES[l.type as PType]}</span>
            {l.featured ? <span class="badge b-feat">แนะนำ</span> : null}
            {demo ? <span class="badge b-demo">ตัวอย่าง</span> : null}
            {l.posterRole === 'owner' ? <span class="badge b-active">เจ้าของลงเอง</span> : null}
          </div>
          <h1>{l.title}</h1>
          <div class="loc" style="font-size:15px"><Icon name="pin" /> {l.addressNote ? `${l.addressNote}, ` : ''}{location}</div>
          <div class="price-row">
            <span class="price">฿{formatPrice(l.price)}{l.deal === 'rent' && <small> /เดือน</small>}</span>
            {ppu && <span class="muted">≈ {ppu}</span>}
          </div>

          <dl class="facts">{facts.map(([k, v]) => <div><dt>{k}</dt><dd>{v}</dd></div>)}</dl>

          <h2 style="font-size:22px">รายละเอียด</h2>
          <div class="prose">{l.description}</div>

          {features.length > 0 && (
            <>
              <h2 style="font-size:22px;margin-top:28px">จุดเด่น</h2>
              <div class="tags">{features.map((f) => <span class="tag">✓ {FEATURES[f] || f}</span>)}</div>
            </>
          )}

          {l.lat != null && l.lng != null && (
            <>
              <h2 style="font-size:22px;margin-top:32px">ตำแหน่งที่ตั้ง</h2>
              <p class="small muted">ตำแหน่งโดยประมาณตามที่ผู้ลงประกาศระบุ</p>
              <div class="detail-map" data-map-point={`${l.lat},${l.lng}`} data-label={l.title}></div>
            </>
          )}

          <h2 style="font-size:22px;margin-top:32px">จดหมายเหตุทรัพย์</h2>
          <p class="small muted">บันทึกความเคลื่อนไหวของประกาศแบบต่อท้าย แก้ไขย้อนหลังไม่ได้</p>
          <ul class="tl">
            {prices.length > 1 && prices.map((p, i) => i > 0 ? <li><time>{thaiDate(p.changedAt)}</time>ปรับราคาเป็น ฿{formatPrice(p.price)} (เดิม ฿{formatPrice(prices[i - 1].price)})</li> : null)}
            {timeline.filter((t) => !['price', 'zone', 'featured', 'unfeatured', 'resubmitted', 'rejected'].includes(t.event)).map((t) => <li><time>{thaiDate(t.createdAt)}</time>{TL_LABEL[t.event] || t.event}{t.note && t.event !== 'rejected' ? ` — ${t.note}` : ''}</li>)}
          </ul>
        </article>

        <aside class="side">
          <div class="panel">
            <div class="price">฿{formatPrice(l.price)}{l.deal === 'rent' && <small> /เดือน</small>}</div>
            <p class="small muted" style="margin:4px 0 16px">รหัส {l.ref}</p>
            {closed ? <p class="muted">{demo ? 'ประกาศตัวอย่าง — ไม่รับการติดต่อ' : 'ประกาศนี้ปิดแล้ว ไม่รับการติดต่อ'}</p> : (
              <form data-lead-form data-listing={l.id}>
                <h3>สนใจทรัพย์นี้</h3>
                <p class="small muted">ส่งข้อมูลติดต่อ ทีมงานจะประสานกับผู้ลงประกาศให้ เบอร์ของเจ้าของไม่ถูกเปิดเผยบนเว็บ</p>
                <div class="field"><label class="req" for="ld-name">ชื่อ</label><input id="ld-name" class="input" name="name" required maxlength={80} autocomplete="name" /></div>
                <div class="field"><label class="req" for="ld-phone">เบอร์โทร</label><input id="ld-phone" class="input" name="phone" required inputmode="tel" maxlength={15} autocomplete="tel" /></div>
                <div class="field"><label for="ld-line">LINE ID</label><input id="ld-line" class="input" name="line" maxlength={60} /></div>
                <div class="field"><label for="ld-msg">ข้อความ</label><textarea id="ld-msg" class="input" name="message" maxlength={1000} style="min-height:90px">สนใจ{TYPES[l.type as PType]}{DEALS[l.deal as Deal]} รหัส {l.ref} ขอรายละเอียดเพิ่มเติมครับ/ค่ะ</textarea></div>
                <label class="check small"><input type="checkbox" name="consent" required /> <span>ยินยอมให้ อีสานน่าอยู่ ใช้ข้อมูลเพื่อติดต่อกลับเรื่องทรัพย์นี้ ตาม<a href="/privacy" style="text-decoration:underline">นโยบายความเป็นส่วนตัว</a></span></label>
                <div style="margin:14px 0"><Turnstile env={env} /></div>
                <button class="btn btn-gold btn-block" type="submit"><Icon name="chat" /> ส่งข้อความถึงผู้ลงประกาศ</button>
                <div class="form-msg" aria-live="polite"></div>
              </form>
            )}
            {settings.contact_line_url && <a class="btn btn-line btn-block" style="margin-top:10px" href={settings.contact_line_url} rel="noopener">สอบถามทาง LINE OA</a>}
          </div>
          <div class="panel">
            <h3 style="font-size:16px">แชร์ประกาศนี้</h3>
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              <a class="btn btn-line btn-sm" data-share="line" href="#">LINE</a>
              <a class="btn btn-line btn-sm" data-share="facebook" href="#">Facebook</a>
              <button class="btn btn-line btn-sm" data-share="copy" type="button">คัดลอกลิงก์</button>
            </div>
            <p class="tiny muted" style="margin:14px 0 0"><Icon name="eye" class="ico" /> เข้าชม {formatPrice(l.views)} ครั้ง</p>
          </div>
          <div class="panel small">
            <h3 style="font-size:16px"><Icon name="shield" /> ข้อควรระวัง</h3>
            <p class="muted" style="margin:0">ตรวจสอบเอกสารสิทธิ์ที่สำนักงานที่ดินก่อนโอนเงินทุกครั้ง ไม่โอนเงินมัดจำก่อนเห็นทรัพย์จริง</p>
          </div>
        </aside>
      </div>

      {similar.length > 0 && (
        <section style="padding-bottom:64px">
          <div class="section-head"><div><h2>ประกาศใกล้เคียงใน{provinceName}</h2></div></div>
          <Cards env={env} items={similar} />
        </section>
      )}
      <div class="lightbox" data-lightbox>
        <button class="lb-close" type="button" aria-label="ปิด">✕</button>
        <button class="lb-prev" type="button" aria-label="ก่อนหน้า">‹</button>
        <img alt="" />
        <button class="lb-next" type="button" aria-label="ถัดไป">›</button>
        <div class="lb-count"></div>
      </div>
    </div>
  );
};

export const TL_LABEL: Record<string, string> = {
  submitted: 'ส่งประกาศเข้าระบบ', approved: 'ผ่านการตรวจสอบและเผยแพร่', rejected: 'ไม่ผ่านการตรวจสอบ', price: 'ปรับราคา',
  sold: 'ปิดการขาย/เช่าแล้ว', closed: 'ปิดประกาศ', expired: 'ประกาศหมดอายุ', renewed: 'ต่ออายุประกาศ', edited: 'แก้ไขรายละเอียด',
  featured: 'ตั้งเป็นประกาศแนะนำ', unfeatured: 'ยกเลิกประกาศแนะนำ', reopened: 'เปิดประกาศอีกครั้ง',
  resubmitted: 'แก้ไขและส่งตรวจอีกครั้ง', zone: 'จัดตำแหน่งแสดงผล', deleted: 'ผู้โพสต์ลบประกาศ',
};
