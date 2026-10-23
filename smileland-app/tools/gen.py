# Generates public/*.html with shared header/footer. Run: python tools/gen.py
import os
OUT=os.path.join(os.path.dirname(__file__),'..','public')
NAV=[('index.html','หน้าแรก'),('search.html','ค้นหาที่ดิน'),('post.html','ลงประกาศ'),('promote.html','แอดโปรโมท'),('agents.html','นายหน้าและโครงการ'),('consign.html','ฝากขาย/ฝากเช่า'),('services.html','บริการของเรา'),('seo.html','บริการ SEO'),('tools.html','เครื่องมือ'),('news.html','ความรู้และข่าวสาร'),('app.html','แอปมือถือ'),('about.html','เกี่ยวกับเรา'),('contact.html','ติดต่อเรา')]
LOGO='<svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 15 L9 9 L13 13 L16 10 L21 15 Z" fill="#fff"/><path d="M8 17 Q12 20 16 17" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/></svg>'
def page(fn,title,desc,body,script='',active=None):
    active=active or fn
    nav=''.join(f'<li><a href="{h}"{" class=\"on\" aria-current=\"page\"" if h==active else ""}>{t}</a></li>' for h,t in NAV)
    fnav=''.join(f'<li><a href="{h}">{t}</a></li>' for h,t in NAV)
    html=f'''<!DOCTYPE html>
<html lang="th"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{title}</title><meta name="description" content="{desc}">
<meta property="og:title" content="{title}"><meta property="og:description" content="{desc}"><meta property="og:type" content="website">
<link rel="stylesheet" href="assets/style.css"></head><body>
<div class="demo">เว็บไซต์ต้นแบบ — ประกาศที่ระบุ “ข้อมูลตัวอย่าง” ใช้เพื่อทดสอบระบบเท่านั้น</div>
<header class="site"><div class="hd"><a class="logo" href="index.html" aria-label="SMILELAND หน้าแรก"><span class="ic">{LOGO}</span><span><b>SMILELAND</b><small>สไมล์แลนด์ · ที่ดินยิ้ม</small></span></a>
<div class="row" style="flex:0 0 auto;align-items:center"><a class="btn sm" href="consign.html">ฝากขาย/ฝากเช่า</a><button class="hamb" aria-label="เปิดเมนู" aria-expanded="false">☰</button></div></div>
<nav class="menu" aria-label="เมนูหลัก"><ul>{nav}</ul></nav></header>
<main>{body}</main>
<footer class="site"><div class="wrap"><div class="cols"><div><b style="font-size:22px">SMILELAND</b> <span>สไมล์แลนด์ · ยิ้มที่ดิน</span><p>แพลตฟอร์มฝากขาย ฝากเช่า และลงประกาศ บ้านและที่ดินทั่วประเทศ</p><p>📞 0X-XXX-XXXX · LINE: @smileland (ตัวอย่าง) · ✉️ info@example.com</p></div>
<div><b>เมนู</b><ul>{fnav}</ul></div><div><b>สำหรับเจ้าของทรัพย์</b><ul style="columns:1"><li><a href="status.html">ตรวจสอบสถานะคำขอ</a></li><li><a href="consign.html">ฝากขาย/ฝากเช่ากับเรา</a></li><li><a href="post.html">ลงประกาศ</a></li></ul></div></div>
<div class="warn" role="note"><b>⚠️ ระวังมิจฉาชีพ:</b> SMILELAND ไม่มีนโยบายเรียกเก็บเงินล่วงหน้า ค่ามัดจำ หรือค่าประเมินผ่านบัญชีบุคคล ไม่ขอรหัส OTP และไม่ส่งลิงก์ให้ติดตั้งแอปใด ๆ หากไม่แน่ใจ โปรดโทรตรวจสอบกับเบอร์ทางการของบริษัทก่อนทุกครั้ง</div>
<div class="mu" style="color:#e9dcc3">© 2026 SMILELAND สงวนลิขสิทธิ์ · ข้อมูลประกาศตัวอย่างใช้เพื่อการทดสอบ</div></div></footer>
<div class="fl"><a class="call" href="tel:0X-XXX-XXXX" aria-label="โทรหาเรา">📞</a><a class="line" href="#" aria-label="แอดไลน์">LINE</a></div>
<script src="assets/app.js"></script>{script}
</body></html>'''
    open(os.path.join(OUT,fn),'w',encoding='utf-8').write(html)
def ph(h1,sub): return f'<section class="phead"><div class="wrap"><h1>{h1}</h1><p>{sub}</p></div></section>'
DEEDS=['โฉนด (น.ส.4จ.)','น.ส.3ก.','น.ส.3','หนังสือกรรมสิทธิ์ห้องชุด (อ.ช.2)','ส.ป.ก. 4-01','อื่น ๆ']
ZONES=['ไม่ทราบ','เหลือง','ส้ม','น้ำตาล','แดง','ม่วง','เขียว','เขียวลายขาว','น้ำเงิน','อื่น ๆ']
opt=lambda L:''.join(f'<option>{x}</option>' for x in L)
def subform(kind,label):
    agree='<label style="font-weight:400"><input type="checkbox" name="agree" value="yes" style="width:auto" required> ฉันได้อ่านและยอมรับเงื่อนไขการฝากขาย/ฝากเช่า (ค่าบริการ 3% เมื่อขายได้)</label>' if kind=='consign' else ''
    return f'''<form class="form box" data-submit enctype="multipart/form-data" novalidate><input type="hidden" name="kind" value="{kind}">
<div class="row"><div><label for="deal">ต้องการ</label><select id="deal" name="deal" required><option>ขาย</option><option>เช่า</option></select></div>
<div><label for="ptype">ประเภททรัพย์</label><select id="ptype" name="ptype"><option>ที่ดิน</option><option>บ้าน</option><option>คอนโด</option><option>ทาวน์โฮม</option><option>อาคารพาณิชย์</option></select></div></div>
<label for="title">หัวข้อประกาศ *</label><input id="title" name="title" required minlength="5" maxlength="120" placeholder="เช่น ที่ดินติดถนนลาดยาง 2 ไร่ ใกล้ตัวเมือง">
<div class="row"><div><label for="province">จังหวัด *</label><select id="province" name="province" data-prov required></select></div><div><label for="district">อำเภอ/เขต *</label><input id="district" name="district" required></div><div><label for="subdistrict">ตำบล/แขวง</label><input id="subdistrict" name="subdistrict"></div></div>
<div class="row"><div><label for="rai">ไร่</label><input id="rai" name="rai" type="number" min="0" value="0"></div><div><label for="ngan">งาน</label><input id="ngan" name="ngan" type="number" min="0" max="3" value="0"></div><div><label for="wa">ตร.ว.</label><input id="wa" name="wa" type="number" min="0" max="99.9" step="0.1" value="0"></div><div><label for="price">ราคา (บาท) *</label><input id="price" name="price" type="number" min="1" required></div></div>
<h3 style="margin:16px 0 0;color:var(--bd)">ข้อมูลเอกสารสิทธิ์ (สำหรับจดหมายเหตุที่ดิน)</h3>
<div class="row"><div><label for="deedType">ประเภทเอกสารสิทธิ์</label><select id="deedType" name="deedType">{opt(DEEDS)}</select></div><div><label for="deedNo">เลขที่เอกสารสิทธิ์</label><input id="deedNo" name="deedNo" placeholder="ไม่เปิดเผยต่อสาธารณะ"></div><div><label for="zone">ผังสี (ผังเมือง)</label><select id="zone" name="zone">{opt(ZONES)}</select></div></div>
<label for="nearby">ทำเล/ระยะทางสำคัญ</label><input id="nearby" name="nearby" placeholder="เช่น 3 กม. ถึงถนนใหญ่">
<label for="desc">รายละเอียด</label><textarea id="desc" name="desc" rows="4"></textarea>
<label for="photos">รูปภาพ (JPG/PNG/WEBP ไม่เกิน 8 รูป รูปละไม่เกิน 5MB)</label><input id="photos" name="photos" type="file" accept="image/jpeg,image/png,image/webp" multiple>
<h3 style="margin:16px 0 0;color:var(--bd)">ข้อมูลผู้ติดต่อ</h3>
<div class="row"><div><label for="name">ชื่อ-นามสกุล *</label><input id="name" name="name" required></div><div><label for="phone">เบอร์โทร *</label><input id="phone" name="phone" type="tel" required placeholder="08XXXXXXXX"></div><div><label for="line">LINE ID</label><input id="line" name="line"></div></div>
<label for="email">อีเมล</label><input id="email" name="email" type="email">
<p>{agree}</p><button class="btn" type="submit" data-label="{label}">{label}</button><div class="out" aria-live="polite"></div></form>'''

