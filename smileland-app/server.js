'use strict';
// SMILELAND server — Node.js >=18, no npm dependencies
const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto'), { URL } = require('url');
const PORT = +process.env.PORT || 3000;
const ROOT = __dirname, PUB = path.join(ROOT, 'public'), DATA = path.join(ROOT, 'data'), UP = path.join(ROOT, 'uploads');
for (const d of [DATA, UP]) fs.mkdirSync(d, { recursive: true });
const MAX_FILE = 5 * 1024 * 1024, MAX_FILES = 8, MAX_BODY = 45 * 1024 * 1024;

// ---------- storage (atomic JSON) ----------
function readJSON(f, def) { try { return JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf8')); } catch { return def; } }
function writeJSON(f, obj) { const p = path.join(DATA, f), t = p + '.' + process.pid + '.tmp'; fs.writeFileSync(t, JSON.stringify(obj, null, 1)); fs.renameSync(t, p); }
let records = readJSON('records.json', null);
const now = () => new Date().toISOString();
function ev(r, by, event, detail) { r.timeline.push({ at: now(), by, event, detail: detail || '' }); r.updated = now(); }
function save() { writeJSON('records.json', records); }

// ---------- seed ----------
if (!records) {
  const S = [
    ['ที่ดินติดถนนลาดยาง เหมาะสร้างบ้าน', 'นครราชสีมา', 'ปากช่อง', 'หนองสาหร่าย', 1250000, 2, 1, 50, 'โฉนด (น.ส.4จ.)', 'เขียว', 'ที่ดิน', 'ขาย', '3 กม. ถึงถนนมิตรภาพ'],
    ['ที่นาพร้อมบ่อน้ำ', 'บุรีรัมย์', 'เมืองบุรีรัมย์', 'อิสาณ', 890000, 5, 0, 0, 'น.ส.3ก.', 'เขียว', 'ที่ดิน', 'ขาย', '8 กม. ถึงตัวเมือง'],
    ['บ้านเดี่ยว 2 ชั้น ใกล้ตลาด', 'สุรินทร์', 'เมืองสุรินทร์', 'ในเมือง', 2400000, 0, 1, 20, 'โฉนด (น.ส.4จ.)', 'เหลือง', 'บ้าน', 'ขาย', '1 กม. ถึงตลาด'],
    ['สวนยางพาราให้ผลแล้ว', 'ศรีสะเกษ', 'กันทรลักษ์', 'น้ำอ้อม', 1650000, 8, 3, 20, 'น.ส.3ก.', 'เขียว', 'ที่ดิน', 'ขาย', '12 กม. ถึงอำเภอ'],
    ['ที่ดินริมแม่น้ำมูล วิวสวย', 'อุบลราชธานี', 'วารินชำราบ', 'ธาตุ', 3900000, 3, 0, 75, 'โฉนด (น.ส.4จ.)', 'เหลือง', 'ที่ดิน', 'ขาย', 'ติดแม่น้ำมูล'],
    ['คอนโด 1 ห้องนอน ใกล้ BTS', 'กรุงเทพมหานคร', 'จตุจักร', 'จอมพล', 12000, 0, 0, 8, 'หนังสือกรรมสิทธิ์ห้องชุด (อ.ช.2)', 'แดง', 'คอนโด', 'เช่า', '400 ม. ถึง BTS'],
    ['ทาวน์โฮม 3 ห้องนอน หมู่บ้านใหม่', 'นนทบุรี', 'บางบัวทอง', 'พิมลราช', 2890000, 0, 0, 21, 'โฉนด (น.ส.4จ.)', 'เหลือง', 'ทาวน์โฮม', 'ขาย', '2 กม. ถึงรถไฟฟ้าสายสีม่วง'],
    ['ที่ดินเปล่า ถมแล้ว ใกล้นิคม', 'ชลบุรี', 'ศรีราชา', 'บึง', 4500000, 1, 0, 0, 'โฉนด (น.ส.4จ.)', 'ม่วง', 'ที่ดิน', 'ขาย', '5 กม. ถึงนิคมแหลมฉบัง'],
    ['ที่ดินวิวดอย บรรยากาศดี', 'เชียงใหม่', 'แม่ริม', 'ริมเหนือ', 2200000, 1, 2, 0, 'โฉนด (น.ส.4จ.)', 'เขียว', 'ที่ดิน', 'ขาย', '20 นาทีถึงตัวเมือง'],
    ['สวนผลไม้ ทุเรียน มังคุด', 'จันทบุรี', 'ท่าใหม่', 'เขาวัว', 6800000, 10, 0, 0, 'โฉนด (น.ส.4จ.)', 'เขียว', 'ที่ดิน', 'ขาย', 'ติดถนนสาธารณะ'],
    ['ที่ดินให้เช่าทำการเกษตร', 'ขอนแก่น', 'น้ำพอง', 'กุดน้ำใส', 15000, 6, 0, 0, 'น.ส.3ก.', 'เขียว', 'ที่ดิน', 'เช่า', 'ค่าเช่าต่อปี · ติดคลองชลประทาน'],
    ['บ้านสวนพร้อมสระน้ำ', 'ชัยภูมิ', 'เมืองชัยภูมิ', 'นาฝาย', 1890000, 2, 0, 0, 'โฉนด (น.ส.4จ.)', 'เขียว', 'บ้าน', 'ขาย', '6 กม. ถึงตัวเมือง'],
    ['ที่ดินติดถนนใหญ่ ทำเลค้าขาย', 'อุดรธานี', 'เมืองอุดรธานี', 'หมากแข้ง', 5200000, 0, 2, 0, 'โฉนด (น.ส.4จ.)', 'แดง', 'ที่ดิน', 'ขาย', '1.5 กม. ถึงเซ็นทรัล'],
    ['ที่ดินใกล้ทะเล เหมาะทำรีสอร์ต', 'ประจวบคีรีขันธ์', 'หัวหิน', 'หนองแก', 9500000, 1, 1, 0, 'โฉนด (น.ส.4จ.)', 'เหลือง', 'ที่ดิน', 'ขาย', '800 ม. ถึงชายหาด'],
    ['ที่นาแปลงใหญ่ น้ำดี', 'ยโสธร', 'เมืองยโสธร', 'ตาดทอง', 1350000, 12, 0, 0, 'น.ส.3ก.', 'เขียว', 'ที่ดิน', 'ขาย', '10 กม. ถึงตัวเมือง'],
    ['ทาวน์โฮมให้เช่า ใกล้มหาวิทยาลัย', 'นครราชสีมา', 'เมืองนครราชสีมา', 'สุรนารี', 7500, 0, 0, 18, 'โฉนด (น.ส.4จ.)', 'เหลือง', 'ทาวน์โฮม', 'เช่า', '1 กม. ถึง มทส.'],
  ];
  records = S.map((s, i) => {
    const t = new Date(Date.now() - (i + 1) * 86400000 * 2).toISOString();
    const r = { id: 'SL-' + String(1001 + i), ref: 'SAMPLE-' + (1001 + i), kind: i % 3 ? 'post' : 'consign', sample: true, title: s[0], province: s[1], district: s[2], subdistrict: s[3], price: s[4], rai: s[5], ngan: s[6], wa: s[7], ptype: s[10], deal: s[11], nearby: s[12],
      deed: { type: s[8], number: 'ตัวอย่าง-' + (2000 + i), zone: s[9] }, owner: { name: 'เจ้าของตัวอย่าง', phone: '0X-XXX-XXXX', line: '', email: '' },
      desc: 'ข้อมูลตัวอย่างสำหรับทดสอบระบบ ' + s[0] + ' ' + s[12], photos: [], status: 'approved', featured: i < 6, created: t, updated: t,
      priceHistory: [{ at: t, price: s[4], by: 'ระบบ (ข้อมูลตัวอย่าง)' }], timeline: [{ at: t, by: 'ระบบ', event: 'submitted', detail: 'สร้างข้อมูลตัวอย่าง' }, { at: t, by: 'ระบบ', event: 'approved', detail: 'อนุมัติข้อมูลตัวอย่าง' }] };
    return r;
  });
  save();
}

// ---------- admin auth ----------
function hashPw(pw, salt = crypto.randomBytes(16).toString('hex')) { return { salt, hash: crypto.scryptSync(pw, salt, 64).toString('hex') }; }
function checkPw(pw, a) { const h = crypto.scryptSync(pw, a.salt, 64); return crypto.timingSafeEqual(h, Buffer.from(a.hash, 'hex')); }
let admin = readJSON('admin.json', null);
if (!admin) {
  const pw = crypto.randomBytes(9).toString('base64url');
  admin = { username: 'admin', ...hashPw(pw), mustChange: true };
  writeJSON('admin.json', admin);
  fs.writeFileSync(path.join(DATA, 'ADMIN-FIRST-LOGIN.txt'), `SMILELAND admin (first run)\nURL: http://localhost:${PORT}/admin\nusername: admin\npassword: ${pw}\nกรุณาเปลี่ยนรหัสผ่านหลังเข้าสู่ระบบ แล้วลบไฟล์นี้\n`);
  console.log(`\n[ADMIN] สร้างบัญชีผู้ดูแลครั้งแรก  username: admin  password: ${pw}\n        (บันทึกไว้ที่ data/ADMIN-FIRST-LOGIN.txt — เปลี่ยนรหัสผ่านหลังเข้าสู่ระบบ)\n`);
}
const sessions = new Map(); // sid -> {csrf, exp}
function getSession(req) {
  const m = /(?:^|;\s*)sl_sid=([a-f0-9]{64})/.exec(req.headers.cookie || ''); if (!m) return null;
  const s = sessions.get(m[1]); if (!s || s.exp < Date.now()) { sessions.delete(m[1]); return null; }
  s.exp = Date.now() + 8 * 3600e3; s.sid = m[1]; return s;
}

// ---------- rate limit ----------
const hits = new Map();
function limited(key, max, winMs) { const t = Date.now(), a = (hits.get(key) || []).filter(x => x > t - winMs); a.push(t); hits.set(key, a); return a.length > max; }
const ip = req => req.socket.remoteAddress || '';

// ---------- helpers ----------
function send(res, code, obj, headers = {}) { const b = JSON.stringify(obj); res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers }); res.end(b); }
function readBody(req, limit) {
  return new Promise((ok, no) => { const ch = []; let n = 0;
    req.on('data', c => { n += c.length; if (n > limit) { no(Object.assign(new Error('ไฟล์/ข้อมูลใหญ่เกินกำหนด'), { code: 413 })); req.destroy(); } else ch.push(c); });
    req.on('end', () => ok(Buffer.concat(ch))); req.on('error', no); });
}
function parseMultipart(buf, ctype) {
  const m = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(ctype || ''); if (!m) throw Object.assign(new Error('bad form'), { code: 400 });
  const bd = Buffer.from('--' + (m[1] || m[2])), fields = {}, files = [];
  let pos = buf.indexOf(bd); 
  while (pos !== -1) {
    const start = pos + bd.length; if (buf.slice(start, start + 2).toString() === '--') break;
    const next = buf.indexOf(bd, start); if (next === -1) break;
    const part = buf.slice(start + 2, next - 2), he = part.indexOf('\r\n\r\n');
    const head = part.slice(0, he).toString('utf8'), body = part.slice(he + 4);
    const name = (/name="([^"]*)"/.exec(head) || [])[1], fn = (/filename="([^"]*)"/.exec(head) || [])[1];
    if (name) { if (fn !== undefined) { if (body.length) files.push({ name, filename: fn, data: body }); } else fields[name] = body.toString('utf8'); }
    pos = next;
  }
  return { fields, files };
}
function imgType(b) {
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpg';
  if (b.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (b.slice(0, 4).toString() === 'RIFF' && b.slice(8, 12).toString() === 'WEBP') return 'webp';
  return null;
}
const str = (v, max = 200) => String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);
const strML = (v, max = 3000) => String(v == null ? '' : v).replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, '').trim().slice(0, max);
const num = v => { const n = Number(String(v || '').replace(/[, ]/g, '')); return isFinite(n) && n >= 0 ? n : NaN; };
const DEALS = ['ขาย', 'เช่า'], PTYPES = ['ที่ดิน', 'บ้าน', 'คอนโด', 'ทาวน์โฮม', 'อาคารพาณิชย์'];
const DEEDS = ['โฉนด (น.ส.4จ.)', 'น.ส.3ก.', 'น.ส.3', 'หนังสือกรรมสิทธิ์ห้องชุด (อ.ช.2)', 'ส.ป.ก. 4-01', 'อื่น ๆ'];
const ZONES = ['ไม่ทราบ', 'เหลือง', 'ส้ม', 'น้ำตาล', 'แดง', 'ม่วง', 'เขียว', 'เขียวลายขาว', 'น้ำเงิน', 'อื่น ๆ'];
function publicView(r) {
  return { id: r.id, title: r.title, kind: r.kind, deal: r.deal, ptype: r.ptype, province: r.province, district: r.district, subdistrict: r.subdistrict,
    price: r.price, rai: r.rai, ngan: r.ngan, wa: r.wa, deed: { type: r.deed.type, zone: r.deed.zone }, nearby: r.nearby, desc: r.desc, photos: r.photos,
    status: r.status, sample: !!r.sample, featured: !!r.featured, created: r.created, updated: r.updated };
}
const STATUS_TH = { pending: 'รอพิจารณา', info: 'ขอข้อมูลเพิ่มเติม', approved: 'อนุมัติแล้ว (เผยแพร่)', rejected: 'ไม่อนุมัติ', sold: 'ขายแล้ว', rented: 'ให้เช่าแล้ว', unpublished: 'ปิดการเผยแพร่' };

