/** @jsxImportSource hono/jsx */
import type { FC } from 'hono/jsx';
import type { Bindings } from '../../env';
import type { Lead, Listing, Province } from '../../db/schema';
import { Crumbs, Icon, StatusBadge, Turnstile } from '../ui';
import { RegionLinks } from './home';
import { DEALS, TYPES, formatPrice, thaiDate, thaiDateTime, type Deal, type PType } from '../../lib/util';
import { TL_LABEL } from './listing';

/* ---------- ตรวจสถานะ ---------- */
export const StatusPage: FC<{ env: Bindings; error?: string; ref?: string; result?: { l: Listing; timeline: { event: string; note: string | null; createdAt: number }[] } }> = ({ env, error, ref, result }) => (
  <div class="wrap" style="max-width:760px">
    <Crumbs items={[['หน้าแรก', '/'], ['ตรวจสถานะประกาศ']]} />
    <div class="page-head"><h1>ตรวจสถานะประกาศ</h1><p class="muted">กรอกเลขอ้างอิง (เช่น SL-ABC123) และเบอร์โทรที่ใช้ลงประกาศ</p></div>
    <form class="form-card" method="post" action="/status">
      {error && <div class="alert alert-bad">{error}</div>}
      <div class="grid2">
        <div class="field"><label class="req" for="st-ref">เลขอ้างอิง</label><input id="st-ref" class="input" name="ref" required maxlength={12} value={ref || ''} style="text-transform:uppercase" placeholder="SL-XXXXXX" /></div>
        <div class="field"><label class="req" for="st-phone">เบอร์โทร</label><input id="st-phone" class="input" name="phone" required inputmode="tel" maxlength={15} /></div>
      </div>
      <Turnstile env={env} />
      <button class="btn btn-ink" type="submit" style="margin-top:14px"><Icon name="search" /> ตรวจสถานะ</button>
    </form>
    {result && (
      <div class="form-card">
        <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:center">
          <h2 style="margin:0">{result.l.ref}</h2>
          <StatusBadge s={result.l.status} />
        </div>
        <p style="margin:10px 0 4px"><b>{result.l.title}</b></p>
        <p class="muted small">{TYPES[result.l.type as PType]}{DEALS[result.l.deal as Deal]} · ฿{formatPrice(result.l.price)} · ส่งเมื่อ {thaiDate(result.l.createdAt)}</p>
        {result.l.status === 'rejected' && result.l.rejectReason && <div class="alert alert-bad">เหตุผล: {result.l.rejectReason}</div>}
        {result.l.status === 'active' && <a class="btn btn-gold btn-sm" href={`/listing/${result.l.id}`}>ดูประกาศบนเว็บ</a>}
        <h3 style="margin-top:20px;font-size:16px">ความเคลื่อนไหว</h3>
        <ul class="tl">{result.timeline.map((t) => <li><time>{thaiDateTime(t.createdAt)}</time>{TL_LABEL[t.event] || t.event}{t.note ? ` — ${t.note}` : ''}</li>)}</ul>
        <p class="small muted">ต้องการแก้ไขราคาหรือปิดประกาศ ให้ใช้ลิงก์จัดการประกาศที่ได้รับตอนส่งประกาศ</p>
      </div>
    )}
  </div>
);