# 1 index
page('index.html','SMILELAND สไมล์แลนด์ – ฝากขาย ฝากเช่า บ้านและที่ดินทั่วประเทศ','SMILELAND ที่ดินยิ้ม แพลตฟอร์มค้นหา ลงประกาศ ฝากขาย ฝากเช่า บ้าน ที่ดิน คอนโด ทาวน์โฮม ทั่วประเทศ ตรวจสอบประกาศโดยทีมงานก่อนเผยแพร่',f'''
<section class="hero"><h1>ค้นหาบ้านและที่ดินที่ใช่ ทั่วประเทศ</h1><p>ฝากขาย ฝากเช่า ลงประกาศ — ทุกประกาศผ่านการตรวจสอบโดยทีมงานก่อนเผยแพร่</p>
<form class="sbox" action="search.html" id="hs"><div><div class="tg" role="tablist"><button type="button" class="on" data-deal="ขาย">ซื้อ</button><button type="button" data-deal="เช่า">เช่า</button><button type="button" data-go="consign.html">ฝากขาย/เช่า</button></div>
<span class="pills"><button type="button" class="on" data-pt="">ทั้งหมด</button><button type="button" data-pt="ที่ดิน">ที่ดิน</button><button type="button" data-pt="บ้าน">บ้าน</button><button type="button" data-pt="คอนโด">คอนโด</button><button type="button" data-pt="ทาวน์โฮม">ทาวน์โฮม</button></span></div>
<input type="hidden" name="deal" value="ขาย"><input type="hidden" name="ptype" value="">
<div class="row"><input name="q" aria-label="คำค้นหา" placeholder="ค้นหา ทำเล อำเภอ ตำบล หรือคำสำคัญ" style="flex:2"><select name="province" aria-label="จังหวัด" data-prov></select><select name="max" aria-label="ราคาสูงสุด"><option value="">ทุกราคา</option><option value="1000000">ไม่เกิน 1 ล้าน</option><option value="3000000">ไม่เกิน 3 ล้าน</option><option value="5000000">ไม่เกิน 5 ล้าน</option></select><button class="btn" style="flex:0 0 auto">🔍 ค้นหา</button></div></form></section>
<section class="sec"><div class="wrap"><h2>ทำเลยอดนิยม</h2><div class="chips" id="pchips"></div>
<div class="rh" style="margin-top:20px"><h2 style="margin:0">ประกาศแนะนำ</h2><a href="search.html">ดูทั้งหมด →</a></div><div class="grid" id="feat"><p class="mu">กำลังโหลด...</p></div></div></section>
<section class="sec" style="background:#fff"><div class="wrap g4" style="text-align:center">
<div><div class="ico">🔍</div><b>ค้นหาง่าย</b><p class="mu">กรองจังหวัด อำเภอ ตำบล ราคา ขนาด เอกสารสิทธิ์</p></div><div><div class="ico">🤝</div><b>ฝากขาย/ฝากเช่า</b><p class="mu">บริษัทเป็นนายหน้า ค่าบริการ 3% เมื่อขายได้</p></div>
<div><div class="ico">📜</div><b>จดหมายเหตุที่ดิน</b><p class="mu">บันทึกประวัติเอกสารสิทธิ์ ราคา และทุกเหตุการณ์ของแปลง</p></div><div><div class="ico">✅</div><b>ตรวจสอบก่อนเผยแพร่</b><p class="mu">แอดมินพิจารณาทุกประกาศ ลดความเสี่ยงมิจฉาชีพ</p></div></div></section>''','''<script>
const f=document.getElementById('hs');f.querySelectorAll('.tg button').forEach(b=>b.onclick=()=>{if(b.dataset.go)return location.href=b.dataset.go;f.querySelectorAll('.tg button').forEach(x=>x.classList.remove('on'));b.classList.add('on');f.deal.value=b.dataset.deal});
f.querySelectorAll('.pills button').forEach(b=>b.onclick=()=>{f.querySelectorAll('.pills button').forEach(x=>x.classList.remove('on'));b.classList.add('on');f.ptype.value=b.dataset.pt});
SL.get('/api/listings').then(j=>{const it=j.items;const fe=it.filter(l=>l.featured);document.getElementById('feat').innerHTML=(fe.length?fe:it).slice(0,6).map(SL.card).join('');
const c={};it.forEach(l=>c[l.province]=(c[l.province]||0)+1);document.getElementById('pchips').innerHTML=Object.entries(c).sort((a,b)=>b[1]-a[1]).map(([p,n])=>`<a href="search.html?province=${encodeURIComponent(p)}">${SL.esc(p)} (${n})</a>`).join('')})
.catch(e=>document.getElementById('feat').innerHTML='<p class="err">โหลดประกาศไม่สำเร็จ — กรุณาเปิดผ่านเซิร์ฟเวอร์ (start.bat)</p>');
</script>''')

