/** @jsxImportSource hono/jsx */
import { travelProvinces } from '../../data/travel-provinces';
import { travelSummaries } from '../../lib/travel';
export const TravelPage = () => <div class="ubon-travel">
  <section class="ut-hub-hero"><div class="wrap"><p class="ut-kicker">อีสานน่าอยู่ · บันทึกการเดินทาง</p><h1>เที่ยวสานกัน</h1><p>ออกไปเที่ยว แล้วรู้จักอีสานให้มากขึ้น</p><p class="ut-hub-sub">ครบ 20 จังหวัดภาคอีสาน · 200 สถานที่แนะนำ<br/>เลือกจังหวัดที่อยากไป แล้วเริ่มวางแผนทริปของคุณ</p></div></section>
  <div class="wrap ut-hub-body"><div class="ut-hub-heading"><div><p class="ut-kicker">EXPLORE OUR ISAN</p><h2>ทุกจังหวัดมีเรื่องราวให้ค้นพบ</h2></div><span data-travel-count>20 บทความ · จังหวัดละ 10 ที่เที่ยว</span></div>
    <section class="ut-province-selector" aria-label="เลือกจังหวัดท่องเที่ยว"><a href="/travel/" data-province-choice="all" class="selected">ทุกจังหวัด<small>20 บทความ</small></a>{travelProvinces.map(([name,slug])=><a href={`#province-${slug}`} data-province-choice={slug} data-province-name={name}>{name}<small>10 ที่เที่ยวแนะนำ</small></a>)}</section>
    <div class="ut-hub-grid" data-travel-result aria-live="polite">{travelSummaries.map(p=><article class="ut-hub-entry" data-travel-province={p.slug}>
      <a class="ut-hub-card" href={`/travel/${p.slug}/`}>
        {p.photo ? <img src={p.photo.image} alt={`${p.photo.placeName || p.name} จังหวัด${p.name}`} width="1200" height="800" loading="lazy"/> : <div class="ut-hub-art" aria-hidden="true"><span>เที่ยวสานกัน</span><b>{p.name}</b><small>10 จุดหมายในจังหวัด</small></div>}
        <div><span class="ut-kicker">{p.name} · 10 ที่เที่ยวแนะนำ</span><h2>{p.subtitle}</h2><p>{p.intro.slice(0,160)}{p.intro.length>160?'…':''}</p><span class="ut-hub-read">อ่านบทความและดูแผนที่ ↗</span></div>
      </a>
      {p.photo && <p class="ut-hub-credit">ภาพ{p.photo.placeName ? ` ${p.photo.placeName}` : `บรรยากาศจังหวัด${p.name}`}: <a href={p.photo.source} target="_blank" rel="noopener noreferrer">{p.photo.artist}</a> · <a href={p.photo.licenseUrl} target="_blank" rel="noopener noreferrer">{p.photo.license}</a> · จัดกรอบภาพ{p.photo.license.includes('BY-SA') ? ' · ภาพที่จัดกรอบใช้ใบอนุญาตเดียวกับต้นฉบับ' : ''}</p>}
    </article>)}</div>
    <p class="ut-hub-note">ลำดับสถานที่เป็นการคัดเลือกเพื่อแนะนำ ไม่ใช่การจัดอันดับอย่างเป็นทางการ ตรวจประกาศเปิดและข้อมูลล่าสุดจากผู้ดูแลก่อนออกเดินทาง</p>
  </div>
</div>;
