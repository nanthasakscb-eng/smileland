/** @jsxImportSource hono/jsx */
import type { FC } from 'hono/jsx';
import type { Bindings } from '../../env';
import type { Province } from '../../db/schema';
import { Crumbs, Icon, Turnstile } from '../ui';
import { DEED_TYPES, FEATURES, ZONING } from '../../lib/util';

const MAX_IMAGES = 12;

export const PostPage: FC<{ env: Bindings; provinces: Province[]; consign?: boolean; me?: { name: string; phone: string | null; line: string | null; email: string } }> = ({ env, provinces, consign, me }) => (
  <div class="wrap">
    <Crumbs items={[['หน้าแรก', '/'], ['ลงประกาศฟรี']]} />
    <div class="page-head">
      <h1>ลงประกาศขาย/ให้เช่า ฟรี</h1>
      <p class="muted">กรอกข้อมูลให้ครบถ้วน ทีมงานจะตรวจสอบภายใน 24 ชั่วโมง (วันทำการ) ก่อนเผยแพร่ เบอร์โทรและเลขโฉนดของคุณจะไม่แสดงบนหน้าเว็บ</p>
    </div>
    <div class="form-shell">
      <ol class="steps">
        <li><a href="#s-kind">ประเภทประกาศ</a></li>
        <li><a href="#s-detail">รายละเอียดทรัพย์</a></li>
        <li><a href="#s-location">ทำเลที่ตั้ง</a></li>
        <li><a href="#s-photos">รูปภาพ</a></li>
        <li><a href="#s-contact">ข้อมูลติดต่อ</a></li>
      </ol>
      <form id="post-form" novalidate data-max-images={MAX_IMAGES}>
        <section class="form-card" id="s-kind">
          <h2>1. ประเภทประกาศ</h2>
          <div class="field">
            <label>ต้องการ</label>
            <div class="seg">
              <label><input type="radio" name="deal" value="sale" checked /><span>ขาย</span></label>
              <label><input type="radio" name="deal" value="rent" /><span>ให้เช่า</span></label>
            </div>
          </div>
          <div class="field">
            <label>ประเภททรัพย์</label>
            <div class="type-pick">
              <label><input type="radio" name="type" value="house" checked /><div class="tp"><Icon name="house" /><b>บ้าน</b><span class="tiny muted">บ้านเดี่ยว ทาวน์โฮม</span></div></label>
              <label><input type="radio" name="type" value="land" /><div class="tp"><Icon name="land" /><b>ที่ดิน</b><span class="tiny muted">ที่ดินเปล่า สวน นา</span></div></label>
              <label><input type="radio" name="type" value="condo" /><div class="tp"><Icon name="condo" /><b>คอนโด</b><span class="tiny muted">ห้องชุด อพาร์ตเมนต์</span></div></label>
            </div>
          </div>
          <div class="field" style="margin:0">
            <label>คุณคือ</label>
            <div class="chips">
              <label class="chip"><input type="radio" name="posterRole" value="owner" checked /><span>เจ้าของทรัพย์</span></label>
              <label class="chip"><input type="radio" name="posterRole" value="agent" /><span>นายหน้า/ตัวแทน</span></label>
            </div>
          </div>
        </section>

        <section class="form-card" id="s-detail">
          <h2>2. รายละเอียดทรัพย์</h2>
          <div class="field">
            <label class="req" for="p-title">หัวข้อประกาศ</label>
            <input id="p-title" class="input" name="title" required minlength={10} maxlength={120} placeholder="เช่น ขายบ้านเดี่ยว 2 ชั้น 3 ห้องนอน ใกล้ ม.อุบลฯ" />
            <div class="hint">10–120 ตัวอักษร ระบุจุดเด่นและทำเล</div>
          </div>
          <div class="grid2">
            <div class="field">
              <label class="req" for="p-price"><span data-deal-label="sale">ราคาขาย (บาท)</span><span data-deal-label="rent" hidden>ค่าเช่า (บาท/เดือน)</span></label>
              <input id="p-price" class="input" name="price" required inputmode="numeric" data-money placeholder="0" />
              <div class="hint" data-price-words></div>
            </div>
            <div class="field" data-for="land house">
              <label>ขนาดที่ดิน</label>
              <div class="grid3" style="gap:0 8px;grid-template-columns:repeat(3,1fr)">
                <input class="input" name="landRai" inputmode="decimal" placeholder="ไร่" aria-label="ไร่" />
                <input class="input" name="landNgan" inputmode="decimal" placeholder="งาน" aria-label="งาน" />
                <input class="input" name="landWah" inputmode="decimal" placeholder="ตร.ว." aria-label="ตารางวา" />
              </div>
              <div class="hint" data-land-total></div>
            </div>
          </div>
          <div class="grid4" data-for="house condo">
            <div class="field"><label for="p-bed">ห้องนอน</label><input id="p-bed" class="input" name="bedrooms" inputmode="numeric" maxlength={2} /></div>
            <div class="field"><label for="p-bath">ห้องน้ำ</label><input id="p-bath" class="input" name="bathrooms" inputmode="numeric" maxlength={2} /></div>
            <div class="field"><label for="p-sqm">พื้นที่ใช้สอย (ตร.ม.)</label><input id="p-sqm" class="input" name="usableSqm" inputmode="decimal" /></div>
            <div class="field" data-for="house"><label for="p-floors">จำนวนชั้น</label><input id="p-floors" class="input" name="floors" inputmode="numeric" maxlength={2} /></div>
            <div class="field" data-for="house condo"><label for="p-park">ที่จอดรถ (คัน)</label><input id="p-park" class="input" name="parking" inputmode="numeric" maxlength={2} /></div>
          </div>
          <div class="grid3" data-for="condo">
            <div class="field"><label for="p-proj">ชื่อโครงการ</label><input id="p-proj" class="input" name="projectName" maxlength={120} /></div>
            <div class="field"><label for="p-floorno">ชั้นที่</label><input id="p-floorno" class="input" name="floorNo" inputmode="numeric" maxlength={3} /></div>
            <div class="field"><label for="p-fee">ค่าส่วนกลาง (บาท/เดือน)</label><input id="p-fee" class="input" name="commonFee" inputmode="numeric" data-money /></div>
          </div>
          <div class="grid3" data-for="land house">
            <div class="field">
              <label for="p-deed">เอกสารสิทธิ์</label>
              <select id="p-deed" class="input" name="deedType"><option value="">ไม่ระบุ</option>{Object.entries(DEED_TYPES).map(([k, v]) => <option value={k}>{v}</option>)}</select>
            </div>
            <div class="field" data-for="land"><label for="p-front">หน้ากว้าง (เมตร)</label><input id="p-front" class="input" name="frontageM" inputmode="decimal" /></div>
            <div class="field" data-for="land">
              <label for="p-zone">ผังเมือง</label>
              <select id="p-zone" class="input" name="zoningColor"><option value="">ไม่ระบุ</option>{Object.entries(ZONING).map(([k, v]) => <option value={k}>{v}</option>)}</select>
            </div>
          </div>
          <div class="grid3" data-deal-only="rent" hidden>
            <div class="field"><label for="p-dep">เงินประกัน (เดือน)</label><input id="p-dep" class="input" name="depositMonths" inputmode="numeric" maxlength={2} /></div>
            <div class="field"><label for="p-min">สัญญาขั้นต่ำ (เดือน)</label><input id="p-min" class="input" name="minContractMonths" inputmode="numeric" maxlength={3} /></div>
            <div class="field" data-for="house condo">
              <label for="p-furn">เฟอร์นิเจอร์</label>
              <select id="p-furn" class="input" name="furnished"><option value="">ไม่ระบุ</option><option value="1">มีเฟอร์นิเจอร์</option><option value="0">ไม่มีเฟอร์นิเจอร์</option></select>
            </div>
          </div>
          <div class="field">
            <label class="req" for="p-desc">รายละเอียด</label>
            <textarea id="p-desc" class="input" name="description" required minlength={30} maxlength={5000} placeholder="สภาพทรัพย์ การเดินทาง สถานที่ใกล้เคียง เงื่อนไขการขาย/เช่า"></textarea>
            <div class="hint">อย่างน้อย 30 ตัวอักษร · ห้ามใส่เบอร์โทรหรือลิงก์ภายนอกในรายละเอียด</div>
          </div>
          <div class="field" style="margin:0">
            <label>จุดเด่น</label>
            <div class="chips">
              {Object.entries(FEATURES).map(([k, v]) => <label class="chip"><input type="checkbox" name="features" value={k} /><span>{v}</span></label>)}
            </div>
          </div>
        </section>

        <section class="form-card" id="s-location">
          <h2>3. ทำเลที่ตั้ง</h2>
          <div class="grid3">
            <div class="field">
              <label class="req" for="p-prov">จังหวัด</label>
              <select id="p-prov" class="input" name="provinceCode" required data-province-select="p-dist">
                <option value="">เลือกจังหวัด</option>
                {provinces.map((p) => <option value={p.code}>{p.nameTh}</option>)}
              </select>
            </div>
            <div class="field">
              <label class="req" for="p-dist">อำเภอ/เขต</label>
              <select id="p-dist" class="input" name="districtCode" required disabled data-district-select="p-sub"><option value="">เลือกอำเภอ</option></select>
            </div>
            <div class="field">
              <label for="p-sub">ตำบล/แขวง</label>
              <select id="p-sub" class="input" name="subdistrictCode" disabled><option value="">เลือกตำบล</option></select>
            </div>
          </div>
          <div class="field">
            <label for="p-addr">ถนน / ซอย / จุดสังเกต</label>
            <input id="p-addr" class="input" name="addressNote" maxlength={160} placeholder="เช่น ถ.ชยางกูร ใกล้แยกไฟแดง (ไม่ต้องใส่บ้านเลขที่)" />
          </div>
          <div class="field" style="margin:0">
            <label>ปักหมุดตำแหน่งทรัพย์ <span class="muted small">(ไม่บังคับ แต่ช่วยให้คนหาเจอบนแผนที่)</span></label>
            <div class="pin-tools">
              <button type="button" class="btn btn-gold" data-geolocate><Icon name="pin" /> ปักหมุดตรงที่ฉันอยู่ตอนนี้ (GPS)</button>
              <div class="pin-paste">
                <input class="input" data-gmap-input placeholder="หรือวางลิงก์ Google Maps / พิกัด เช่น 15.2448, 104.8473" inputmode="url" />
                <button type="button" class="btn btn-ink" data-gmap-apply>ใช้ตำแหน่งนี้</button>
              </div>
            </div>
            <div class="pick-map-wrap">
              <div class="pick-map" id="pick-map"></div>
              <div class="pick-hint" data-pick-hint>แตะบนแผนที่เพื่อปักหมุด · ลากหมุดเพื่อปรับตำแหน่ง</div>
            </div>
            <div class="pin-status" data-pin-status>
              <span data-latlng-text>ยังไม่ได้ปักหมุด — เลือกอำเภอ/ตำบลด้านบน แผนที่จะเลื่อนไปให้อัตโนมัติ</span>
              <button type="button" class="btn btn-ghost btn-sm" data-pin-clear hidden>ลบหมุด</button>
            </div>
            <input type="hidden" name="lat" /><input type="hidden" name="lng" />
          </div>
        </section>

        <section class="form-card" id="s-photos">
          <h2>4. รูปภาพ</h2>
          <p class="muted">สูงสุด {MAX_IMAGES} รูป ถ่ายจากกล้องมือถือได้เลย ระบบย่อรูปให้อัตโนมัติก่อนอัปโหลด รูปแรกจะเป็นรูปปก (แตะรูปเพื่อตั้งเป็นปก)</p>
          <div class="photo-actions">
            <label class="photo-btn photo-cam">
              <input type="file" accept="image/*" capture="environment" data-file-input data-camera />
              <Icon name="camera" class="ico" />
              <b>ถ่ายรูป</b>
              <span>เปิดกล้องมือถือ</span>
            </label>
            <label class="photo-btn">
              <input type="file" accept="image/*" multiple data-file-input />
              <Icon name="image" class="ico" />
              <b>เลือกรูปจากเครื่อง</b>
              <span>เลือกได้หลายรูปพร้อมกัน</span>
            </label>
          </div>
          <div class="dropzone" data-dropzone>
            <span class="tiny muted">หรือลากไฟล์รูปมาวางตรงนี้ (คอมพิวเตอร์)</span>
          </div>
          <div class="photo-count tiny muted" data-photo-count></div>
          <div class="thumbs" data-thumbs></div>
        </section>

        <section class="form-card" id="s-contact">
          <h2>5. ข้อมูลติดต่อ <span class="badge b-active" style="font-family:var(--font)">ไม่แสดงบนเว็บ</span></h2>
          <p class="muted">ดึงจากบัญชีของคุณ แก้ไขสำหรับประกาศนี้ได้ · ติดตามสถานะและผู้สนใจได้ที่ <a href="/account" style="text-decoration:underline">บัญชีของฉัน</a></p>
          <div class="grid2">
            <div class="field"><label class="req" for="p-name">ชื่อผู้ลงประกาศ</label><input id="p-name" class="input" name="ownerName" required maxlength={80} autocomplete="name" value={me?.name || ''} /></div>
            <div class="field"><label class="req" for="p-phone">เบอร์โทร</label><input id="p-phone" class="input" name="ownerPhone" required inputmode="tel" maxlength={15} autocomplete="tel" placeholder="08xxxxxxxx" value={me?.phone || ''} /></div>
            <div class="field"><label for="p-line">LINE ID</label><input id="p-line" class="input" name="ownerLine" maxlength={60} value={me?.line || ''} /></div>
            <div class="field"><label for="p-email">อีเมล</label><input id="p-email" class="input" name="ownerEmail" type="email" maxlength={120} autocomplete="email" value={me?.email || ''} readonly={!!me} /></div>
          </div>
          <div class="field" data-for="land house">
            <label for="p-deedno">เลขที่โฉนด <span class="muted small">(ไม่บังคับ · เก็บเป็นความลับ ใช้ตรวจสอบเท่านั้น)</span></label>
            <input id="p-deedno" class="input" name="deedNo" maxlength={40} />
          </div>
          <label class="check" style="margin-bottom:12px"><input type="checkbox" name="consign" value="1" checked={consign} /> <span>สนใจบริการ <b>ฝากขาย/ฝากเช่า</b> ให้ทีม SMILELAND ช่วยดูแลประกาศและคัดกรองผู้สนใจ</span></label>
          <label class="check"><input type="checkbox" name="consent" value="1" required /> <span>ข้าพเจ้ายืนยันว่าข้อมูลเป็นความจริง มีสิทธิ์ประกาศทรัพย์นี้ และยินยอมตาม<a href="/terms" target="_blank" style="text-decoration:underline">ข้อกำหนด</a>และ<a href="/privacy" target="_blank" style="text-decoration:underline">นโยบายความเป็นส่วนตัว</a></span></label>
          <div style="margin-top:16px"><Turnstile env={env} /></div>
        </section>

        <div class="submit-bar">
          <div style="flex:1;min-width:220px">
            <div class="form-msg small" aria-live="polite"></div>
            <div class="progress" data-progress><i></i></div>
          </div>
          <button class="btn btn-gold btn-lg" type="submit">ส่งประกาศเพื่อตรวจสอบ</button>
        </div>
      </form>
    </div>
  </div>
);