# 2 search
page('search.html','ค้นหาบ้านและที่ดิน ขาย-เช่า ทั่วประเทศ | SMILELAND','ค้นหาที่ดิน บ้าน คอนโด ทาวน์โฮม ขายและเช่า กรองตามจังหวัด อำเภอ ตำบล ราคา ขนาด และประเภทเอกสารสิทธิ์ บน SMILELAND',ph('ค้นหาที่ดิน','กรองตามทำเล ราคา ขนาด และเอกสารสิทธิ์')+'''
<div class="wrap lay"><aside class="side" aria-label="ตัวกรอง"><form id="flt">
<label for="q">คำค้นหา</label><input id="q" name="q" placeholder="ทำเล / คำสำคัญ">
<label for="deal">ขาย/เช่า</label><select id="deal" name="deal"><option value="">ทั้งหมด</option><option>ขาย</option><option>เช่า</option></select>
<label for="ptype">ประเภท</label><select id="ptype" name="ptype"><option value="">ทั้งหมด</option><option>ที่ดิน</option><option>บ้าน</option><option>คอนโด</option><option>ทาวน์โฮม</option></select>
<label for="province">จังหวัด</label><select id="province" name="province"></select><label for="district">อำเภอ</label><select id="district" name="district"></select><label for="subdistrict">ตำบล</label><select id="subdistrict" name="subdistrict"></select>
<label>ราคา (บาท)</label><div class="row"><input name="min" type="number" placeholder="ต่ำสุด" aria-label="ราคาต่ำสุด"><input name="max" type="number" placeholder="สูงสุด" aria-label="ราคาสูงสุด"></div>
<label for="size">ขนาด</label><select id="size" name="size"><option value="">ทุกขนาด</option><option value="0-400">ไม่เกิน 1 ไร่</option><option value="400-2000">1–5 ไร่</option><option value="2000-999999">มากกว่า 5 ไร่</option></select>
<label for="deed">เอกสารสิทธิ์</label><select id="deed" name="deed"><option value="">ทั้งหมด</option><option>โฉนด (น.ส.4จ.)</option><option>น.ส.3ก.</option><option>หนังสือกรรมสิทธิ์ห้องชุด (อ.ช.2)</option></select>
<p><button type="reset" class="btn o" style="width:100%">ล้างตัวกรอง</button></p></form></aside>
<section><div class="rh"><b id="cnt" aria-live="polite">กำลังโหลด...</b><label>เรียง <select id="sort" style="width:auto"><option value="new">ล่าสุด</option><option value="pa">ราคาต่ำ→สูง</option><option value="pd">ราคาสูง→ต่ำ</option><option value="sa">ขนาดใหญ่ก่อน</option><option value="ppw">฿/ตร.ว. ต่ำสุด</option></select></label></div>
<div class="grid" id="res"></div></section></div>''','''<script>
const F=document.getElementById('flt'),P=new URLSearchParams(location.search);let ALL=[];
function opts(sel,vals,lbl,keep){sel.innerHTML=`<option value="">${lbl}ทั้งหมด</option>`+vals.map(v=>`<option${v===keep?' selected':''}>${SL.esc(v)}</option>`).join('')}
const uniq=a=>[...new Set(a)].sort((x,y)=>x.localeCompare(y,'th'));
function cascade(){const p=F.province.value,d=F.district.value,s=F.subdistrict.value;opts(F.province,uniq(ALL.map(l=>l.province)),'จังหวัด',p);
const D=uniq(ALL.filter(l=>!p||l.province===p).map(l=>l.district));opts(F.district,D,'อำเภอ',D.includes(d)?d:'');
const S=uniq(ALL.filter(l=>(!p||l.province===p)&&(!F.district.value||l.district===F.district.value)).map(l=>l.subdistrict));opts(F.subdistrict,S,'ตำบล',S.includes(s)?s:'')}
function run(){const v=Object.fromEntries(new FormData(F));const [a,b]=(v.size||'0-1e12').split('-').map(Number);const q=(v.q||'').trim();
let L=ALL.filter(l=>(!v.deal||l.deal===v.deal)&&(!v.ptype||l.ptype===v.ptype)&&(!v.province||l.province===v.province)&&(!v.district||l.district===v.district)&&(!v.subdistrict||l.subdistrict===v.subdistrict)
&&(!v.min||l.price>=+v.min)&&(!v.max||l.price<=+v.max)&&SL.wa(l)>=a&&SL.wa(l)<=b&&(!v.deed||l.deed.type===v.deed)&&(!q||[l.title,l.province,l.district,l.subdistrict,l.desc,l.nearby].join(' ').includes(q)));
const s=document.getElementById('sort').value;L.sort({new:(x,y)=>y.updated.localeCompare(x.updated),pa:(x,y)=>x.price-y.price,pd:(x,y)=>y.price-x.price,sa:(x,y)=>SL.wa(y)-SL.wa(x),ppw:(x,y)=>x.price/SL.wa(x)-y.price/SL.wa(y)}[s]);
document.getElementById('cnt').textContent=`พบ ${L.length} รายการ`;document.getElementById('res').innerHTML=L.length?L.map(SL.card).join(''):'<p class="box">ไม่พบประกาศที่ตรงเงื่อนไข ลองปรับตัวกรอง</p>';
const u=new URLSearchParams();for(const[k,x]of Object.entries(v))if(x)u.set(k,x);history.replaceState(null,'','?'+u)}
SL.get('/api/listings').then(j=>{ALL=j.items;for(const[k,x]of P)if(F[k]&&k!=='province'&&k!=='district'&&k!=='subdistrict')F[k].value=x;
cascade();['province','district','subdistrict'].forEach(k=>{if(P.get(k)){F[k].value=P.get(k);cascade()}});run()}).catch(()=>document.getElementById('cnt').textContent='โหลดข้อมูลไม่สำเร็จ — เปิดผ่านเซิร์ฟเวอร์ (start.bat)');
F.addEventListener('change',e=>{if(['province','district'].includes(e.target.name))cascade();run()});F.addEventListener('input',e=>{if(e.target.name==='q'||e.target.type==='number')run()});
F.addEventListener('reset',()=>setTimeout(()=>{cascade();run()}));document.getElementById('sort').onchange=run;
</script>''')