/* ---------- จัดการประกาศ (เจ้าของ ผ่าน token) ---------- */
export const ManagePage: FC<{ l: Listing; token: string; leads: Lead[]; msg?: string; timeline: { event: string; note: string | null; createdAt: number }[] }> = ({ l, token, leads, msg, timeline }) => (
  <div class="wrap" style="max-width:880px">
    <Crumbs items={[['หน้าแรก', '/'], ['จัดการประกาศ']]} />
    <div class="page-head" style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:center">
      <div><h1 style="margin:0">จัดการประกาศ {l.ref}</h1><p class="muted" style="margin:4px 0 0">{l.title}</p></div>
      <StatusBadge s={l.status} />
    </div>
    {msg && <div class="alert alert-ok">{msg}</div>}
    <div class="grid2" style="gap:20px;align-items:start">
      <div class="form-card">
        <h2>ปรับราคา</h2>
        <form method="post" action={`/manage/${token}`}>
          <input type="hidden" name="action" value="price" />
          <div class="field"><label for="m-price">ราคาใหม่ (บาท{l.deal === 'rent' ? '/เดือน' : ''})</label><input id="m-price" class="input" name="price" inputmode="numeric" data-money value={formatPrice(l.price)} required /></div>
          <button class="btn btn-ink" type="submit" disabled={!['active', 'pending'].includes(l.status)}>บันทึกราคา</button>
        </form>
        <p class="tiny muted" style="margin-top:12px">การปรับราคาจะถูกบันทึกในจดหมายเหตุทรัพย์ (แก้ย้อนหลังไม่ได้)</p>
      </div>
      <div class="form-card">
        <h2>สถานะประกาศ</h2>
        <p class="small muted">หมดอายุ: {thaiDate(l.expiresAt)}</p>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          {l.status === 'active' && <form method="post" action={`/manage/${token}`}><input type="hidden" name="action" value="sold" /><button class="btn btn-gold btn-sm">ปิดการขาย/เช่าแล้ว</button></form>}
          {['active', 'expired'].includes(l.status) && <form method="post" action={`/manage/${token}`}><input type="hidden" name="action" value="renew" /><button class="btn btn-line btn-sm">ต่ออายุประกาศ</button></form>}
          {!['closed', 'sold'].includes(l.status) && <form method="post" action={`/manage/${token}`} data-confirm="ยืนยันปิดประกาศ? ประกาศจะไม่แสดงบนเว็บอีก"><input type="hidden" name="action" value="close" /><button class="btn btn-danger btn-sm">ปิดประกาศ</button></form>}
        </div>
        {l.status === 'active' && <p style="margin-top:14px"><a href={`/listing/${l.id}`} style="text-decoration:underline">ดูหน้าประกาศ →</a></p>}
      </div>
    </div>
    <div class="form-card">
      <h2>ผู้สนใจ ({leads.length})</h2>
      {leads.length === 0 ? <p class="muted">ยังไม่มีผู้ส่งข้อความถึงประกาศนี้</p> : (
        <div class="table-wrap"><table class="t"><thead><tr><th>วันที่</th><th>ชื่อ</th><th>ติดต่อ</th><th>ข้อความ</th></tr></thead><tbody>
          {leads.map((d) => <tr><td class="nowrap">{thaiDateTime(d.createdAt)}</td><td>{d.name}</td><td class="nowrap"><a href={`tel:${d.phone}`}>{d.phone}</a>{d.line ? <div class="tiny muted">LINE: {d.line}</div> : null}</td><td>{d.message}</td></tr>)}
        </tbody></table></div>
      )}
    </div>
    <div class="form-card">
      <h2>จดหมายเหตุ</h2>
      <ul class="tl">{timeline.map((t) => <li><time>{thaiDateTime(t.createdAt)}</time>{TL_LABEL[t.event] || t.event}{t.note ? ` — ${t.note}` : ''}</li>)}</ul>
    </div>
  </div>
);

