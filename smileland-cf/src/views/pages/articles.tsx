import type { FC } from 'hono/jsx';
import { raw } from 'hono/html';
import type { Article } from '../../data/articles';
import { md } from '../../lib/md';
import { Crumbs } from '../ui';

const thDate = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  const M = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
  return `${d} ${M[m - 1]} ${y + 543}`;
};
const cut = (s: string, n = 140) => (s.length > n ? s.slice(0, n).trim() + '…' : s);

export const ArticlesIndexPage: FC<{ items: Article[] }> = ({ items }) => (
  <div class="wrap g-wrap">
    <Crumbs items={[['หน้าแรก', '/'], ['บทความ']]} />
    <header class="g-hero">
      <span class="g-kicker">บทความ · อีสานน่าอยู่</span>
      <h1>บทความจากอีสานน่าอยู่</h1>
      <p>ความรู้เรื่องที่ดิน บ้าน และการซื้อขาย-เช่าในภาคอีสาน เขียนให้อ่านง่าย พร้อมแหล่งอ้างอิง</p>
    </header>
    <section class="g-group">
      <div class="g-grid">
        {items.map((a) => (
          <a class="g-card" href={`/articles/${a.slug}`}>
            <span class="g-kicker">{thDate(a.date)}</span>
            <h3>{a.title}</h3>
            <p>{cut(a.intro)}</p>
            <span class="g-more">อ่านต่อ →</span>
          </a>
        ))}
      </div>
      <p class="g-muted">อ่านเพิ่ม: <a href="/guide">คู่มือซื้อ ขาย เช่า บ้านและที่ดินในอีสาน</a> ครบ 20 จังหวัด</p>
    </section>
  </div>
);

export const ArticlePage: FC<{ a: Article; others: Article[] }> = ({ a, others }) => (
  <div class="wrap g-wrap">
    <Crumbs items={[['หน้าแรก', '/'], ['บทความ', '/articles'], [a.title]]} />
    <article class="g-article">
      <header class="g-head">
        <span class="g-kicker">บทความ · อีสานน่าอยู่</span>
        <h1>{a.title}</h1>
        <p class="g-meta"><time datetime={a.date}>{thDate(a.date)}</time> · อีสานน่าอยู่</p>
      </header>
      <div class="g-body">
        <div class="g-intro"><p>{a.intro}</p></div>
        <div class="g-section">{raw(md(a.body))}</div>
        <section class="g-section g-sources">
          <h2>แหล่งอ้างอิง</h2>
          <ul>{a.sources.map((s) => <li><a href={s.url} target="_blank" rel="noopener noreferrer">{s.title} ↗</a></li>)}</ul>
          <p class="g-muted">ข้อมูลในบทความเป็นข้อมูลทั่วไป ไม่ใช่คำแนะนำทางกฎหมาย ควรตรวจสอบกับสำนักงานที่ดินก่อนทำธุรกรรม</p>
        </section>
        <aside class="g-cta">
          <div><h2>มีบ้านหรือที่ดินในอีสานอยากขาย?</h2><p>ลงประกาศฟรี ทีมงานตรวจก่อนเผยแพร่ ไม่แสดงเบอร์โทรบนหน้าเว็บ</p></div>
          <div class="g-cta-actions"><a class="btn btn-gold" href="/post">+ ลงประกาศฟรี</a><a class="btn btn-line" href="/articles">← บทความทั้งหมด</a></div>
        </aside>
        {others.length > 0 && <p class="g-muted" style="margin-top:20px">อ่านต่อ: {others.map((o, i) => <>{i > 0 && ' · '}<a href={`/articles/${o.slug}`}>{o.title}</a></>)} · <a href="/guide/land-title-deeds">คู่มือเอกสารสิทธิ์ที่ดิน</a></p>}
      </div>
    </article>
  </div>
);