# listing detail
page('listing.html','รายละเอียดประกาศ | SMILELAND','รายละเอียดประกาศขาย-เช่าบ้านและที่ดิน ราคา เนื้อที่ เอกสารสิทธิ์ ผังสี ทำเล และช่องทางติดต่อ SMILELAND','''<div class="wrap" id="dv"><p class="sec">กำลังโหลด...</p></div>''','''<script>
const id=new URLSearchParams(location.search).get('id'),e=SL.esc;
SL.get('/api/listings/'+encodeURIComponent(id||'')).then(l=>{document.title=l.title+' '+SL.baht(l.price)+' จ.'+l.province+' | SMILELAND';
const sl=(l.photos.length?l.photos:[1,2,3]).map((p,i)=>typeof p==='string'?`<div class="sl${i?'':' on'}" role="img" aria-label="รูปที่ ${i+1} ${e(l.title)}" style="background-image:url('${e(p)}')"></div>`:`<div class="sl img v${i}${i?'':' on'}" role="img" aria-label="ภาพตัวอย่าง ${i+1}">ภาพตัวอย่าง ${i+1}</div>`).join('');
const w=SL.wa(l);document.getElementById('dv').innerHTML=`<div class="crumb"><a href="index.html">หน้าแรก</a> › <a href="search.html?province=${encodeURIComponent(l.province)}">${e(l.province)}</a> › ${e(l.title)}</div>
<div class="dl"><div><div class="slider">${sl}<button class="nv p" aria-label="รูปก่อนหน้า">‹</button><button class="nv n" aria-label="รูปถัดไป">›</button><div class="dots"></div></div>
<h1 style="color:var(--bd);margin:14px 0 0">${e(l.title)} ${l.sample?'<span class="pill">ข้อมูลตัวอย่าง</span>':''} ${l.status!=='approved'?`<span class="pill sold">${l.status==='sold'?'ขายแล้ว':'ให้เช่าแล้ว'}</span>`:''}</h1>
<p class="mu">📍 ${l.subdistrict?"ต."+e(l.subdistrict)+" ":""}อ.${e(l.district)} จ.${e(l.province)} · รหัสประกาศ ${e(l.id)}</p>
<div class="box"><h2 style="margin-top:0">ข้อมูลที่ดินและเอกสารสิทธิ์</h2><table class="kv"><tr><td>ประเภท</td><td>${e(l.deal)} · ${e(l.ptype)}</td></tr><tr><td>เนื้อที่</td><td>${l.rai} ไร่ ${l.ngan} งาน ${l.wa} ตร.ว. (${w.toLocaleString()} ตร.ว. ≈ ${(w*4).toLocaleString()} ตร.ม.)</td></tr>
<tr><td>ราคา</td><td>${SL.baht(l.price)}</td></tr>${l.deal==='ขาย'?`<tr><td>ราคาต่อ ตร.ว.</td><td>${SL.baht(l.price/w)}</td></tr><tr><td>ราคาต่อไร่</td><td>${SL.baht(l.price/w*400)}</td></tr>`:''}
<tr><td>เอกสารสิทธิ์</td><td>${e(l.deed.type)}</td></tr><tr><td>ผังสี</td><td>${e(l.deed.zone)}</td></tr><tr><td>ทำเล</td><td>${e(l.nearby)}</td></tr></table></div>
<div class="box"><h2 style="margin-top:0">รายละเอียด</h2><p style="white-space:pre-line">${e(l.desc)}</p><div class="chips">${['โรงเรียน','โรงพยาบาล','ตลาด','ถนนหลัก','ร้านสะดวกซื้อ','ที่ว่าการอำเภอ'].map(x=>`<span>📍 ใกล้${x}</span>`).join('')}</div></div>
<div class="box"><h2 style="margin-top:0">แผนที่</h2><div class="map">🗺️ แผนที่ตำแหน่งโดยประมาณ (Placeholder)<br>จ.${e(l.province)}</div></div></div>
<aside><div class="box" style="position:sticky;top:110px"><div class="pr" style="font-size:28px">${SL.baht(l.price)}</div><p class="mu">ติดต่อทีมงาน SMILELAND (ไม่เปิดเผยเบอร์เจ้าของ)</p>
<a class="btn" style="width:100%" href="tel:0X-XXX-XXXX">📞 โทร 0X-XXX-XXXX</a><p></p><a class="btn ln" style="width:100%" href="#">LINE สอบถาม</a>
<h3>คำนวณผ่อนโดยประมาณ</h3><label>เงินดาวน์ (%)</label><input id="dp" type="number" value="20"><label>ดอกเบี้ย (%/ปี)</label><input id="rt" type="number" value="6.5" step="0.1"><label>ระยะเวลา (ปี)</label><input id="yr" type="number" value="20">
<p>ผ่อนประมาณ <b id="mo" class="pr"></b> /เดือน</p><div class="warn" style="font-size:14px">ห้ามโอนเงินมัดจำให้บุคคลใดก่อนตรวจสอบเอกสารสิทธิ์ที่สำนักงานที่ดิน</div></div></aside></div>`;
const S=[...document.querySelectorAll('.sl')],D=document.querySelector('.dots');let k=0;D.innerHTML=S.map(()=>'<i></i>').join('');const go=n=>{k=(n+S.length)%S.length;S.forEach((s,i)=>s.classList.toggle('on',i===k));[...D.children].forEach((d,i)=>d.classList.toggle('on',i===k))};go(0);
document.querySelector('.nv.p').onclick=()=>go(k-1);document.querySelector('.nv.n').onclick=()=>go(k+1);[...D.children].forEach((d,i)=>d.onclick=()=>go(i));
const calc=()=>{document.getElementById('mo').textContent=SL.baht(SL.loan(l.price*(1-dp.value/100),+rt.value,+yr.value||1))};['dp','rt','yr'].forEach(x=>document.getElementById(x).oninput=calc);calc();
}).catch(()=>document.getElementById('dv').innerHTML='<div class="sec"><h1>ไม่พบประกาศ</h1><p>ประกาศนี้อาจถูกปิดหรือยังไม่ผ่านการอนุมัติ <a href="search.html">กลับไปค้นหา</a></p></div>');
</script>''',active='search.html')

# 6 consign
page('consign.html','ฝากขาย ฝากเช่า บ้านและที่ดิน ค่าบริการ 3% เมื่อขายได้ | SMILELAND','ฝากขายหรือฝากเช่าบ้านและที่ดินกับ SMILELAND บริษัทเป็นนายหน้า หาผู้ซื้อ ทำการตลาด ดูแลจนโอน ค่าคอมมิชชั่น 3% จ่ายเมื่อขายได้เท่านั้น',ph('ฝากขาย / ฝากเช่า บ้านและที่ดิน','บริษัททำหน้าที่เป็นนายหน้า หาผู้ซื้อ/ผู้เช่า ทำการตลาด และดูแลจนปิดการขาย')+f'''
<div class="wrap sec"><p class="hl">💰 ค่าคอมมิชชั่น 3% ของราคาขาย — จ่ายเฉพาะเมื่อขายได้เท่านั้น</p>
<div class="steps"><div class="st4"><b>1</b>อ่านเงื่อนไข</div><div class="st4"><b>2</b>กรอกข้อมูล</div><div class="st4"><b>3</b>เจรจา</div><div class="st4"><b>4</b>รอผลพิจารณา</div></div>
<div class="g2"><div class="box"><h2 style="margin-top:0">เงื่อนไขการฝากขาย/ฝากเช่า</h2><ol><li>ผู้ฝากต้องเป็นเจ้าของกรรมสิทธิ์ หรือผู้รับมอบอำนาจโดยถูกต้อง</li><li>ค่าบริการนายหน้า 3% ของราคาขายจริง ชำระเมื่อโอนกรรมสิทธิ์เสร็จ (ฝากเช่า: ตามที่ตกลงเป็นลายลักษณ์อักษร)</li><li>ไม่มีค่าใช้จ่ายล่วงหน้า ไม่มีค่าลงประกาศ</li><li>ทีมงานตรวจสอบเอกสารสิทธิ์และนัดสำรวจพื้นที่ก่อนเผยแพร่</li><li>ราคาขายและเงื่อนไขเจรจาร่วมกันก่อนลงนามสัญญาแต่งตั้งนายหน้า</li><li>ข้อมูลเลขที่เอกสารสิทธิ์และเบอร์เจ้าของจะไม่เปิดเผยต่อสาธารณะ</li></ol>
<h3>ทำไมต้องฝากกับเรา</h3><div class="chips"><span>ไม่มีค่าใช้จ่ายล่วงหน้า</span><span>โปรโมททั้งออนไลน์และออฟไลน์</span><span>มีจดหมายเหตุที่ดินทุกแปลง</span><span>ดูแลเอกสารและการโอน</span></div>
<div class="warn" style="margin-top:16px"><b>⚠️ ระวังมิจฉาชีพ:</b> ทีมงานจะไม่ขอให้โอนเงินค่าประเมิน ค่าดำเนินการ หรือค่าลงประกาศล่วงหน้า และไม่ขอโฉนดตัวจริงก่อนวันทำสัญญาที่สำนักงานที่ดิน</div></div>
<div><h2 style="margin-top:0">กรอกข้อมูลฝากขาย/ฝากเช่า</h2>{subform('consign','ส่งคำขอฝากขาย/ฝากเช่า')}<p class="mu">ส่งแล้วตรวจสอบสถานะได้ที่ <a href="status.html">ตรวจสอบสถานะคำขอ</a></p></div></div></div>''')

