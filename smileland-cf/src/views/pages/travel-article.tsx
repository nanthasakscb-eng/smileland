/** @jsxImportSource hono/jsx */
import { travelPhoto, travelKindNames, travelKindTips, travelSummaries, type TravelArticle, type TravelPhoto } from '../../lib/travel';

const PhotoCredit = ({ photo }: { photo: TravelPhoto }) => <figcaption>ภาพ: <a href={photo.source} target="_blank" rel="noopener noreferrer">{photo.artist}</a> · <a href={photo.licenseUrl} target="_blank" rel="noopener noreferrer">{photo.license}</a> · จัดกรอบภาพเพื่อแสดงผล{photo.license.includes('BY-SA') ? ' · ภาพที่จัดกรอบใช้ใบอนุญาตเดียวกับต้นฉบับ' : ''}{photo.placeName ? ` · ${photo.placeName}` : ''}</figcaption>;

export const TravelAds = () => <section class="ut-ads" aria-label="พื้นที่โฆษณาสำหรับร้านค้า"><div class="ut-section-label">พื้นที่โฆษณา · สำหรับธุรกิจท้องถิ่น</div><div class="ut-ad-grid">{[1,2].map(n=><a class={`ut-ad ut-ad-${n}`} href="#advertise"><span class="ut-ad-number">AD SPACE 0{n}</span><div><b>{n===1?'ร้านอร่อย ที่พักดี':'พื้นที่นี้สำหรับธุรกิจคุณ'}</b><p>{n===1?'ให้คนกำลังวางแผนเที่ยว ได้รู้จักร้านคุณ':'เข้าถึงคนเที่ยว คนอยู่ และคนมองหาบ้านในอีสาน'}</p></div><span class="ut-ad-bottom">พื้นที่โฆษณาว่าง · สอบถามการลงโฆษณา ↗</span></a>)}</div></section>;