/* ---------- ฝากขาย ---------- */
export const ConsignPage: FC<{ env: Bindings; provinces: Province[] }> = ({ env, provinces }) => (
  <>
    <section class="hero"><div class="wrap" style="padding-bottom:64px">
      <div class="eyebrow">บริการฝากขาย · ฝากเช่า</div>
      <h1>ให้ SMILELAND <em>ดูแลทรัพย์</em><br />ของคุณแบบครบวงจร</h1>
      <p class="lead">เหมาะสำหรับเจ้าของที่ไม่สะดวกตอบสาย นัดชม หรืออยู่ต่างจังหวัด เราดูแลตั้งแต่ประกาศจนถึงคัดกรองผู้ซื้อ</p>
    </div></section>
    <div class="wrap" style="padding:48px 20px 72px">
      <div class="feature-grid" style="margin-bottom:40px">
        <div class="feature"><div class="num">01</div><h3>ส่งข้อมูลทรัพย์</h3><p>กรอกแบบฟอร์มด้านล่าง ทีมงานโทรกลับเพื่อสอบถามรายละเอียด</p></div>
        <div class="feature"><div class="num">02</div><h3>จัดทำประกาศ</h3><p>เขียนประกาศ จัดภาพ และเผยแพร่บน SMILELAND พร้อมช่องทางอื่น</p></div>
        <div class="feature"><div class="num">03</div><h3>คัดกรองผู้สนใจ</h3><p>รับสายและข้อความแทน คัดเฉพาะผู้ที่สนใจจริงส่งต่อให้คุณ</p></div>
        <div class="feature"><div class="num">04</div><h3>ประสานจนปิดดีล</h3><p>นัดชมทรัพย์ ประสานเอกสาร และการโอนที่สำนักงานที่ดิน</p></div>
      </div>
      <div class="grid2" style="gap:28px;align-items:start">
        <form class="form-card" data-lead-form data-kind="consign">
          <h2>ขอรับบริการฝากขาย/ฝากเช่า</h2>
          <div class="grid2">
            <div class="field"><label class="req" for="c-name">ชื่อ</label><input id="c-name" class="input" name="name" required maxlength={80} /></div>
            <div class="field"><label class="req" for="c-phone">เบอร์โทร</label><input id="c-phone" class="input" name="phone" required inputmode="tel" maxlength={15} /></div>
            <div class="field"><label for="c-line">LINE ID</label><input id="c-line" class="input" name="line" maxlength={60} /></div>
            <div class="field">
              <label for="c-deal">ต้องการ</label>
              <select id="c-deal" class="input" name="meta_deal"><option value="sale">ฝากขาย</option><option value="rent">ฝากเช่า</option></select>
            </div>
            <div class="field">
              <label for="c-type">ประเภททรัพย์</label>
              <select id="c-type" class="input" name="meta_type"><option value="house">บ้าน</option><option value="land">ที่ดิน</option><option value="condo">คอนโด</option></select>
            </div>
            <div class="field">
              <label for="c-prov">จังหวัด</label>
              <select id="c-prov" class="input" name="meta_province"><option value="">เลือกจังหวัด</option>{provinces.map((p) => <option value={p.nameTh}>{p.nameTh}</option>)}</select>
            </div>
          </div>
          <div class="field"><label for="c-msg">รายละเอียดเบื้องต้น</label><textarea id="c-msg" class="input" name="message" maxlength={2000} placeholder="ขนาด ทำเล ราคาที่ต้องการ"></textarea></div>
          <label class="check small"><input type="checkbox" name="consent" required /> <span>ยินยอมให้ติดต่อกลับตาม<a href="/privacy" style="text-decoration:underline">นโยบายความเป็นส่วนตัว</a></span></label>
          <div style="margin:14px 0"><Turnstile env={env} /></div>
          <button class="btn btn-gold btn-lg" type="submit">ส่งข้อมูลให้ทีมงานติดต่อกลับ</button>
          <div class="form-msg" aria-live="polite"></div>
        </form>
        <div class="panel">
          <h3>หรือลงประกาศด้วยตัวเอง</h3>
          <p class="muted">ลงประกาศฟรี แล้วติ๊ก "สนใจบริการฝากขาย" ในขั้นตอนสุดท้าย ทีมงานจะติดต่อกลับเช่นกัน</p>
          <a class="btn btn-ink" href="/post?consign=1">ลงประกาศฟรี</a>
        </div>
      </div>
    </div>
  </>
);

/* ---------- ทุกจังหวัด ---------- */
export const ProvincesPage: FC<{ provinces: Province[]; counts: Map<number, number> }> = ({ provinces, counts }) => (
  <div class="wrap" style="padding-bottom:72px">
    <Crumbs items={[['หน้าแรก', '/'], ['ทุกจังหวัด']]} />
    <div class="page-head"><h1>อสังหาริมทรัพย์ 77 จังหวัดทั่วไทย</h1><p class="muted">เลือกจังหวัดเพื่อดูบ้าน ที่ดิน และคอนโดขาย/ให้เช่า</p></div>
    <div class="form-card"><RegionLinks provinces={provinces} counts={counts} base="/sale/property" /></div>
    <div class="form-card"><h2>ให้เช่า</h2><RegionLinks provinces={provinces} counts={new Map()} base="/rent/property" /></div>
  </div>
);