# 3 post
page('post.html','ลงประกาศขาย-เช่า บ้านและที่ดิน | SMILELAND','ลงประกาศขายหรือให้เช่าบ้าน ที่ดิน คอนโด ทาวน์โฮม บน SMILELAND ประกาศผ่านการตรวจสอบโดยทีมงานก่อนเผยแพร่',ph('ลงประกาศขาย/เช่า','เลือกแพ็กเกจ กรอกข้อมูล แล้วรอทีมงานตรวจสอบก่อนเผยแพร่')+f'''
<div class="wrap sec"><div class="g2"><div class="box"><h2 style="margin-top:0">ฟรี</h2><div class="pr">฿0</div><ul><li>ลงได้ 1 ประกาศ</li><li>รูปภาพ 8 รูป</li><li>แสดง 30 วัน</li></ul></div>
<div class="box" style="border:2px solid var(--gd)"><h2 style="margin-top:0">พรีเมียม <span class="pill approved">แนะนำ</span></h2><div class="pr">ราคาตัวอย่าง</div><ul><li>ลงได้หลายประกาศ</li><li>รูปภาพ + วิดีโอ</li><li>ป้าย “ประกาศเด่น” ขึ้นหน้าแรก</li></ul><p class="mu">ระบบชำระเงินยังไม่เปิดใช้ในต้นแบบ</p></div></div>
<h2>กรอกข้อมูลประกาศ</h2>{subform('post','ส่งประกาศเพื่อตรวจสอบ')}</div>''')

# status
page('status.html','ตรวจสอบสถานะคำขอฝากขายและประกาศ | SMILELAND','ตรวจสอบสถานะคำขอฝากขาย ฝากเช่า หรือประกาศ ด้วยเลขอ้างอิงและเบอร์โทรศัพท์',ph('ตรวจสอบสถานะคำขอ','กรอกเลขอ้างอิงที่ได้รับหลังส่งข้อมูล และเบอร์โทรที่ใช้ส่ง')+'''
<div class="wrap sec" style="max-width:640px"><form class="box form" id="sf"><label for="ref">เลขอ้างอิง</label><input id="ref" name="ref" required placeholder="SL2610-XXXXXX"><label for="ph">เบอร์โทร</label><input id="ph" name="phone" type="tel" required><p><button class="btn">ตรวจสอบ</button></p><div class="out" aria-live="polite"></div></form></div>''','''<script>
const f=document.getElementById('sf');f.ref.value=new URLSearchParams(location.search).get('ref')||'';
f.onsubmit=async e=>{e.preventDefault();const o=f.querySelector('.out');try{const j=await SL.get('/api/status?'+new URLSearchParams(new FormData(f)));
o.innerHTML=`<div class="ok"><b>${SL.esc(j.title)}</b><br>สถานะ: <span class="pill ${SL.esc(j.status)}">${SL.esc(j.statusText)}</span>${j.note?`<br>หมายเหตุจากทีมงาน: ${SL.esc(j.note)}`:''}${j.listingId?`<br><a href="listing.html?id=${encodeURIComponent(j.listingId)}">ดูประกาศที่เผยแพร่</a>`:''}<br><span class="mu">อัปเดตล่าสุด ${new Date(j.updated).toLocaleString('th-TH')}</span></div>`}catch(x){o.innerHTML=`<div class="err">${SL.esc(x.message)}</div>`}}
</script>''',active='consign.html')

# 4 promote
page('promote.html','แอดโปรโมทประกาศ Facebook Ads / Google Ads | SMILELAND','โปรโมทประกาศบ้านและที่ดินด้วย Facebook Ads และ Google Ads เลือกได้ 1 แบบ ยิงแอดเองอัตโนมัติ หรือให้ทีมงานดูแลและส่งรายงานผล',ph('แอดโปรโมทประกาศ','ยิงโฆษณาผ่าน Facebook Ads / Google Ads ตรงกลุ่มเป้าหมาย 📍 ตามพื้นที่ 👥 ตามช่วงอายุ 🔑 ตามคีย์เวิร์ด')+'''
<div class="wrap sec"><h2>เลือกรูปแบบบริการ (เลือกได้ 1 แบบ)</h2><form id="pf"><div class="g2">
<label class="opt"><h3 style="margin:0"><input type="radio" name="plan" value="1" checked>แบบที่ 1: ยิงแอดเอง (อัตโนมัติ)</h3><ul><li>💳 ลูกค้าชำระด้วยบัตรเครดิต/เดบิตของตนเอง</li><li>🔗 ระบบเชื่อมต่อ Facebook Ads / Google Ads</li><li>⚙️ สร้างแคมเปญ งบประมาณ กลุ่มเป้าหมายอัตโนมัติ</li><li>📈 ดูผลแคมเปญผ่านหน้า Dashboard</li></ul></label>
<label class="opt"><h3 style="margin:0"><input type="radio" name="plan" value="2">แบบที่ 2: เว็บเป็นตัวกลาง ทีมงานยิงแอดให้</h3><ul><li>🏦 ชำระเงินผ่านเว็บไซต์</li><li>👨‍💼 ทีมงานสร้างแคมเปญ และปรับกลุ่มเป้าหมายให้</li><li>📑 ส่งรายงานผลเป็นระยะ</li></ul></label></div>
<div class="box" style="margin-top:16px"><div class="row"><div><label>รหัสประกาศที่ต้องการโปรโมท</label><input name="lid" placeholder="เช่น SL-1001" required></div><div><label>งบประมาณต่อวัน (บาท)</label><input type="number" name="budget" value="200" min="50"></div><div><label>ระยะเวลา (วัน)</label><input type="number" name="days" value="7" min="1"></div><div><label>พื้นที่เป้าหมาย</label><select name="area" data-prov></select></div></div>
<p><button class="btn">ยืนยันเลือกแบบนี้ (สาธิต — ยังไม่ชำระเงินจริง)</button></p><div id="po" aria-live="polite"></div></div></form>
<div id="dash" class="box"><h2 style="margin-top:0">📈 Dashboard ผลแคมเปญ (ตัวอย่าง แบบที่ 1)</h2><div class="g4" style="text-align:center"><div><div class="pr">12,480</div>การแสดงผล</div><div><div class="pr">436</div>คลิก</div><div><div class="pr">3.5%</div>CTR</div><div><div class="pr">18</div>ทักแชท/โทร</div></div>
<div style="height:150px;margin-top:16px;border-bottom:2px solid var(--c2)"><span class="bar" style="height:40%"></span><span class="bar" style="height:55%"></span><span class="bar" style="height:48%"></span><span class="bar" style="height:70%"></span><span class="bar" style="height:82%"></span><span class="bar" style="height:64%"></span><span class="bar" style="height:90%"></span></div><p class="mu">ตัวเลขตัวอย่าง · การเชื่อมต่อ API โฆษณาจริงยังไม่เปิดใช้</p></div>
<div id="rep" class="box hidden"><h2 style="margin-top:0">📑 รายงานผล (ตัวอย่าง แบบที่ 2)</h2><table><tr><th>รอบรายงาน</th><th>การแสดงผล</th><th>คลิก</th><th>ผู้สนใจ</th></tr><tr><td>สัปดาห์ที่ 1</td><td>5,200</td><td>180</td><td>6</td></tr><tr><td>สัปดาห์ที่ 2</td><td>7,280</td><td>256</td><td>12</td></tr></table></div></div>''','''<script>
const f=document.getElementById('pf');f.addEventListener('change',()=>{const p=f.plan.value;document.getElementById('dash').classList.toggle('hidden',p!=='1');document.getElementById('rep').classList.toggle('hidden',p!=='2')});
f.onsubmit=e=>{e.preventDefault();const p=f.plan.value;document.getElementById('po').innerHTML=`<div class="ok">✅ เลือก <b>แบบที่ ${p}</b> แล้ว (โหมดสาธิต) งบรวมประมาณ ${SL.baht(f.budget.value*f.days.value)} — ${p==='1'?'ระบบจะพาไปหน้าชำระด้วยบัตรและสร้างแคมเปญอัตโนมัติเมื่อเปิดใช้จริง':'ทีมงานจะติดต่อกลับเพื่อวางแผนแคมเปญและส่งรายงานผลเป็นระยะ'}</div>`}
</script>''')

