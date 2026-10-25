import type { FC } from 'hono/jsx';
import { raw } from 'hono/html';
import type { Guide } from '../../data/guides';
import { guides, guideBySlug } from '../../data/guides';
import { md } from '../../lib/md';
import { Crumbs } from '../ui';
import { formatPrice } from '../../lib/util';

export type ProvinceStats = { name: string; slug: string; total: number; byType: { key: string; label: string; n: number; median: number | null; href: string }[] } | null;

const thDate = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  const M = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  return `${d} ${M[m - 1]} ${y + 543}`;
};

const Card: FC<{ g: Guide }> = ({ g }) => (
  <a class="g-card" href={`/guide/${g.slug}`}>
    <span class="g-kicker">{g.kicker}</span>
    <h3>{g.title}</h3>
    <p>{g.description}</p>
    <span class="g-more">อ่านคู่มือ →</span>
  </a>
);

export const GuideIndexPage: FC = () => {
  const prov = guides.filter((g) => g.kind === 'province');
  const know = guides.filter((g) => g.kind === 'knowledge');
  return (
    <div class="wrap g-wrap">
      <Crumbs items={[['หน้าแรก', '/'], ['คู่มือซื้อขายบ้าน-ที่ดินอีสาน']]} />
      <header class="g-hero">
        <span class="g-kicker">คู่มือ · อีสานน่าอยู่</span>
        <h1>คู่มือซื้อ ขาย เช่า บ้านและที่ดินในอีสาน</h1>
        <p>ทำเลน่าอยู่รายจังหวัด ค่าโอนและภาษี เอกสารสิทธิ์ที่ดิน และวิธีขายบ้านเอง เขียนให้คนอีสานและคนที่กำลังจะย้ายมาอยู่อีสานอ่านแล้วใช้ได้จริง</p>
      </header>
      <section class="g-group">
        <h2>คู่มือรายจังหวัด</h2>
        <div class="g-grid">{prov.map((g) => <Card g={g} />)}</div>
        <p class="g-muted">จังหวัดอื่นในภาคอีสานกำลังทยอยเขียน ระหว่างนี้ค้นหาทรัพย์ได้ที่ <a href="/provinces">ทุกจังหวัด</a></p>
      </section>
      <section class="g-group">
        <h2>ความรู้ก่อนซื้อขาย</h2>
        <div class="g-grid">{know.map((g) => <Card g={g} />)}</div>
      </section>
    </div>
  );
};

export const GuidePage: FC<{ g: Guide; stats: ProvinceStats }> = ({ g, stats }) => {
  const related = (g.related || []).map(guideBySlug).filter(Boolean) as Guide[];
  return (
    <div class="wrap g-wrap">
      <Crumbs items={[['หน้าแรก', '/'], ['คู่มือ', '/guide'], [g.kicker.replace(/^.*·\s*/, '')]]} />
      <article class="g-article">
        <header class="g-head">
          <span class="g-kicker">{g.kicker}</span>
          <h1>{g.title}</h1>
          <p class="g-meta">โดยทีมงานอีสานน่าอยู่ · อัปเดต {thDate(g.updated)}</p>
        </header>
        <div class="g-layout">
          <div class="g-body">
            <div class="g-intro">{raw(md(g.intro))}</div>
            {stats && (
              <aside class="g-stats" aria-label={`ประกาศบนเว็บใน${stats.name}`}>
                <h2>ประกาศจริงบนอีสานน่าอยู่ ใน{stats.name}</h2>
                {stats.total >= 3 ? (
                  <>
                    <div class="g-stat-grid">
                      {stats.byType.map((t) => (
                        <a href={t.href} class="g-stat"><b>{formatPrice(t.n)}</b><span>{t.label}</span>{t.median ? <small>ราคากลาง ฿{formatPrice(t.median)}</small> : null}</a>
                      ))}
                    </div>
                    <p class="g-muted">นับเฉพาะประกาศจริงที่เผยแพร่อยู่ ไม่รวมประกาศตัวอย่าง · ราคากลางคือค่ามัธยฐานของราคาที่ประกาศ</p>
                  </>
                ) : (
                  <p>ตอนนี้ประกาศจริงใน{stats.name}ยังมีไม่มาก <a href="/post">ลงประกาศฟรี</a> เป็นคนแรก ๆ หรือ <a href={`/sale/property/${stats.slug}`}>ดูประกาศทั้งหมดใน{stats.name}</a></p>
                )}
              </aside>
            )}
            {g.sections.map((s) => (
              <section id={s.id} class="g-section">
                <h2>{s.h}</h2>
                {raw(md(s.body))}
              </section>
            ))}
            {g.faq.length > 0 && (
              <section id="faq" class="g-section g-faq">
                <h2>คำถามที่พบบ่อย</h2>
                {g.faq.map((f) => <details><summary>{f.q}</summary><p>{f.a}</p></details>)}
              </section>
            )}
            <section class="g-section g-sources">
              <h2>แหล่งข้อมูล</h2>
              <ul>{g.sources.map((s) => <li><a href={s.url} target="_blank" rel="noopener noreferrer">{s.title} ↗</a></li>)}</ul>
              <p class="g-muted">ข้อมูลในบทความเป็นข้อมูลทั่วไปเพื่อประกอบการตัดสินใจ ไม่ใช่คำแนะนำทางกฎหมายหรือการเงิน ตัวเลขค่าธรรมเนียมและภาษีให้ยึดตามการคำนวณของสำนักงานที่ดินในวันทำธุรกรรม</p>
            </section>
            <aside class="g-cta">
              <div><h2>มีบ้านหรือที่ดินในอีสานอยากขาย?</h2><p>ลงประกาศฟรี ทีมงานตรวจก่อนเผยแพร่ ไม่แสดงเบอร์โทรบนหน้าเว็บ</p></div>
              <div class="g-cta-actions"><a class="btn btn-gold" href="/post">ลงประกาศฟรี</a><a class="btn btn-line" href="/consign">ฝากขาย/ฝากเช่า</a></div>
            </aside>
          </div>
          <nav class="g-toc" aria-label="สารบัญ">
            <b>ในบทความนี้</b>
            {g.sections.map((s) => <a href={`#${s.id}`}>{s.h}</a>)}
            {g.faq.length > 0 && <a href="#faq">คำถามที่พบบ่อย</a>}
            {related.length > 0 && <><b class="g-toc-rel">อ่านต่อ</b>{related.map((r) => <a href={`/guide/${r.slug}`}>{r.title}</a>)}</>}
          </nav>
        </div>
      </article>
    </div>
  );
};