// ---------- API ----------
async function api(req, res, u) {
  const p = u.pathname, M = req.method;
  if (M === 'GET' && p === '/api/listings') {
    const q = u.searchParams; let L = records.filter(r => ['approved', 'sold', 'rented'].includes(r.status));
    if (q.get('featured')) L = L.filter(r => r.featured && r.status === 'approved');
    L.sort((a, b) => b.updated.localeCompare(a.updated));
    return send(res, 200, { items: L.map(publicView) });
  }
  let m;
  if (M === 'GET' && (m = /^\/api\/listings\/([\w-]{1,20})$/.exec(p))) {
    const r = records.find(x => x.id === m[1] && ['approved', 'sold', 'rented'].includes(x.status));
    return r ? send(res, 200, publicView(r)) : send(res, 404, { error: 'ไม่พบประกาศ' });
  }
  if (M === 'POST' && p === '/api/submit') {
    if (limited('sub:' + ip(req), 5, 10 * 60e3)) return send(res, 429, { error: 'ส่งข้อมูลบ่อยเกินไป กรุณารอสักครู่' });
    const buf = await readBody(req, MAX_BODY), { fields: f, files } = parseMultipart(buf, req.headers['content-type']);
    const err = [];
    const kind = f.kind === 'consign' ? 'consign' : f.kind === 'post' ? 'post' : null; if (!kind) err.push('ประเภทฟอร์มไม่ถูกต้อง');
    const deal = DEALS.includes(f.deal) ? f.deal : (err.push('เลือก ขาย/เช่า'), '');
    const ptype = PTYPES.includes(f.ptype) ? f.ptype : (err.push('เลือกประเภททรัพย์'), '');
    const title = str(f.title, 120); if (title.length < 5) err.push('หัวข้อประกาศอย่างน้อย 5 ตัวอักษร');
    const province = str(f.province, 60), district = str(f.district, 60), subdistrict = str(f.subdistrict, 60);
    if (!province) err.push('ระบุจังหวัด'); if (!district) err.push('ระบุอำเภอ');
    const price = num(f.price); if (!(price > 0) || price > 1e10) err.push('ราคาไม่ถูกต้อง');
    const rai = num(f.rai || 0), ngan = num(f.ngan || 0), wa = num(f.wa || 0);
    if ([rai, ngan, wa].some(isNaN) || ngan >= 4 || wa >= 100 || rai > 1e5 || rai + ngan + wa <= 0) err.push('เนื้อที่ไม่ถูกต้อง (งาน < 4, ตร.ว. < 100)');
    const name = str(f.name, 80), phone = str(f.phone, 20).replace(/[^\d]/g, ''); if (!name) err.push('ระบุชื่อผู้ติดต่อ');
    if (!/^0\d{8,9}$/.test(phone)) err.push('เบอร์โทรไม่ถูกต้อง');
    if (kind === 'consign' && f.agree !== 'yes') err.push('กรุณายอมรับเงื่อนไขฝากขาย/ฝากเช่า');
    const deedType = DEEDS.includes(f.deedType) ? f.deedType : 'อื่น ๆ', zone = ZONES.includes(f.zone) ? f.zone : 'ไม่ทราบ';
    if (files.length > MAX_FILES) err.push(`อัปโหลดรูปได้ไม่เกิน ${MAX_FILES} รูป`);
    const imgs = [];
    for (const fl of files.slice(0, MAX_FILES)) { const t = imgType(fl.data);
      if (!t) err.push(`ไฟล์ ${str(fl.filename, 40)} ไม่ใช่รูป JPG/PNG/WEBP`); else if (fl.data.length > MAX_FILE) err.push(`ไฟล์ ${str(fl.filename, 40)} ใหญ่เกิน 5MB`); else imgs.push({ t, d: fl.data }); }
    if (err.length) return send(res, 400, { error: 'ข้อมูลไม่ถูกต้อง', details: err });
    const id = 'SL-' + (Math.max(1000, ...records.map(r => +r.id.slice(3) || 0)) + 1);
    const ref = 'SL' + new Date().toISOString().slice(2, 7).replace('-', '') + '-' + crypto.randomBytes(3).toString('hex').toUpperCase();
    const photos = imgs.map((x, i) => { const fn = `${id}-${Date.now()}-${i}.${x.t}`; fs.writeFileSync(path.join(UP, fn), x.d); return 'uploads/' + fn; });
    const t = now(), by = 'ผู้ส่ง: ' + name;
    const r = { id, ref, kind, sample: false, title, province, district, subdistrict, price, rai, ngan, wa, ptype, deal, nearby: str(f.nearby, 120),
      deed: { type: deedType, number: str(f.deedNo, 40), zone }, owner: { name, phone, line: str(f.line, 40), email: str(f.email, 80) },
      desc: strML(f.desc), photos, status: 'pending', featured: false, created: t, updated: t, priceHistory: [{ at: t, price, by }], timeline: [] };
    ev(r, by, 'submitted', (kind === 'consign' ? 'ส่งคำขอฝาก' + deal : 'ส่งประกาศ' + deal) + ` · รูป ${photos.length} รูป`);
    records.push(r); save();
    return send(res, 201, { ok: true, ref, status: STATUS_TH.pending });
  }
  if (M === 'GET' && p === '/api/status') {
    if (limited('st:' + ip(req), 30, 10 * 60e3)) return send(res, 429, { error: 'ตรวจสอบบ่อยเกินไป' });
    const ref = str(u.searchParams.get('ref'), 30).toUpperCase(), ph = str(u.searchParams.get('phone'), 20).replace(/\D/g, '');
    const r = records.find(x => x.ref === ref && x.owner.phone === ph && !x.sample);
    if (!r) return send(res, 404, { error: 'ไม่พบข้อมูล ตรวจสอบเลขอ้างอิงและเบอร์โทร' });
    const last = [...r.timeline].reverse().find(e => ['rejected', 'info', 'approved'].includes(e.event));
    return send(res, 200, { ref: r.ref, title: r.title, status: r.status, statusText: STATUS_TH[r.status], note: last && last.event !== 'approved' ? last.detail : '', listingId: r.status === 'approved' ? r.id : null, updated: r.updated });
  }
  // ----- admin -----
  if (p === '/api/admin/login' && M === 'POST') {
    if (limited('login:' + ip(req), 10, 10 * 60e3)) return send(res, 429, { error: 'พยายามเข้าสู่ระบบบ่อยเกินไป' });
    if (!sameOrigin(req)) return send(res, 403, { error: 'origin' });
    const b = JSON.parse((await readBody(req, 1e4)).toString() || '{}');
    if (b.username !== admin.username || !checkPw(String(b.password || ''), admin)) return send(res, 401, { error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
    const sid = crypto.randomBytes(32).toString('hex'), csrf = crypto.randomBytes(24).toString('hex');
    sessions.set(sid, { csrf, exp: Date.now() + 8 * 3600e3 });
    return send(res, 200, { ok: true, csrf, mustChange: !!admin.mustChange }, { 'Set-Cookie': `sl_sid=${sid}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800` });
  }
  if (!p.startsWith('/api/admin/')) return send(res, 404, { error: 'not found' });
  const s = getSession(req); if (!s) return send(res, 401, { error: 'กรุณาเข้าสู่ระบบ' });
  if (M === 'POST' && (!sameOrigin(req) || req.headers['x-csrf-token'] !== s.csrf)) return send(res, 403, { error: 'CSRF token ไม่ถูกต้อง' });
  const body = M === 'POST' ? JSON.parse((await readBody(req, 1e5)).toString() || '{}') : {};
  if (p === '/api/admin/me') return send(res, 200, { username: admin.username, csrf: s.csrf, mustChange: !!admin.mustChange });
  if (p === '/api/admin/logout' && M === 'POST') { sessions.delete(s.sid); return send(res, 200, { ok: true }, { 'Set-Cookie': 'sl_sid=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0' }); }
  if (p === '/api/admin/password' && M === 'POST') {
    if (!checkPw(String(body.current || ''), admin)) return send(res, 400, { error: 'รหัสผ่านปัจจุบันไม่ถูกต้อง' });
    if (String(body.next || '').length < 10) return send(res, 400, { error: 'รหัสผ่านใหม่อย่างน้อย 10 ตัวอักษร' });
    admin = { username: admin.username, ...hashPw(String(body.next)), mustChange: false }; writeJSON('admin.json', admin);
    try { fs.unlinkSync(path.join(DATA, 'ADMIN-FIRST-LOGIN.txt')); } catch {}
    for (const k of sessions.keys()) if (k !== s.sid) sessions.delete(k);
    return send(res, 200, { ok: true });
  }
  if (p === '/api/admin/dashboard') { const c = {}; for (const r of records) c[r.status] = (c[r.status] || 0) + 1; return send(res, 200, { counts: c, total: records.length, labels: STATUS_TH }); }
  if (p === '/api/admin/records' && M === 'GET') {
    const q = str(u.searchParams.get('q'), 80).toLowerCase(), st = u.searchParams.get('status') || '';
    let L = records.filter(r => (!st || st.split(',').includes(r.status)) && (!q || [r.id, r.ref, r.title, r.province, r.district, r.subdistrict, r.owner.name, r.owner.phone, r.deed.number].join(' ').toLowerCase().includes(q)));
    L = [...L].sort((a, b) => b.updated.localeCompare(a.updated));
    return send(res, 200, { items: L.map(r => ({ id: r.id, ref: r.ref, title: r.title, kind: r.kind, deal: r.deal, province: r.province, district: r.district, price: r.price, status: r.status, statusText: STATUS_TH[r.status], owner: r.owner.name, sample: r.sample, updated: r.updated })) });
  }
  if ((m = /^\/api\/admin\/records\/([\w-]{1,20})$/.exec(p)) && M === 'GET') { const r = records.find(x => x.id === m[1]); return r ? send(res, 200, { ...r, statusText: STATUS_TH[r.status] }) : send(res, 404, { error: 'ไม่พบ' }); }
  if ((m = /^\/api\/admin\/records\/([\w-]{1,20})\/action$/.exec(p)) && M === 'POST') {
    const r = records.find(x => x.id === m[1]); if (!r) return send(res, 404, { error: 'ไม่พบ' });
    const a = body.action, reason = strML(body.reason, 1000), by = 'แอดมิน: ' + admin.username;
    const need = () => { if (!reason) throw Object.assign(new Error('กรุณาระบุเหตุผล'), { code: 400 }); };
    switch (a) {
      case 'approve': r.status = 'approved'; ev(r, by, 'approved', reason || 'อนุมัติและเผยแพร่'); break;
      case 'reject': need(); r.status = 'rejected'; ev(r, by, 'rejected', reason); break;
      case 'info': need(); r.status = 'info'; ev(r, by, 'info', reason); break;
      case 'sold': r.status = 'sold'; ev(r, by, 'sold', reason || 'ขายแล้ว'); break;
      case 'rented': r.status = 'rented'; ev(r, by, 'rented', reason || 'ให้เช่าแล้ว'); break;
      case 'unpublish': r.status = 'unpublished'; ev(r, by, 'unpublished', reason || 'ปิดการเผยแพร่'); break;
      case 'feature': r.featured = !r.featured; ev(r, by, 'edited', r.featured ? 'ตั้งเป็นประกาศเด่น' : 'ยกเลิกประกาศเด่น'); break;
      case 'note': need(); ev(r, by, 'note', reason); break;
      case 'price': { const np = num(body.price); if (!(np > 0)) return send(res, 400, { error: 'ราคาไม่ถูกต้อง' });
        ev(r, by, 'price', `เปลี่ยนราคา ${r.price.toLocaleString()} → ${np.toLocaleString()} บาท` + (reason ? ' · ' + reason : '')); r.price = np; r.priceHistory.push({ at: now(), price: np, by }); break; }
      case 'edit': { const ch = [];
        for (const k of ['title', 'province', 'district', 'subdistrict', 'nearby']) if (body[k] != null && str(body[k]) !== r[k]) { ch.push(`${k}: ${r[k]} → ${str(body[k])}`); r[k] = str(body[k], 120); }
        for (const k of ['type', 'number', 'zone']) if (body['deed_' + k] != null && str(body['deed_' + k]) !== r.deed[k]) { ch.push(`deed.${k}: ${r.deed[k]} → ${str(body['deed_' + k])}`); r.deed[k] = str(body['deed_' + k], 60); }
        if (!ch.length) return send(res, 400, { error: 'ไม่มีการเปลี่ยนแปลง' }); ev(r, by, 'edited', ch.join(' | ')); break; }
      default: return send(res, 400, { error: 'action ไม่ถูกต้อง' });
    }
    save(); return send(res, 200, { ok: true, status: r.status, statusText: STATUS_TH[r.status] });
  }
  return send(res, 404, { error: 'not found' });
}
function sameOrigin(req) { const o = req.headers.origin; if (!o) return true; try { return new URL(o).host === req.headers.host; } catch { return false; } }

// ---------- static ----------
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml' };
function serveStatic(req, res, u) {
  let rel; try { rel = decodeURIComponent(u.pathname); } catch { res.writeHead(400); return res.end(); }
  if (rel.includes('\0')) { res.writeHead(400); return res.end(); }
  let base = PUB;
  if (rel === '/admin' || rel === '/admin/') rel = '/admin.html';
  if (rel.startsWith('/uploads/')) { base = UP; rel = rel.slice(8); }
  if (rel.endsWith('/')) rel += 'index.html';
  const fp = path.resolve(base, '.' + path.posix.normalize(rel));
  if (!fp.startsWith(base + path.sep)) { res.writeHead(403); return res.end('forbidden'); }
  fs.stat(fp, (e, st) => {
    if (e || !st.isFile()) { res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' }); return res.end('<meta charset=utf-8><p>ไม่พบหน้านี้ — <a href="/">กลับหน้าแรก</a></p>'); }
    const ext = path.extname(fp).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream', 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'SAMEORIGIN', 'Referrer-Policy': 'same-origin', ...(base === UP ? { 'Content-Security-Policy': "default-src 'none'" } : {}) });
    fs.createReadStream(fp).pipe(res);
  });
}
http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x');
  try { if (u.pathname.startsWith('/api/')) await api(req, res, u); else if (req.method === 'GET' || req.method === 'HEAD') serveStatic(req, res, u); else send(res, 405, { error: 'method' }); }
  catch (e) { if (!res.headersSent) send(res, e.code >= 400 && e.code < 500 ? e.code : (e instanceof SyntaxError ? 400 : 500), { error: e.code ? e.message : 'เกิดข้อผิดพลาด' }); if (!e.code) console.error(e); }
}).listen(PORT, () => console.log(`SMILELAND พร้อมใช้งาน: http://localhost:${PORT}   แอดมิน: http://localhost:${PORT}/admin`));