# 5 agents
ag=''.join(f'<div class="box" style="text-align:center"><div class="av" role="img" aria-label="รูปนายหน้า"></div><b>{n}</b> <span class="vf">✔ ยืนยันตัวตนแล้ว</span><div class="mu">{a}</div><div>⭐ {r} · {c} ประกาศ</div><a class="btn sm" href="contact.html">ติดต่อ</a> <span class="pill">ตัวอย่าง</span></div>' for n,a,r,c in [('คุณสมชาย','นครราชสีมา / บุรีรัมย์','4.8',32),('คุณสมหญิง','กรุงเทพฯ / นนทบุรี','4.9',41),('คุณวิชัย','เชียงใหม่ / ลำพูน','4.7',18),('คุณมาลี','ชลบุรี / ระยอง','4.8',27)])
pj=''.join(f'<div class="card"><div class="img v{i}" role="img" aria-label="ภาพโครงการ"><span class="tag">ใหม่</span><span class="ex">ตัวอย่าง</span></div><div class="cb"><h3>{n}</h3><div class="mu">{d}</div></div></div>' for i,(n,d) in enumerate([('โครงการที่ดินจัดสรร A','จ.สุรินทร์ · 24 แปลง'),('โครงการสวนเกษตร B','จ.บุรีรัมย์ · 12 แปลง'),('โครงการบ้านสวน C','จ.เชียงใหม่ · 30 แปลง')]))
page('agents.html','นายหน้าและโครงการ บ้านและที่ดิน | SMILELAND','รวมนายหน้าอสังหาริมทรัพย์ที่ยืนยันตัวตนแล้ว และโครงการที่ดินจัดสรรใหม่ทั่วประเทศ สมัครเป็นนายหน้ากับ SMILELAND',ph('นายหน้าและโครงการ','นายหน้าที่ยืนยันตัวตนแล้ว และโครงการใหม่')+f'''<div class="wrap sec"><h2>นายหน้าในพื้นที่</h2><div class="g4">{ag}</div><h2>โครงการใหม่</h2><div class="grid">{pj}</div>
<h2>สมัครเป็นนายหน้า</h2><form class="box form" data-demo><div class="row"><div><label>ชื่อ-นามสกุล</label><input required></div><div><label>เบอร์โทร</label><input type="tel" required></div><div><label>พื้นที่ที่ดูแล</label><select data-prov></select></div></div><label>เลขใบอนุญาต/ประสบการณ์</label><textarea rows="3"></textarea><p class="mu">ทีมงานตรวจสอบบัตรประชาชนและประวัติก่อนมอบป้าย ✔ ยืนยันตัวตนแล้ว</p><button class="btn">สมัครนายหน้า</button><div class="out"></div></form></div>''')

# 7 services
page('services.html','บริการของเรา ฝากขาย ประเมินราคา ตรวจโฉนด | SMILELAND','บริการครบวงจรด้านบ้านและที่ดิน ฝากขาย ฝากเช่า ประเมินราคา ตรวจสอบเอกสารสิทธิ์ จดหมายเหตุที่ดิน โดย SMILELAND',ph('บริการของเรา','ดูแลครบ ตั้งแต่ประเมินจนถึงโอน')+'''<div class="wrap sec"><div class="g3" style="text-align:center">
<div class="box"><div class="ico">🤝</div><h2>ฝากขาย/ฝากเช่า</h2><p>เป็นนายหน้าหาผู้ซื้อ ค่าบริการ 3% เมื่อขายได้</p><a class="btn" href="consign.html">ฝากเลย</a></div><div class="box"><div class="ico">📊</div><h2>ประเมินราคา</h2><p>ประเมินตามราคาตลาดจริงในพื้นที่ เทียบราคาประเมินราชการ</p></div><div class="box"><div class="ico">📜</div><h2>ตรวจโฉนด</h2><p>ตรวจสอบเอกสารสิทธิ์ ภาระผูกพัน แนวเขต ผังสี</p></div>
<div class="box"><div class="ico">🗂️</div><h2>จดหมายเหตุที่ดิน</h2><p>บันทึกประวัติแปลง ราคา และทุกเหตุการณ์ แบบแก้ไขย้อนหลังไม่ได้</p></div><div class="box"><div class="ico">📣</div><h2>โปรโมทประกาศ</h2><p>Facebook / Google Ads</p><a class="btn" href="promote.html">ดูแพ็กเกจ</a></div><div class="box"><div class="ico">🔍</div><h2>SEO</h2><p>ดันประกาศให้ติดอันดับ Google</p><a class="btn" href="seo.html">รายละเอียด</a></div></div>
<h2>ขั้นตอนการใช้บริการ</h2><div class="steps"><div class="st4"><b>1</b>แจ้งความต้องการ</div><div class="st4"><b>2</b>นัดสำรวจพื้นที่</div><div class="st4"><b>3</b>รับรายงาน/ใบเสนอ</div><div class="st4"><b>4</b>ดำเนินการ</div></div></div>''')