export const PostDone: FC = () => (
  <template id="post-done">
    <div class="form-card result-box">
      <div style="width:64px;height:64px;border-radius:50%;background:var(--ok-bg);color:var(--ok);display:flex;align-items:center;justify-content:center;margin:0 auto 12px"><Icon name="check" class="ico" /></div>
      <h2 style="justify-content:center">ส่งประกาศเรียบร้อย</h2>
      <p class="muted">เลขอ้างอิงประกาศของคุณ</p>
      <div class="ref-code" data-ref></div>
      <p>ทีมงานจะตรวจสอบภายใน 24 ชั่วโมง (วันทำการ) ตรวจสถานะได้ที่ <a href="/status" style="text-decoration:underline">หน้าตรวจสถานะ</a> ด้วยเลขอ้างอิง + เบอร์โทร</p>
      <div class="alert alert-warn" style="text-align:left">
        <b>ลิงก์จัดการประกาศ (เก็บไว้เป็นความลับ)</b> — ใช้ปรับราคา ปิดการขาย หรือดูผู้สนใจ ระบบจะแสดงลิงก์นี้ครั้งเดียว
        <div class="copy-box"><input class="input" readonly data-manage /><button class="btn btn-ink btn-sm" type="button" data-copy>คัดลอก</button></div>
      </div>
      <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap">
        <a class="btn btn-line" href="/">กลับหน้าแรก</a>
        <a class="btn btn-ink" href="/account">ไปที่บัญชีของฉัน</a>
        <a class="btn btn-gold" href="/post">ลงประกาศอีกรายการ</a>
      </div>
    </div>
  </template>
);