/* ---------- เครื่องมือ ---------- */
export const ToolsPage: FC = () => (
  <div class="wrap">
    <Crumbs items={[['หน้าแรก', '/'], ['เครื่องมือคำนวณ']]} />
    <div class="page-head"><h1>เครื่องมือคำนวณอสังหาฯ</h1><p class="muted">แปลงหน่วยที่ดิน คำนวณค่างวด และประมาณค่าใช้จ่ายวันโอน</p></div>
    <div class="tool-grid" data-tools>
      <div class="form-card">
        <h2>แปลงหน่วยที่ดิน</h2>
        <div class="grid3" style="grid-template-columns:repeat(3,1fr);gap:0 8px">
          <div class="field"><label>ไร่</label><input class="input" data-u="rai" inputmode="decimal" /></div>
          <div class="field"><label>งาน</label><input class="input" data-u="ngan" inputmode="decimal" /></div>
          <div class="field"><label>ตร.ว.</label><input class="input" data-u="wah" inputmode="decimal" /></div>
        </div>
        <div class="field"><label>หรือ ตารางเมตร</label><input class="input" data-u="sqm" inputmode="decimal" /></div>
        <div class="out" data-out="land">กรอกขนาดเพื่อคำนวณ</div>
        <p class="tiny muted">1 ไร่ = 4 งาน = 400 ตร.ว. = 1,600 ตร.ม. · 1 ตร.ว. = 4 ตร.ม.</p>
      </div>
      <div class="form-card">
        <h2>คำนวณค่างวดผ่อนบ้าน</h2>
        <div class="field"><label>ราคาทรัพย์ (บาท)</label><input class="input" data-m="price" data-money value="3,000,000" /></div>
        <div class="grid3" style="grid-template-columns:repeat(3,1fr);gap:0 8px">
          <div class="field"><label>เงินดาวน์ %</label><input class="input" data-m="down" value="10" inputmode="decimal" /></div>
          <div class="field"><label>ดอกเบี้ย %/ปี</label><input class="input" data-m="rate" value="6" inputmode="decimal" /></div>
          <div class="field"><label>ระยะ (ปี)</label><input class="input" data-m="years" value="30" inputmode="numeric" /></div>
        </div>
        <div class="out" data-out="mortgage"></div>
        <p class="tiny muted">คำนวณแบบดอกเบี้ยคงที่ลดต้นลดดอก เป็นตัวเลขประมาณการ อัตราจริงขึ้นกับธนาคาร</p>
      </div>
      <div class="form-card">
        <h2>ประมาณค่าใช้จ่ายวันโอน</h2>
        <div class="field"><label>ราคาประเมิน (บาท)</label><input class="input" data-t="appraised" data-money value="2,000,000" /></div>
        <div class="field"><label>ราคาซื้อขาย (บาท)</label><input class="input" data-t="sale" data-money value="2,500,000" /></div>
        <label class="check small" style="margin-bottom:12px"><input type="checkbox" data-t="sbt" /> <span>ผู้ขายถือครองไม่ถึง 5 ปี (เสียภาษีธุรกิจเฉพาะ แทนอากรแสตมป์)</span></label>
        <div class="out" data-out="transfer"></div>
        <p class="tiny muted">ค่าธรรมเนียมโอน 2% ของราคาประเมิน · อากรแสตมป์ 0.5% หรือภาษีธุรกิจเฉพาะ 3.3% ของราคาที่สูงกว่า · ไม่รวมภาษีเงินได้หัก ณ ที่จ่าย และมาตรการลดหย่อนของรัฐที่อาจมีในแต่ละปี — ตรวจสอบกับสำนักงานที่ดินก่อนทำนิติกรรม</p>
      </div>
    </div>
  </div>
);

/* ---------- นโยบาย / ข้อกำหนด ---------- */
const Fill: FC<{ v?: string; label: string }> = ({ v, label }) => (v ? <>{v}</> : <span class="fill">[รอระบุ: {label}]</span>);