# 8 seo
page('seo.html','บริการ SEO ดันประกาศบ้านและที่ดินติด Google | SMILELAND','บริการ SEO สำหรับประกาศบ้านและที่ดิน วิจัยคีย์เวิร์ด ปรับ Title/Meta บทความคุณภาพ และรายงานอันดับรายเดือน',ph('บริการ SEO','ดันประกาศและเว็บไซต์ของคุณให้ติดอันดับ Google')+'''<div class="wrap sec"><div class="g3"><div class="box"><h2 style="margin-top:0">🔑 วิจัยคีย์เวิร์ด</h2><div class="chips"><span>ขายที่ดินโคราช</span><span>บ้านมือสองนนทบุรี</span><span>ที่ดินเชียงใหม่ราคาถูก</span><span>ฝากขายที่ดิน</span><span>คอนโดให้เช่าใกล้ BTS</span></div></div>
<div class="box"><h2 style="margin-top:0">✍️ ปรับเนื้อหา</h2><ul><li>Title / Meta description</li><li>บทความคุณภาพ</li><li>รูปภาพ &amp; Alt text</li><li>ลิงก์ภายใน</li></ul></div><div class="box"><h2 style="margin-top:0">แพ็กเกจ SEO</h2><div class="pr">ราคาตามใบเสนอ</div><ul><li>คีย์เวิร์ดตามแพ็กเกจ</li><li>บทความรายเดือน</li><li>รายงานรายเดือน</li></ul><a class="btn" href="contact.html">ขอใบเสนอราคา</a></div></div>
<div class="box"><h2 style="margin-top:0">📈 รายงานประจำเดือน (ตัวอย่าง)</h2><table><tr><th>คีย์เวิร์ด</th><th>อันดับ</th><th>เปลี่ยนแปลง</th></tr><tr><td>ขายที่ดินโคราช</td><td>3</td><td>▲5</td></tr><tr><td>บ้านมือสองนนทบุรี</td><td>7</td><td>▲2</td></tr><tr><td>ฝากขายที่ดิน</td><td>12</td><td>▲8</td></tr></table></div></div>''')

# 9 tools
page('tools.html','เครื่องมือคำนวณ แปลงหน่วยที่ดิน ผ่อนสินเชื่อ ค่าโอน | SMILELAND','เครื่องมือฟรี แปลงหน่วย ไร่ งาน ตารางวา ตารางเมตร คำนวณผ่อนสินเชื่อ และประมาณการค่าโอนที่ดิน',ph('เครื่องมือ','ช่วยคำนวณก่อนตัดสินใจ')+'''<div class="wrap sec"><div class="g3">
<div class="box"><h2 style="margin-top:0">📐 แปลงหน่วย</h2><div class="row"><div><label>ไร่</label><input id="r" type="number" value="2"></div><div><label>งาน</label><input id="n" type="number" value="1"></div><div><label>ตร.ว.</label><input id="w" type="number" value="50"></div></div><table class="kv" id="cv"></table>
<label>หรือ ตร.ม. → ไร่-งาน-ตร.ว.</label><input id="sqm" type="number" placeholder="เช่น 3800"><p id="sqo"></p><p class="mu">1 ไร่ = 4 งาน = 400 ตร.ว. = 1,600 ตร.ม.</p></div>
<div class="box"><h2 style="margin-top:0">🏦 ผ่อนสินเชื่อ</h2><label>ราคา (บาท)</label><input id="lp" type="number" value="1250000"><label>เงินดาวน์ (%)</label><input id="ld" type="number" value="20"><label>ดอกเบี้ย (%/ปี)</label><input id="lr" type="number" value="6.5" step="0.1"><label>ระยะเวลา (ปี)</label><input id="ly" type="number" value="15"><p>ผ่อนต่อเดือนประมาณ <b class="pr" id="lo"></b></p><p class="mu" id="lt"></p></div>
<div class="box"><h2 style="margin-top:0">🧾 ค่าโอน (ประมาณการ)</h2><label>ราคาประเมินราชการ (บาท)</label><input id="ta" type="number" value="1000000"><label>ราคาซื้อขายจริง (บาท)</label><input id="ts" type="number" value="1250000"><label>ถือครองเกิน 5 ปี / มีชื่อในทะเบียนบ้าน ≥1 ปี?</label><select id="th"><option value="0">ไม่ (เสียภาษีธุรกิจเฉพาะ)</option><option value="1">ใช่ (เสียอากรแสตมป์)</option></select>
<table class="kv" id="to"></table><p class="mu">ประมาณการเท่านั้น: ค่าธรรมเนียมโอน 2% ของราคาประเมิน, ภาษีธุรกิจเฉพาะ 3.3% หรืออากรแสตมป์ 0.5% ของราคาที่สูงกว่า, ภาษีเงินได้หัก ณ ที่จ่ายประมาณ 1% (คำนวณจริงตามอัตราก้าวหน้าและปีที่ถือครอง) <b>ควรตรวจสอบกับกรมที่ดิน</b></p></div></div></div>''','''<script>
const $=i=>document.getElementById(i),B=SL.baht;
function cv(){const t=(+$('r').value||0)*400+(+$('n').value||0)*100+(+$('w').value||0);$('cv').innerHTML=`<tr><td>ตารางวา</td><td>${t.toLocaleString()} ตร.ว.</td></tr><tr><td>ตารางเมตร</td><td>${(t*4).toLocaleString()} ตร.ม.</td></tr><tr><td>ไร่ (ทศนิยม)</td><td>${(t/400).toFixed(4)} ไร่</td></tr><tr><td>เอเคอร์</td><td>${(t*4/4046.86).toFixed(2)}</td></tr>`;
const s=+$('sqm').value;if(s){const w=s/4;$('sqo').textContent=`${Math.floor(w/400)} ไร่ ${Math.floor(w%400/100)} งาน ${(w%100).toFixed(1)} ตร.ว.`}else $('sqo').textContent=''}
function ln(){const P=$('lp').value*(1-$('ld').value/100),m=SL.loan(P,+$('lr').value,+$('ly').value||1);$('lo').textContent=B(m);$('lt').textContent=`ยอดกู้ ${B(P)} · ดอกเบี้ยรวม ${B(m*$('ly').value*12-P)}`}
function tf(){const a=+$('ta').value,s=+$('ts').value,mx=Math.max(a,s),h=$('th').value==='1';const fee=a*.02,sbt=h?0:mx*.033,st=h?mx*.005:0,wht=a*.01;
$('to').innerHTML=`<tr><td>ค่าธรรมเนียมโอน 2%</td><td>${B(fee)}</td></tr><tr><td>ภาษีธุรกิจเฉพาะ 3.3%</td><td>${B(sbt)}</td></tr><tr><td>อากรแสตมป์ 0.5%</td><td>${B(st)}</td></tr><tr><td>ภาษีหัก ณ ที่จ่าย (~1%)</td><td>${B(wht)}</td></tr><tr><td><b>รวมโดยประมาณ</b></td><td><b>${B(fee+sbt+st+wht)}</b></td></tr>`}
document.querySelectorAll('input,select').forEach(x=>x.addEventListener('input',()=>{cv();ln();tf()}));cv();ln();tf();
</script>''')

