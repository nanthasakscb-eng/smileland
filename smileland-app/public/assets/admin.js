let CSRF = '', TAB = 'queue'; const $ = i => document.getElementById(i), e = SL.esc;
async function post(u, b) { const r = await fetch(u, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': CSRF }, body: JSON.stringify(b || {}) }); const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || 'ผิดพลาด'); return j; }
const EVT = { submitted: '📥 ส่งข้อมูล', edited: '✏️ แก้ไข', approved: '✅ อนุมัติ', rejected: '⛔ ไม่อนุมัติ', info: '❓ ขอข้อมูลเพิ่ม', price: '💲 เปลี่ยนราคา', sold: '🏁 ขายแล้ว', rented: '🔑 ให้เช่าแล้ว', unpublished: '🚫 ปิดเผยแพร่', note: '📝 บันทึก' };
const dt = s => new Date(s).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' });
async function boot() {
  try { const me = await SL.get('/api/admin/me'); CSRF = me.csrf; $('login').classList.add('hidden'); $('app').classList.remove('hidden'); $('mc').classList.toggle('hidden', !me.mustChange);
    $('who').innerHTML = `<span>👤 ${e(me.username)}</span> <button class="btn sm o" id="lo">ออกจากระบบ</button>`; $('lo').onclick = async () => { await post('/api/admin/logout'); location.reload(); };
    dash(); list(); const h = location.hash.slice(1); if (h) openRec(h);
  } catch { $('login').classList.remove('hidden'); $('app').classList.add('hidden'); }
}
$('login').onsubmit = async ev => { ev.preventDefault(); const f = ev.target; try { const r = await fetch('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: f.username.value, password: f.password.value }) }); const j = await r.json(); if (!r.ok) throw new Error(j.error); boot(); } catch (x) { f.querySelector('.out').innerHTML = `<div class="err">${e(x.message)}</div>`; } };
async function dash() { const d = await SL.get('/api/admin/dashboard'); const c = d.counts;
  $('dash').innerHTML = [['pending', 'รอพิจารณา'], ['info', 'ขอข้อมูลเพิ่ม'], ['approved', 'เผยแพร่อยู่'], ['sold', 'ขายแล้ว']].map(([k, l]) => `<div class="box"><div class="pr" style="font-size:30px">${c[k] || 0}</div>${l}</div>`).join('') + `<div class="box"><div class="pr">${c.rented || 0}</div>ให้เช่าแล้ว</div><div class="box"><div class="pr">${c.rejected || 0}</div>ไม่อนุมัติ</div><div class="box"><div class="pr">${c.unpublished || 0}</div>ปิดเผยแพร่</div><div class="box"><div class="pr">${d.total}</div>แปลงทั้งหมดในจดหมายเหตุ</div>`; }
async function list() {
  const st = TAB === 'queue' ? 'pending,info' : $('fs').value, q = $('q').value;
  const j = await SL.get('/api/admin/records?' + new URLSearchParams({ q, status: st }));
  $('rows').innerHTML = j.items.map(r => `<tr style="cursor:pointer" data-id="${e(r.id)}"><td><a href="#${e(r.id)}">${e(r.id)}</a></td><td>${e(r.ref)}</td><td>${e(r.title)} ${r.sample ? '<span class="pill">ตัวอย่าง</span>' : ''}<div class="mu">${r.kind === 'consign' ? 'ฝาก' + e(r.deal) : 'ลงประกาศ' + e(r.deal)} · ${e(r.owner)}</div></td><td>${e(r.district)} ${e(r.province)}</td><td>${SL.baht(r.price)}</td><td><span class="pill ${e(r.status)}">${e(r.statusText)}</span></td><td class="mu">${dt(r.updated)}</td></tr>`).join('') || '<tr><td colspan="7">ไม่มีรายการ</td></tr>';
  $('rows').querySelectorAll('tr[data-id]').forEach(t => t.onclick = () => openRec(t.dataset.id));
}
async function openRec(id) {
  const r = await SL.get('/api/admin/records/' + encodeURIComponent(id)); location.hash = r.id; const box = $('rec'); box.classList.remove('hidden');
  const w = SL.wa(r);
  box.innerHTML = `<div class="rh"><h2 style="margin:0">🗂️ จดหมายเหตุที่ดิน ${e(r.id)} <span class="pill ${e(r.status)}">${e(r.statusText)}</span></h2>${['approved', 'sold', 'rented'].includes(r.status) ? `<a href="listing.html?id=${encodeURIComponent(r.id)}" target="_blank">ดูหน้าประกาศ ↗</a>` : ''}</div>
<div class="g2"><div><table class="kv"><tr><td>เลขอ้างอิง</td><td>${e(r.ref)}</td></tr><tr><td>หัวข้อ</td><td>${e(r.title)}</td></tr><tr><td>ประเภท</td><td>${r.kind === 'consign' ? 'ฝาก' : 'ลงประกาศ'}${e(r.deal)} · ${e(r.ptype)}</td></tr>
<tr><td>ประเภทเอกสารสิทธิ์</td><td>${e(r.deed.type)}</td></tr><tr><td>เลขที่เอกสารสิทธิ์</td><td>${e(r.deed.number) || '-'}</td></tr><tr><td>เนื้อที่</td><td>${r.rai}-${r.ngan}-${r.wa} ไร่ (${w.toLocaleString()} ตร.ว.)</td></tr>
<tr><td>ที่ตั้ง</td><td>${r.subdistrict?"ต."+e(r.subdistrict)+" ":""}อ.${e(r.district)} จ.${e(r.province)}</td></tr><tr><td>ผังสี</td><td>${e(r.deed.zone)}</td></tr><tr><td>ราคาปัจจุบัน</td><td>${SL.baht(r.price)}</td></tr>
<tr><td>เจ้าของ/ผู้ติดต่อ</td><td>${e(r.owner.name)}<br>📞 ${e(r.owner.phone)} ${r.owner.line ? '· LINE ' + e(r.owner.line) : ''} ${r.owner.email ? '<br>' + e(r.owner.email) : ''}</td></tr><tr><td>รายละเอียด</td><td style="white-space:pre-line">${e(r.desc)}</td></tr></table>
<div class="row" style="margin-top:8px">${r.photos.map(p => `<a href="${e(p)}" target="_blank"><img src="${e(p)}" alt="รูปที่ดิน" style="height:80px;border-radius:8px"></a>`).join('') || '<span class="mu">ไม่มีรูป</span>'}</div>
<h3>ประวัติราคา</h3><table>${r.priceHistory.map(h => `<tr><td>${dt(h.at)}</td><td>${SL.baht(h.price)}</td><td class="mu">${e(h.by)}</td></tr>`).join('')}</table></div>
<div><h3 style="margin-top:0">ดำเนินการ</h3><label>เหตุผล / หมายเหตุ (จำเป็นสำหรับ ไม่อนุมัติ, ขอข้อมูลเพิ่ม, บันทึก)</label><textarea id="rs" rows="3"></textarea>
<div class="row" style="margin:8px 0">${[['approve', '✅ อนุมัติ/เผยแพร่', ''], ['info', '❓ ขอข้อมูลเพิ่ม', 'br'], ['reject', '⛔ ไม่อนุมัติ', 'red'], ['note', '📝 เพิ่มบันทึก', 'o']].map(([a, l, c]) => `<button class="btn sm ${c}" data-a="${a}">${l}</button>`).join('')}</div>
<div class="row" style="margin:8px 0">${[['sold', '🏁 ขายแล้ว'], ['rented', '🔑 ให้เช่าแล้ว'], ['unpublish', '🚫 ปิดเผยแพร่'], ['feature', r.featured ? '☆ ยกเลิกเด่น' : '⭐ ตั้งเป็นประกาศเด่น']].map(([a, l]) => `<button class="btn sm o" data-a="${a}">${l}</button>`).join('')}</div>
<div class="row"><input id="np" type="number" placeholder="ราคาใหม่ (บาท)"><button class="btn sm br" data-a="price" style="flex:0 0 auto">💲 เปลี่ยนราคา</button></div><div id="ao" aria-live="polite"></div>
<h3>ไทม์ไลน์ (บันทึกต่อท้ายเท่านั้น แก้ไข/ลบไม่ได้)</h3><ul class="tl">${[...r.timeline].reverse().map(t => `<li><b>${EVT[t.event] || e(t.event)}</b> <span class="mu">${dt(t.at)} · ${e(t.by)}</span><br>${e(t.detail)}</li>`).join('')}</ul></div></div>`;
  box.querySelectorAll('[data-a]').forEach(b => b.onclick = async () => {
    try { await post(`/api/admin/records/${encodeURIComponent(r.id)}/action`, { action: b.dataset.a, reason: $('rs').value, price: $('np').value }); await openRec(r.id); dash(); list(); }
    catch (x) { $('ao').innerHTML = `<div class="err">${e(x.message)}</div>`; }
  });
  box.scrollIntoView({ behavior: 'smooth' });
}
document.querySelectorAll('.tg button').forEach(b => b.onclick = () => { document.querySelectorAll('.tg button').forEach(x => x.classList.remove('on')); b.classList.add('on'); TAB = b.dataset.t;
  $('t-pw').classList.toggle('hidden', TAB !== 'pw'); $('t-list').classList.toggle('hidden', TAB === 'pw'); $('fs').classList.toggle('hidden', TAB === 'queue'); list(); });
$('fs').classList.add('hidden'); $('q').oninput = list; $('fs').onchange = list;
$('pwf').onsubmit = async ev => { ev.preventDefault(); const f = ev.target, o = f.querySelector('.out'); try { await post('/api/admin/password', { current: f.current.value, next: f.next.value }); o.innerHTML = '<div class="ok">เปลี่ยนรหัสผ่านแล้ว</div>'; f.reset(); $('mc').classList.add('hidden'); } catch (x) { o.innerHTML = `<div class="err">${e(x.message)}</div>`; } };
boot();