export const PrivacyPage: FC<{ s: Record<string, string> }> = ({ s }) => (
  <div class="doc">
    <Crumbs items={[['หน้าแรก', '/'], ['นโยบายความเป็นส่วนตัว']]} />
    <h1>นโยบายความเป็นส่วนตัว</h1>
    <p class="muted">มีผลตั้งแต่วันที่ <Fill v={s.privacy_effective_date} label="วันที่มีผล" /></p>
    <p>SMILELAND ดำเนินการโดย <Fill v={s.company_name} label="ชื่อนิติบุคคล/ผู้ให้บริการ" /> ("เรา") ให้ความสำคัญกับการคุ้มครองข้อมูลส่วนบุคคลตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 (PDPA)</p>
    <h2>1. ข้อมูลที่เราเก็บ</h2>
    <ul>
      <li><b>ผู้ลงประกาศ:</b> ชื่อ เบอร์โทร LINE ID อีเมล เลขที่โฉนด (ถ้าระบุ) ข้อมูลและรูปภาพทรัพย์ ตำแหน่งที่ปักหมุด</li>
      <li><b>ผู้สนใจทรัพย์/ขอรับบริการ:</b> ชื่อ เบอร์โทร LINE ID ข้อความ</li>
      <li><b>ข้อมูลทางเทคนิค:</b> หมายเลข IP (ใช้ชั่วคราวเพื่อป้องกันสแปมและการโจมตี) และข้อมูลการใช้งานเว็บไซต์</li>
    </ul>
    <h2>2. วัตถุประสงค์</h2>
    <ul>
      <li>ตรวจสอบและเผยแพร่ประกาศ ติดต่อกลับ และประสานระหว่างผู้ซื้อ/ผู้เช่ากับผู้ลงประกาศ</li>
      <li>ป้องกันการฉ้อโกง สแปม และการใช้งานที่ผิดกฎหมาย (รวมถึงการตรวจสอบด้วย Cloudflare Turnstile)</li>
      <li>ปรับปรุงบริการและวิเคราะห์การใช้งานแบบไม่ระบุตัวตน</li>
    </ul>
    <h2>3. การเปิดเผยข้อมูล</h2>
    <p>เราไม่แสดงเบอร์โทร อีเมล และเลขที่โฉนดของผู้ลงประกาศบนหน้าเว็บสาธารณะ ข้อมูลของผู้สนใจจะส่งให้ผู้ลงประกาศของทรัพย์นั้นเพื่อการติดต่อกลับเท่านั้น เราใช้ผู้ให้บริการโครงสร้างพื้นฐาน (Cloudflare) ในการจัดเก็บและประมวลผลข้อมูล ซึ่งอาจตั้งอยู่นอกประเทศไทย</p>
    <h2>4. ระยะเวลาเก็บรักษา</h2>
    <p><Fill v={s.data_retention} label="ระยะเวลาเก็บข้อมูล เช่น เก็บตลอดอายุประกาศและ 1 ปีหลังปิดประกาศ" /></p>
    <h2>5. สิทธิของเจ้าของข้อมูล</h2>
    <p>ท่านมีสิทธิขอเข้าถึง ขอสำเนา แก้ไข ลบ ระงับการใช้ คัดค้าน ขอโอนย้ายข้อมูล และถอนความยินยอม รวมถึงร้องเรียนต่อสำนักงานคณะกรรมการคุ้มครองข้อมูลส่วนบุคคล</p>
    <h2>6. ติดต่อเรา</h2>
    <ul>
      <li>ที่อยู่: <Fill v={s.company_address} label="ที่อยู่" /></li>
      <li>อีเมลเรื่องข้อมูลส่วนบุคคล: <Fill v={s.contact_email} label="อีเมล" /></li>
      <li>โทร: <Fill v={s.contact_phone} label="เบอร์โทร" /> · LINE: <Fill v={s.contact_line} label="LINE ID" /></li>
      <li>เจ้าหน้าที่คุ้มครองข้อมูลส่วนบุคคล (DPO): <Fill v={s.dpo_contact} label="DPO" /></li>
    </ul>
    <h2>7. คุกกี้</h2>
    <p>เว็บไซต์ใช้คุกกี้ที่จำเป็นต่อการทำงานเท่านั้น (เช่น การเข้าสู่ระบบของผู้ดูแล) หากมีการใช้เครื่องมือวิเคราะห์ เราจะขอความยินยอมก่อน</p>
  </div>
);

export const TermsPage: FC = () => (
  <div class="doc">
    <Crumbs items={[['หน้าแรก', '/'], ['ข้อกำหนดการใช้งาน']]} />
    <h1>ข้อกำหนดการใช้งาน</h1>
    <h2>การลงประกาศ</h2>
    <ul>
      <li>ผู้ลงประกาศต้องเป็นเจ้าของ หรือได้รับมอบอำนาจจากเจ้าของทรัพย์ และให้ข้อมูลตามความเป็นจริง</li>
      <li>ห้ามลงประกาศซ้ำ ประกาศเท็จ ใช้รูปภาพที่ไม่มีสิทธิ์ หรือใส่ช่องทางติดต่อในรายละเอียด/รูปภาพ</li>
      <li>SMILELAND มีสิทธิ์ไม่อนุมัติ แก้ไขให้เหมาะสม หรือปิดประกาศที่ขัดข้อกำหนดโดยไม่ต้องแจ้งล่วงหน้า</li>
      <li>ประกาศมีอายุ 180 วัน ต่ออายุได้ผ่านลิงก์จัดการประกาศ</li>
    </ul>
    <h2>ความรับผิดชอบ</h2>
    <p>SMILELAND เป็นพื้นที่ประกาศ ไม่ใช่คู่สัญญาในการซื้อขายหรือเช่า (เว้นแต่ใช้บริการฝากขายตามข้อตกลงแยกต่างหาก) ผู้ใช้ควรตรวจสอบเอกสารสิทธิ์และตัวตนของคู่สัญญาก่อนชำระเงินทุกครั้ง</p>
  </div>
);

export const NotFoundPage: FC = () => (
  <div class="wrap" style="padding:80px 20px;text-align:center">
    <div class="eyebrow" style="justify-content:center">404</div>
    <h1>ไม่พบหน้าที่คุณต้องการ</h1>
    <p class="muted">ประกาศอาจถูกปิดไปแล้ว หรือที่อยู่ลิงก์ไม่ถูกต้อง</p>
    <div style="display:flex;gap:10px;justify-content:center"><a class="btn btn-ink" href="/">หน้าแรก</a><a class="btn btn-line" href="/search">ค้นหาประกาศ</a></div>
  </div>
);