# 10 news
arts=''.join(f'<article class="card"><div class="img v{i%4}" role="img" aria-label="ภาพประกอบบทความ"><span class="ex">ตัวอย่าง</span></div><div class="cb"><h3>{t}</h3><div class="mu">{c}</div></div></article>' for i,(t,c) in enumerate([('5 สิ่งต้องเช็กก่อนซื้อที่ดิน','บทความ · 12 ต.ค. 2026'),('โฉนด vs น.ส.3 ต่างกันอย่างไร','บทความ · 8 ต.ค. 2026'),('ภาษีที่ดินและสิ่งปลูกสร้าง 2026 ที่ควรรู้','ข่าว · 2 ต.ค. 2026'),('แนวโน้มราคาบ้านและที่ดินทั่วประเทศ','ข่าว · 28 ก.ย. 2026'),('ขั้นตอนโอนที่ดินที่สำนักงานที่ดิน','บทความ · 20 ก.ย. 2026'),('ผังสีผังเมืองคืออะไร สร้างอะไรได้บ้าง','บทความ · 15 ก.ย. 2026')]))
page('news.html','ความรู้และข่าวสาร บ้านและที่ดิน | SMILELAND','บทความความรู้เรื่องที่ดิน เอกสารสิทธิ์ ภาษี การโอน และถาม-ตอบกับกูรูอสังหาริมทรัพย์',ph('ความรู้และข่าวสาร','บทความ ข่าว และถาม-ตอบกับผู้เชี่ยวชาญ')+f'''<div class="wrap sec"><div class="dl"><div><h2>📰 ข่าวและบทความ</h2><div class="grid">{arts}</div></div><aside><h2>💬 ถามกูรู</h2>
<div class="box"><b>ถาม: ที่ดิน ส.ป.ก. ขายได้ไหม?</b><p class="mu">💡 กูรูตอบแล้ว · ตัวอย่าง</p></div><div class="box"><b>ถาม: ค่าโอนที่ดินใครจ่าย?</b><p class="mu">💡 กูรูตอบแล้ว · ตัวอย่าง</p></div><div class="box"><b>ถาม: ที่ดินตาบอดทำอย่างไร?</b><p class="mu">💡 กูรูตอบแล้ว · ตัวอย่าง</p></div>
<form class="box form" data-demo><label>ส่งคำถาม</label><textarea rows="3" required></textarea><p><button class="btn">ส่งคำถาม</button></p><div class="out"></div></form></aside></div></div>''')

# 11 app
page('app.html','แอปมือถือ SMILELAND iOS และ Android (เร็ว ๆ นี้) | SMILELAND','แอป SMILELAND บน iOS และ Android ค้นหาบ้านและที่ดิน ลงประกาศ ฝากขาย แจ้งเตือนประกาศใหม่ เปิดให้ดาวน์โหลดเร็ว ๆ นี้',ph('แอปมือถือ','ค้นหาและจัดการประกาศได้ทุกที่ — เร็ว ๆ นี้ บน iOS และ Android')+'''<div class="wrap sec g2" style="align-items:center"><div class="phone" role="img" aria-label="ภาพตัวอย่างหน้าจอแอป"><b style="color:var(--gd)">SMILELAND</b><div class="img v1" style="height:120px;border-radius:10px;margin:8px 0"></div><b>฿1,250,000</b><div class="mu">นครราชสีมา · 2 ไร่</div><div class="box" style="padding:8px;margin-top:8px">🔔 มีประกาศใหม่ตรงกับที่คุณสนใจ</div><div class="box" style="padding:8px">❤️ ราคาในรายการโปรดลดลง</div></div>
<div><h2>ฟีเจอร์</h2><div class="chips"><span>🔍 ค้นหาตามพื้นที่</span><span>📝 ลงประกาศได้ทันที</span><span>🤝 ฝากขายผ่านแอป</span><span>🔔 แจ้งเตือนประกาศใหม่</span><span>❤️ บันทึกรายการโปรด</span><span>📞 ติดต่อทีมงาน</span></div>
<p><span class="store"> App Store — เร็ว ๆ นี้</span><span class="store">▶ Google Play — เร็ว ๆ นี้</span></p><form class="box form" data-demo><label>รับแจ้งเตือนเมื่อแอปพร้อม (อีเมล)</label><input type="email" required><p><button class="btn">แจ้งฉัน</button></p><div class="out"></div></form></div></div>''')

# 12 about
page('about.html','เกี่ยวกับเรา SMILELAND สไมล์แลนด์ ที่ดินยิ้ม','SMILELAND สไมล์แลนด์ ที่ดินยิ้ม ผู้ให้บริการฝากขาย ฝากเช่า ลงประกาศ และจดหมายเหตุที่ดิน ทั่วประเทศ',ph('เกี่ยวกับเรา','SMILELAND · สไมล์แลนด์ · ที่ดินยิ้ม / ยิ้มที่ดิน')+'''<div class="wrap sec"><div class="g2"><div><p>SMILELAND ให้บริการด้านบ้านและที่ดินทั่วประเทศ ทั้งฝากขาย ฝากเช่า ลงประกาศ ประเมินราคา และตรวจสอบเอกสารสิทธิ์ พร้อมระบบจดหมายเหตุที่ดินที่บันทึกประวัติของทุกแปลงอย่างโปร่งใส</p>
<div class="box"><b>🎯 พันธกิจ</b><p>ทำให้การซื้อขายที่ดินโปร่งใส ปลอดภัย และทำให้ทุกฝ่าย “ยิ้ม” ได้</p></div><div class="box"><b>👁️ วิสัยทัศน์</b><p>เป็นศูนย์กลางข้อมูลบ้านและที่ดินที่เชื่อถือได้ของคนไทย</p></div></div>
<div class="map" style="height:300px">🏢 ภาพสำนักงาน (Placeholder)</div></div>
<div class="g4" style="text-align:center;margin-top:20px"><div class="box"><div class="pr">77</div>จังหวัดที่รับประกาศ</div><div class="box"><div class="pr">1,200+</div>ประกาศ</div><div class="box"><div class="pr">350+</div>ฝากขายสำเร็จ</div><div class="box"><div class="pr">20+</div>ทีมงาน</div></div><p class="mu">* ตัวเลขตัวอย่าง</p></div>''')

# 13 contact
page('contact.html','ติดต่อเรา SMILELAND โทร LINE อีเมล','ติดต่อ SMILELAND สอบถามข้อมูล นัดดูบ้านและที่ดิน ฝากขาย ฝากเช่า ทางโทรศัพท์ LINE หรืออีเมล',ph('ติดต่อเรา','สอบถามข้อมูลหรือนัดดูทรัพย์ได้ทุกวัน')+'''<div class="wrap sec g2"><div><div class="map" style="height:280px">🗺️ แผนที่สำนักงาน (Placeholder)</div><p>📞 โทร <a href="tel:0X-XXX-XXXX">0X-XXX-XXXX</a> · ✉️ info@example.com</p><a class="btn ln" href="#">LINE แอดไลน์</a></div>
<form class="box form" data-demo><label>ชื่อ</label><input required><label>เบอร์โทร</label><input type="tel" required><label>เรื่องที่ติดต่อ</label><select><option>สอบถามประกาศ</option><option>ฝากขาย/ฝากเช่า</option><option>โปรโมท/SEO</option><option>อื่น ๆ</option></select><label>ข้อความ</label><textarea rows="4"></textarea><p><button class="btn">ส่งข้อความ</button></p><div class="out"></div></form></div>''')
print('ok')