export const TravelArticlePage = ({ article }: { article: TravelArticle }) => {
  const cover=travelSummaries.find(s=>s.slug===article.slug)?.photo;
  return <div class="ubon-travel ut-story">
    <section class="ut-hub-hero"><div class="wrap"><a class="ut-back" href="/travel/">← เที่ยวสานกัน / เลือกจังหวัดอื่น</a><p class="ut-kicker">อีสานน่าอยู่ · {article.name}</p><h1>10 ที่เที่ยว{article.name}</h1><p>{article.subtitle}</p><a class="ut-story-start" href="#places">เลือกจุดหมายในทริปนี้ ↓</a></div></section>
    <div class="wrap ut-body">
      <div class="ut-meta"><span>บันทึกการเดินทาง · เที่ยวสานกัน</span><span>ตรวจข้อมูลประกอบ 24 ต.ค. 2569 · 10 สถานที่แนะนำ</span></div>
      <div class="ut-intro"><div><p class="ut-kicker">{article.slug.replaceAll('-',' ').toUpperCase()}</p><h2>{article.name}<br />ไปให้รู้จัก แล้วจะอยากกลับมา</h2></div><p>{article.intro}<small>ลำดับเป็นการคัดเลือกของกองบรรณาธิการ ไม่ใช่อันดับความนิยมอย่างเป็นทางการ</small></p></div>
      {cover && <figure class="ut-story-cover"><img src={cover.image} alt={`${cover.placeName || article.name} — ภาพถ่ายจริงจาก Wikimedia Commons`} width="1200" height="800" fetchpriority="high" /><PhotoCredit photo={cover} /></figure>}
      <TravelAds />
      <section class="ut-contents"><div><p class="ut-kicker">PLAN YOUR VISIT</p><h2>อยากเริ่มเที่ยวที่ไหน?</h2></div><div>{article.places.map(([name],i)=><a href={`#place-${i+1}`}><span>{String(i+1).padStart(2,'0')}</span>{name}</a>)}</div></section>
      <div id="places" class="ut-section-heading"><p class="ut-kicker">10 PLACES · {article.name}</p><h2>สิบจุดหมาย เริ่มรู้จัก{article.name}</h2></div>
      <div class="ut-places">{article.places.map(([name,area,kind,text],i)=>{
        const photo=travelPhoto(article.slug,i);
        return <article id={`place-${i+1}`} class={`ut-place${photo ? '' : ' ut-place-text'}`}>
          {photo && <figure><img src={photo.image} alt={`${name} จังหวัด${article.name} — ภาพถ่ายสถานที่จริง`} width="1200" height="800" loading="lazy" /><span class="ut-place-num">{String(i+1).padStart(2,'0')}</span><PhotoCredit photo={photo}/></figure>}
          {!photo && <div class="ut-story-number" aria-hidden="true">{String(i+1).padStart(2,'0')}</div>}
          <div class="ut-place-copy"><p class="ut-place-tag">{travelKindNames[kind]} <span> / {area}</span></p><h2>{name}</h2><p>{text}</p><div class="ut-tip"><b>วางแผนก่อนเดินทาง</b><p>{travelKindTips[kind]}</p></div><div class="ut-place-links"><a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name+' '+article.name)}`} target="_blank" rel="noopener noreferrer">เปิด Google Maps ↗</a><a href="#sources">แหล่งข้อมูลประกอบจังหวัด ↓</a></div></div>
        </article>;
      })}</div>
      <section class="ut-plan"><p class="ut-kicker">MAKE IT YOUR TRIP</p><h2>จัดทริปให้ได้เที่ยว ไม่ใช่แค่ได้ผ่าน</h2><p>{article.planning}</p><small>แผนนี้เป็นข้อเสนอของกองบรรณาธิการ ไม่ใช่กำหนดการทัวร์ ตรวจระยะทาง วันเปิด ค่าธรรมเนียม สภาพอากาศ และประกาศพื้นที่ก่อนเดินทาง โดยเฉพาะป่า น้ำตก และพื้นที่ใกล้ชายแดน</small></section>
      <section class="ut-source-notes ut-editorial-sources" id="sources"><h2>แหล่งข้อมูลประกอบ</h2><p>ข้อมูลพื้นฐานระดับจังหวัดและสถานที่จากแหล่งด้านล่าง คำแนะนำการจัดทริปเป็นเนื้อหาเรียบเรียงของอีสานน่าอยู่ ลิงก์แผนที่เป็นการค้นหาชื่อสถานที่ ควรตรวจจุดหมายอีกครั้งก่อนเริ่มนำทาง</p><ul>{article.sources.map((url,i)=><li><a href={url} target="_blank" rel="noopener noreferrer">{new URL(url).hostname} · แหล่งข้อมูล {i+1} ↗</a></li>)}</ul><p>ใช้เฉพาะภาพ Wikimedia Commons ที่ระบุ CC BY หรือ CC BY-SA พร้อมชื่อผู้ถ่าย ต้นฉบับ ใบอนุญาต และการจัดกรอบ ภาพที่ยังหาไม่ได้ตามเงื่อนไขจะงดแสดง เพื่อไม่ใช้ภาพผิดสถานที่หรือผิดสิทธิ์</p></section>
      <section class="ut-more-provinces"><p class="ut-kicker">KEEP EXPLORING</p><h2>เที่ยวสานกันต่อ จังหวัดไหนดี?</h2><div>{travelSummaries.filter(p=>p.slug!==article.slug).slice(0,6).map(p=><a href={`/travel/${p.slug}/`}>{p.name} ↗</a>)}<a href="/travel/">เลือกทุกจังหวัด →</a></div></section>
      <section id="advertise" class="ut-ad-contact"><div><p class="ut-kicker">GROW WITH OUR COMMUNITY</p><h2>มีธุรกิจใน{article.name}?</h2><p>พื้นที่โฆษณา 2 ช่องด้านบนสำหรับร้านค้า ที่พัก และธุรกิจท้องถิ่น</p></div><a href="/consign" class="ut-gold">ติดต่อทีมงาน ↗</a><small>พื้นที่โฆษณาว่าง ยังไม่ได้กำหนดราคาและยังไม่มีผู้ลงโฆษณา</small></section>
      <aside class="ut-own-banner"><img src="/assets/img/logo.svg" alt="" width="64" height="64"/><div><p class="ut-kicker">อีสานน่าอยู่</p><h2>เที่ยวแล้วถูกใจ<br />ลองหาที่อยู่ในอีสาน</h2><p>บ้าน ที่ดิน คอนโด ซื้อ–เช่า เฉพาะ 20 จังหวัดภาคอีสาน</p></div><div class="ut-own-actions"><a class="ut-gold" href="/sale/property">ค้นหาอสังหาฯ ในอีสาน ↗</a><a href="/post">มีทรัพย์ในอีสาน? ลงประกาศฟรี</a></div></aside>
    </div>
  </div>;
};
