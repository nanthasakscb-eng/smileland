/* SMILELAND shared front-end */
const SL = {
  esc: s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])),
  baht: n => '฿' + Math.round(n).toLocaleString('th-TH'),
  wa: l => l.rai * 400 + l.ngan * 100 + l.wa,
  area: l => `${l.rai}-${l.ngan}-${l.wa} ไร่`,
  async get(u) { const r = await fetch(u, { credentials: 'same-origin' }); const j = await r.json().catch(() => ({})); if (!r.ok) throw Object.assign(new Error(j.error || 'โหลดข้อมูลไม่สำเร็จ'), j); return j; },
  card(l, i) {
    const e = SL.esc, ph = l.photos && l.photos[0];
    const st = l.status === 'sold' ? 'ขายแล้ว' : l.status === 'rented' ? 'ให้เช่าแล้ว' : '';
    const unit = l.deal === 'เช่า' ? (l.ptype === 'ที่ดิน' ? '/ปี' : '/เดือน') : '';
    return `<a class="card" href="listing.html?id=${encodeURIComponent(l.id)}"><div class="img v${i % 4}" ${ph ? `style="background-image:url('${e(ph)}')"` : ''} role="img" aria-label="ภาพ${e(l.title)}">
<span class="tag">${e(l.deal)} · ${e(l.ptype)}</span>${l.sample ? '<span class="ex">ข้อมูลตัวอย่าง</span>' : ''}${st ? `<span class="st">${st}</span>` : ''}</div>
<div class="cb"><div class="pr">${SL.baht(l.price)}${unit}</div><h3>${e(l.title)}</h3><div class="mu">📍 ${l.subdistrict?"ต."+e(l.subdistrict)+" ":""}อ.${e(l.district)} จ.${e(l.province)}</div>
<div class="ic2"><span>📐 ${SL.area(l)}</span>${l.deal === 'ขาย' && l.ptype === 'ที่ดิน' ? `<span>${SL.baht(l.price / SL.wa(l))}/ตร.ว.</span>` : ''}<span>${e(l.deed.type)}</span></div><div class="mu">🚗 ${e(l.nearby || '')}</div></div></a>`;
  },
  PROV: 'กรุงเทพมหานคร กระบี่ กาญจนบุรี กาฬสินธุ์ กำแพงเพชร ขอนแก่น จันทบุรี ฉะเชิงเทรา ชลบุรี ชัยนาท ชัยภูมิ ชุมพร เชียงราย เชียงใหม่ ตรัง ตราด ตาก นครนายก นครปฐม นครพนม นครราชสีมา นครศรีธรรมราช นครสวรรค์ นนทบุรี นราธิวาส น่าน บึงกาฬ บุรีรัมย์ ปทุมธานี ประจวบคีรีขันธ์ ปราจีนบุรี ปัตตานี พระนครศรีอยุธยา พะเยา พังงา พัทลุง พิจิตร พิษณุโลก เพชรบุรี เพชรบูรณ์ แพร่ ภูเก็ต มหาสารคาม มุกดาหาร แม่ฮ่องสอน ยโสธร ยะลา ร้อยเอ็ด ระนอง ระยอง ราชบุรี ลพบุรี ลำปาง ลำพูน เลย ศรีสะเกษ สกลนคร สงขลา สตูล สมุทรปราการ สมุทรสงคราม สมุทรสาคร สระแก้ว สระบุรี สิงห์บุรี สุโขทัย สุพรรณบุรี สุราษฎร์ธานี สุรินทร์ หนองคาย หนองบัวลำภู อ่างทอง อำนาจเจริญ อุดรธานี อุตรดิตถ์ อุทัยธานี อุบลราชธานี'.split(' '),
  loan(P, rate, yrs) { const r = rate / 1200, n = yrs * 12; return r ? P * r / (1 - Math.pow(1 + r, -n)) : P / n; },
};
document.addEventListener('DOMContentLoaded', () => {
  const b = document.querySelector('.hamb'), m = document.querySelector('nav.menu');
  if (b) b.onclick = () => { m.classList.toggle('open'); b.setAttribute('aria-expanded', m.classList.contains('open')); };
  document.querySelectorAll('select[data-prov]').forEach(s => { s.innerHTML = '<option value="">เลือกจังหวัด</option>' + SL.PROV.map(p => `<option>${p}</option>`).join(''); });
  // generic submit form (ฝากขาย/ฝากเช่า/ลงประกาศ) -> API
  document.querySelectorAll('form[data-submit]').forEach(f => f.addEventListener('submit', async ev => {
    ev.preventDefault(); const out = f.querySelector('.out'), btn = f.querySelector('button[type=submit]');
    const files = f.querySelector('input[type=file]'); 
    if (files && [...files.files].some(x => x.size > 5 * 1024 * 1024)) { out.innerHTML = '<div class="err">รูปภาพแต่ละไฟล์ต้องไม่เกิน 5MB</div>'; return; }
    btn.disabled = true; btn.textContent = 'กำลังส่ง...';
    try {
      const r = await fetch('/api/submit', { method: 'POST', body: new FormData(f) }); const j = await r.json().catch(() => ({ error: 'เซิร์ฟเวอร์ไม่ตอบสนอง' }));
      if (!r.ok) throw j;
      out.innerHTML = `<div class="ok"><b>✅ ส่งข้อมูลเรียบร้อย — สถานะ: ${SL.esc(j.status)}</b><br>เลขอ้างอิงของคุณ: <b style="font-size:20px">${SL.esc(j.ref)}</b><br>กรุณาจดเลขนี้ไว้ ตรวจสอบสถานะได้ที่ <a href="status.html?ref=${encodeURIComponent(j.ref)}">หน้าตรวจสอบสถานะ</a> ด้วยเลขอ้างอิง + เบอร์โทร</div>`;
      f.reset();
    } catch (e) {
      out.innerHTML = `<div class="err"><b>${SL.esc(e.error || 'ส่งไม่สำเร็จ')}</b>${e.details ? '<ul>' + e.details.map(d => `<li>${SL.esc(d)}</li>`).join('') + '</ul>' : ''}${location.protocol === 'file:' ? '<br>หมายเหตุ: ต้องเปิดผ่านเซิร์ฟเวอร์ (start.bat → http://localhost:3000)' : ''}</div>`;
    }
    btn.disabled = false; btn.textContent = btn.dataset.label || 'ส่งข้อมูล';
  }));
  document.querySelectorAll('form[data-demo]').forEach(f => f.addEventListener('submit', e => { e.preventDefault(); f.querySelector('.out').innerHTML = '<div class="ok">✅ ได้รับข้อมูลแล้ว (โหมดสาธิต — ยังไม่บันทึกเข้าระบบ) ทีมงานจะติดต่อกลับ</div>'; f.reset(); }));
});
