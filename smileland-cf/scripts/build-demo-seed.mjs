// สร้าง seed/demo.sql — ประกาศตัวอย่าง 200 รายการ ครบทุก 77 จังหวัด (ref ขึ้นต้น SL-DEMO)
// ประกาศตัวอย่างจะติดป้าย "ตัวอย่าง", noindex, ไม่รับการติดต่อ และลบได้ที่ /admin/settings
// รูปเป็นภาพจำลอง 3 มิติใน public/demo-img/
// ใช้: node scripts/build-demo-seed.mjs   (Node 22.18+)
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { indexTokens } from '../src/lib/thai.ts';

/* ---------- seeded random (ผลเหมือนเดิมทุกครั้ง) ---------- */
let S = 20261024;
const rnd = () => { S = (S * 16807) % 2147483647; return (S - 1) / 2147483646; };
const ri = (a, b) => Math.floor(a + rnd() * (b - a + 1));
const rf = (a, b) => a + rnd() * (b - a);
const pick = (a) => a[Math.floor(rnd() * a.length)];
const chance = (p) => rnd() < p;
const round = (n, step) => Math.round(n / step) * step;

/* ---------- ภูมิศาสตร์ ---------- */
const geoSql = readFileSync('seed/geo.sql', 'utf8');
const PROV = {}, DIST = {};
for (const m of geoSql.matchAll(/\((\d{2}),'([^']+)','([^']+)','([^']+)','([a-z]+)'\)/g)) PROV[m[1]] = { code: +m[1], th: m[2], en: m[3], region: m[5] };
for (const m of geoSql.matchAll(/\((\d{4}),(\d{2}),'([^']+)','([^']+)','[^']+','\d*'\)/g)) (DIST[m[2]] ||= []).push({ code: +m[1], th: m[3], en: m[4] });
const SUB = {};
for (const m of geoSql.matchAll(/\((\d{6}),(\d{4}),(\d{2}),'([^']+)','[^']+','\d*'\)/g)) (SUB[m[2]] ||= []).push({ code: +m[1], th: m[4] });

// พิกัดตัวเมืองของแต่ละจังหวัด (โดยประมาณ)
const CAP = { 10: [13.7563, 100.5018], 11: [13.5991, 100.5998], 12: [13.8621, 100.5144], 13: [14.0208, 100.525], 14: [14.3532, 100.5689], 15: [14.5896, 100.455], 16: [14.7995, 100.6534], 17: [14.8936, 100.3967], 18: [15.1851, 100.1251], 19: [14.5289, 100.9101], 20: [13.3611, 100.9847], 21: [12.6814, 101.2816], 22: [12.6113, 102.1039], 23: [12.2428, 102.5175], 24: [13.6904, 101.0779], 25: [14.0509, 101.3717], 26: [14.2069, 101.213], 27: [13.824, 102.0646], 30: [14.9799, 102.0978], 31: [14.993, 103.1029], 32: [14.8818, 103.4936], 33: [15.1186, 104.322], 34: [15.2448, 104.8473], 35: [15.7944, 104.1453], 36: [15.8068, 102.0316], 37: [15.8657, 104.6258], 38: [18.3609, 103.6466], 39: [17.2218, 102.426], 40: [16.4322, 102.8236], 41: [17.4138, 102.787], 42: [17.486, 101.7223], 43: [17.8783, 102.742], 44: [16.1851, 103.3026], 45: [16.0538, 103.652], 46: [16.4315, 103.5059], 47: [17.1664, 104.1486], 48: [17.392, 104.7695], 49: [16.542, 104.7235], 50: [18.7883, 98.9853], 51: [18.5745, 99.0087], 52: [18.2888, 99.4908], 53: [17.62, 100.0993], 54: [18.1446, 100.1403], 55: [18.7756, 100.773], 56: [19.1666, 99.9019], 57: [19.9105, 99.8406], 58: [19.302, 97.9654], 60: [15.7047, 100.1372], 61: [15.3835, 100.0246], 62: [16.4827, 99.5226], 63: [16.884, 99.1259], 64: [17.0078, 99.823], 65: [16.8211, 100.2659], 66: [16.4429, 100.3488], 67: [16.419, 101.1591], 70: [13.5283, 99.8134], 71: [14.0228, 99.5328], 72: [14.4745, 100.1177], 73: [13.8199, 100.0622], 74: [13.5475, 100.2744], 75: [13.4098, 100.0023], 76: [13.1119, 99.9398], 77: [11.8124, 99.7973], 80: [8.4304, 99.9631], 81: [8.0863, 98.9063], 82: [8.4501, 98.5255], 83: [7.8804, 98.3923], 84: [9.1382, 99.3215], 85: [9.9529, 98.6085], 86: [10.493, 99.18], 90: [7.1898, 100.5951], 91: [6.6238, 100.0674], 92: [7.5594, 99.6114], 93: [7.6167, 100.074], 94: [6.8673, 101.2501], 95: [6.541, 101.2804], 96: [6.4255, 101.8253] };

// จำนวนประกาศต่อจังหวัด: ทุกจังหวัดอย่างน้อย 2 + เพิ่มในเมืองใหญ่ = 200
const EXTRA = { 10: 12, 50: 5, 83: 4, 20: 5, 12: 3, 11: 2, 13: 2, 34: 4, 40: 2, 30: 2, 41: 1, 90: 1, 84: 1, 77: 1, 21: 1 };
const CITY = new Set([10, 11, 12, 13, 74]); // เมืองหลวง/ปริมณฑล
const RESORT = new Set([83, 20, 77, 84, 81, 82, 50, 21, 23]);
const TIER = (p) => (p === 10 ? 4 : CITY.has(p) ? 3 : RESORT.has(p) || [40, 30, 41, 90, 34, 65, 57].includes(p) ? 2 : 1);

/* ---------- รูปภาพจำลอง ---------- */
const imgs = (prefix, n, views) => Array.from({ length: n }, (_, i) => (views ? views.map((v) => `${prefix}${String(i).padStart(2, '0')}v${v}`) : [`${prefix}${String(i).padStart(2, '0')}`]));
const IMG = {
  thai: imgs('ht', 10, [0, 1]), modern: imgs('hm', 8, [0, 1]), town: imgs('tw', 6, [0, 1]), condo: imgs('cx', 10).flat(),
  living: imgs('lv', 14).flat(), bed: imgs('bd', 12).flat(), kitchen: imgs('kt', 10).flat(),
  plot: imgs('lp', 12, [0, 1]), paddy: imgs('pd', 8).flat(), orchard: imgs('oc', 6).flat(), river: imgs('rv', 6).flat(),
};
const cityOnly = (arr, city) => arr.filter((n) => (parseInt(n.slice(2), 10) % 2 === 0) === city);

/* ---------- ข้อความ ---------- */
const NEAR = { 10: ['BTS', 'MRT', 'ห้างสรรพสินค้า', 'ทางด่วน'], default: ['ตลาด', 'โรงเรียน', 'โรงพยาบาล', 'ห้างสรรพสินค้า', 'ถนนสายหลัก', 'มหาวิทยาลัย'] };
const STREET = ['ถนนเลียบคลอง', 'ถนนเทศบาล', 'ถนนสายหลัก', 'ซอยหมู่บ้าน', 'ถนนลาดยาง', 'ถนนคอนกรีต', 'ทางหลวงชนบท'];
const PROJECTS = ['เดอะ ริเวอร์ไซด์', 'ไลฟ์ เรสซิเดนซ์', 'ศุภาลัย ซิตี้', 'เดอะ พาร์ค', 'ไอดีโอ ซิตี้', 'เอ สเปซ', 'ลุมพินี วิลล์', 'พลัม คอนโด', 'เดอะ เบส', 'ซีน่า เรสซิเดนซ์', 'นิช โมโน', 'แกรนด์ วิว'];

function landSize(kind, tier) {
  if (kind === 'paddy') return ri(5, 40) * 400 + pick([0, 100, 200]);
  if (kind === 'orchard') return ri(3, 25) * 400 + pick([0, 100, 200, 300]);
  if (kind === 'river') return ri(1, 8) * 400 + pick([0, 200]);
  return tier >= 3 ? ri(50, 400) : pick([ri(80, 400), ri(1, 5) * 400 + ri(0, 3) * 100]);
}
const perSqw = (tier, kind) => (kind === 'paddy' ? rf(250, 900) : kind === 'orchard' ? rf(400, 1500) : kind === 'river' ? rf(1500, 6000) : [0, rf(1500, 6000), rf(5000, 18000), rf(15000, 45000), rf(60000, 180000)][tier]);
const thaiLand = (sqw) => { const r = Math.floor(sqw / 400), n = Math.floor((sqw % 400) / 100), w = sqw % 100; return [r && `${r} ไร่`, n && `${n} งาน`, w && `${w} ตร.ว.`].filter(Boolean).join(' '); };

/* ---------- สร้างประกาศ ---------- */
const listings = [];
const provCodes = Object.keys(PROV).map(Number).sort((a, b) => a - b);
const quota = [];
for (const p of provCodes) for (let i = 0; i < 2 + (EXTRA[p] || 0); i++) quota.push(p);
if (quota.length !== 200) throw new Error('quota ' + quota.length);

const now = Math.floor(Date.now() / 1000);
quota.forEach((p, idx) => {
  const prov = PROV[p], tier = TIER(p);
  // ประเภททรัพย์ตามลักษณะพื้นที่
  const type = p === 10 ? pick(['condo', 'condo', 'condo', 'house', 'house', 'land']) : CITY.has(p) ? pick(['condo', 'condo', 'house', 'house', 'land']) : RESORT.has(p) ? pick(['condo', 'condo', 'house', 'house', 'land', 'land']) : tier === 2 ? pick(['condo', 'house', 'house', 'land', 'land']) : pick(['condo', 'house', 'house', 'house', 'land', 'land', 'land']);
  const deal = type === 'condo' ? (chance(0.45) ? 'rent' : 'sale') : type === 'house' ? (chance(0.25) ? 'rent' : 'sale') : (chance(0.12) ? 'rent' : 'sale');
  const ds = DIST[p];
  const dist = chance(tier >= 3 ? 0.4 : 0.6) ? ds.find((d) => d.code % 100 === 1) || ds[0] : pick(ds);
  const subs = SUB[dist.code] || []; const sub = subs.length ? pick(subs) : null;
  const isMueang = dist.code % 100 === 1 || p === 10;
  const [clat, clng] = CAP[p];
  const jit = isMueang ? 0.035 : 0.13;
  const lat = +(clat + rf(-jit, jit)).toFixed(5), lng = +(clng + rf(-jit, jit)).toFixed(5);
  const nearRaw = pick(p === 10 ? NEAR[10] : NEAR.default);
  const near = /^[A-Z]/.test(nearRaw) ? ` ${nearRaw}` : nearRaw;
  const distWord = (p === 10 ? 'เขต' : 'อ.') + dist.th;
  const L = { deal, type, provinceCode: p, districtCode: dist.code, subdistrictCode: sub?.code ?? null, lat: chance(0.9) ? lat : null, lng: null, features: [] };
  L.lng = L.lat == null ? null : lng;
  let images = [];

  if (type === 'land') {
    const kind = tier >= 3 ? 'plot' : pick(prov.region === 'northeast' || prov.region === 'central' ? ['plot', 'plot', 'paddy', 'paddy', 'river'] : ['plot', 'plot', 'orchard', 'orchard', 'river']);
    const sqw = landSize(kind, tier);
    Object.assign(L, { landRai: Math.floor(sqw / 400), landNgan: Math.floor((sqw % 400) / 100), landWah: sqw % 100, landSqw: sqw, deedType: pick(['chanote', 'chanote', 'chanote', 'ns3k', 'ns3k']), frontageM: ri(12, 80), zoningColor: tier >= 3 ? pick(['yellow', 'orange', 'red']) : pick(['green', 'yellow', 'green-white', 'none']) });
    const word = { paddy: 'ที่นา', orchard: pick(['สวนยาง', 'สวนผลไม้', 'สวนทุเรียน', 'สวนปาล์ม']), river: 'ที่ดินติดน้ำ', plot: 'ที่ดินเปล่า' }[kind];
    if (deal === 'sale') {
      L.price = round(sqw * perSqw(tier, kind), sqw * perSqw(tier, kind) > 5e6 ? 100000 : 10000);
      L.title = pick([`ขาย${word} ${thaiLand(sqw)} ${distWord} ${prov.th}`, `ขาย${word}${kind === 'plot' ? 'ติด' + pick(['ถนนลาดยาง', 'ถนนคอนกรีต', 'ถนนสายหลัก']) : ''} ${thaiLand(sqw)} ใกล้${near}`, `${word} ${thaiLand(sqw)} โฉนดพร้อมโอน ${distWord}`]);
    } else {
      L.price = round(Math.max(3000, sqw * rf(4, 20)), 500);
      Object.assign(L, { depositMonths: 3, minContractMonths: pick([12, 24, 36, 60]) });
      L.title = `ให้เช่า${word} ${thaiLand(sqw)} ${distWord} เหมาะทำ${pick(['ลานจอดรถ', 'โกดัง', 'ร้านค้า', 'เกษตร', 'ตลาดนัด'])}`;
    }
    L.features = [...new Set([kind === 'plot' || chance(0.5) ? 'road' : null, 'electric', chance(0.6) ? 'water' : null, chance(0.4) ? 'no-flood' : null, chance(0.5) ? 'owner-direct' : null].filter(Boolean))];
    L.description = [
      `${word}${kind === 'paddy' ? 'ดินดี ทำนาได้ปีละ 2 ครั้ง ' : kind === 'orchard' ? 'ต้นไม้ให้ผลผลิตแล้ว ' : kind === 'river' ? 'วิวน้ำสวย บรรยากาศดี ' : 'แปลงสวย รูปทรงสี่เหลี่ยม '}ขนาด ${thaiLand(sqw)} (${sqw.toLocaleString()} ตร.ว.) หน้ากว้างประมาณ ${L.frontageM} เมตร`,
      `ทำเล${sub ? 'ต.' + sub.th + ' ' : ''}${distWord} จ.${prov.th} ${pick(['ติด' + pick(STREET), 'เข้าซอยไม่ลึก รถใหญ่เข้าออกสะดวก', 'ห่างถนนสายหลักไม่ถึง 1 กม.'])} ใกล้${near}`,
      `${L.features.includes('electric') ? 'ไฟฟ้า' : ''}${L.features.includes('water') ? 'ประปา' : ''}เข้าถึง ${pick(['เหมาะสร้างบ้าน', 'เหมาะทำเกษตร โฮมสเตย์', 'เหมาะลงทุนเก็บไว้', 'เหมาะทำโกดัง ร้านค้า', 'เหมาะทำรีสอร์ท คาเฟ่'])}`,
      deal === 'sale' ? `เอกสารสิทธิ์ ${L.deedType === 'chanote' ? 'โฉนด' : 'น.ส.3 ก.'} พร้อมโอน${chance(0.4) ? ' ค่าโอนคนละครึ่ง' : ''}` : `สัญญาเช่าขั้นต่ำ ${L.minContractMonths} เดือน`,
    ].join('\n');
    const pool = kind === 'plot' ? pick(IMG.plot) : [pick(IMG[kind]), ...(chance(0.6) ? [pick(IMG.plot)[0]] : [])];
    images = pool;
  } else if (type === 'condo') {
    const beds = pick([0, 1, 1, 1, 2, 2, 3]); const sqm = beds === 0 ? ri(22, 30) : beds === 1 ? ri(28, 45) : beds === 2 ? ri(50, 80) : ri(85, 140);
    const project = pick(PROJECTS) + ' ' + (p === 10 ? pick(['สุขุมวิท', 'พระราม 9', 'รัชดา', 'อารีย์', 'บางนา', 'ลาดพร้าว', 'สาทร']) : prov.th.replace('จังหวัด', ''));
    Object.assign(L, { usableSqm: sqm, bedrooms: beds, bathrooms: Math.max(1, beds), projectName: project, floorNo: tier === 4 ? ri(3, 35) : tier === 3 ? ri(3, 25) : ri(2, 12), commonFee: round(sqm * rf(25, 70), 10), parking: chance(0.6) ? 1 : 0 });
    const ppsqm = [0, 30000, 45000, 65000, 110000][tier] * rf(0.75, 1.5);
    if (deal === 'sale') L.price = round(sqm * ppsqm, 10000);
    else { L.price = round(sqm * [0, 220, 300, 400, 550][tier] * rf(0.8, 1.4), 500); Object.assign(L, { depositMonths: 2, minContractMonths: pick([6, 12, 12]), furnished: chance(0.85) ? 1 : 0 }); }
    const bedTxt = beds === 0 ? 'ห้องสตูดิโอ' : `${beds} ห้องนอน`;
    L.title = `${deal === 'sale' ? 'ขาย' : 'ให้เช่า'}คอนโด ${project} ${bedTxt} ${sqm} ตร.ม. ชั้น ${L.floorNo}${chance(0.4) ? ' ใกล้' + near : ''}`;
    L.features = ['pool', 'security', chance(0.7) ? 'gym' : null, deal === 'rent' ? 'aircon' : chance(0.5) ? 'aircon' : null, chance(0.2) ? 'pet' : null].filter(Boolean);
    L.description = [
      `${project} ${bedTxt} ${L.bathrooms} ห้องน้ำ ขนาด ${sqm} ตร.ม. ชั้น ${L.floorNo} ${pick(['วิวเมือง', 'วิวสระว่ายน้ำ', 'ห้องมุม', 'ทิศเหนือ ไม่ร้อน', 'วิวโล่งไม่มีตึกบัง'])}`,
      `${pick(['ตกแต่งครบ พร้อมเข้าอยู่', 'เฟอร์นิเจอร์บิวท์อิน', 'แต่งสวย เครื่องใช้ไฟฟ้าครบ', 'สภาพดีมาก ใช้งานน้อย'])} มีเครื่องปรับอากาศ ตู้เย็น เครื่องทำน้ำอุ่น${deal === 'rent' ? ' เครื่องซักผ้า' : ''}`,
      `ส่วนกลาง: สระว่ายน้ำ ฟิตเนส รปภ. 24 ชม. คีย์การ์ด ค่าส่วนกลาง ${L.commonFee.toLocaleString()} บาท/เดือน`,
      `เดินทางสะดวก ใกล้${near} ${distWord} ${prov.th}`,
      deal === 'rent' ? `สัญญาขั้นต่ำ ${L.minContractMonths} เดือน มัดจำ 2 เดือน ล่วงหน้า 1 เดือน` : pick(['ราคาต่อรองได้', 'ฟรีค่าโอน', 'เหมาะลงทุนปล่อยเช่า']),
    ].join('\n');
    const city = true;
    images = [IMG.condo[ri(0, IMG.condo.length - 1)], pick(cityOnly(IMG.living, city)), pick(cityOnly(IMG.bed, city)), ...(chance(0.6) ? [pick(cityOnly(IMG.kitchen, city))] : [])];
  } else {
    const style = tier >= 3 ? pick(['modern', 'town', 'town', 'thai']) : pick(['thai', 'thai', 'modern', 'town']);
    const beds = style === 'town' ? pick([2, 3, 3]) : pick([2, 3, 3, 4, 4, 5]); const floors = style === 'thai' ? pick([1, 1, 2]) : style === 'town' ? pick([2, 3]) : 2;
    const sqw = style === 'town' ? ri(18, 28) : ri(50, 120) + (tier === 1 ? ri(0, 200) : 0);
    const sqm = style === 'town' ? ri(110, 190) : ri(120, 160) + beds * ri(15, 35);
    Object.assign(L, { landRai: Math.floor(sqw / 400), landNgan: Math.floor((sqw % 400) / 100), landWah: sqw % 100, landSqw: sqw, usableSqm: sqm, bedrooms: beds, bathrooms: Math.max(1, beds - pick([0, 1])), floors, parking: style === 'town' ? 1 : ri(2, 3), deedType: 'chanote' });
    const base = [0, 1_500_000, 2_500_000, 3_800_000, 6_000_000][tier] * (style === 'modern' ? 1.7 : style === 'town' ? 0.85 : 1) * (0.7 + beds * 0.12) * rf(0.8, 1.35);
    const word = style === 'town' ? 'ทาวน์โฮม' : pick(['บ้านเดี่ยว', 'บ้านเดี่ยว', style === 'modern' ? 'บ้านสไตล์โมเดิร์น' : 'บ้านเดี่ยวชั้นเดียว']);
    if (deal === 'sale') L.price = round(base, 10000);
    else { L.price = round(base * 0.0045, 500); Object.assign(L, { depositMonths: 2, minContractMonths: 12, furnished: chance(0.5) ? 1 : 0 }); }
    L.title = `${deal === 'sale' ? 'ขาย' : 'ให้เช่า'}${word} ${floors} ชั้น ${beds} ห้องนอน ${pick([`${distWord} ${prov.th}`, `ใกล้${near}`, `${thaiLand(sqw)}`])}`;
    L.features = ['security', chance(0.5) ? 'garden' : null, chance(0.4) ? 'near-school' : null, chance(0.4) ? 'near-market' : null, chance(0.3) ? (chance(0.5) ? 'new-build' : 'renovated') : null, chance(0.3) ? 'no-flood' : null, deal === 'rent' ? 'aircon' : null].filter(Boolean);
    L.description = [
      `${word} ${floors} ชั้น ${beds} ห้องนอน ${L.bathrooms} ห้องน้ำ พื้นที่ใช้สอย ${sqm} ตร.ม. บนที่ดิน ${thaiLand(sqw)}`,
      `${pick(['สภาพดี พร้อมเข้าอยู่', 'รีโนเวทใหม่ทั้งหลัง', 'บ้านสร้างใหม่ ยังไม่เคยเข้าอยู่', 'ต่อเติมครัวหลังบ้านแล้ว', 'โครงสร้างแข็งแรง ไม่เคยน้ำท่วม'])} ${pick(['หลังคาใหม่', 'ปูกระเบื้องทั้งหลัง', 'มีห้องนอนชั้นล่าง เหมาะผู้สูงอายุ', 'จอดรถได้ ' + L.parking + ' คัน'])}`,
      `${style === 'town' ? 'โครงการมีรปภ. ' : 'หมู่บ้านเงียบสงบ '}ใกล้${near} เดินทางสะดวก ${sub ? 'ต.' + sub.th + ' ' : ''}${distWord} จ.${prov.th}`,
      deal === 'sale' ? pick(['ราคาต่อรองได้', 'ฟรีค่าโอน', 'ยื่นกู้ได้ทุกธนาคาร', 'เจ้าของขายเอง']) : `สัญญาขั้นต่ำ 12 เดือน มัดจำ 2 เดือน`,
    ].join('\n');
    const ext = pick(IMG[style]);
    images = [...ext, pick(cityOnly(IMG.living, false)), pick(cityOnly(IMG.bed, false)), ...(chance(0.6) ? [pick(cityOnly(IMG.kitchen, false))] : [])];
  }
  L.images = images;
  L.posterRole = chance(0.35) ? 'agent' : 'owner';
  if (L.posterRole === 'owner' && !L.features.includes('owner-direct') && chance(0.4)) L.features.push('owner-direct');
  L.featured = chance(0.08) ? 1 : 0;
  L.created = now - ri(1, 120) * 86400 - ri(0, 86000);
  listings.push(L);
});

/* ---------- SQL ---------- */
const q = (v) => (v == null ? 'NULL' : typeof v === 'number' ? String(v) : "'" + String(v).replace(/'/g, "''") + "'");
const DEALS = { sale: 'ขาย', rent: 'เช่า' }, TYPES = { house: 'บ้าน', land: 'ที่ดิน', condo: 'คอนโด' };
listings.sort((a, b) => a.created - b.created);
const out = [
  '-- SMILELAND demo data: ประกาศตัวอย่าง 200 รายการ ทุก 77 จังหวัด (ref SL-DEMO*)',
  '-- ติดป้าย "ตัวอย่าง" / noindex / ไม่รับการติดต่อ — ลบได้ที่ /admin/settings',
  "DELETE FROM listing_tokens WHERE listing_id IN (SELECT id FROM listings WHERE ref LIKE 'SL-DEMO%');",
  "DELETE FROM listing_images WHERE listing_id IN (SELECT id FROM listings WHERE ref LIKE 'SL-DEMO%');",
  "DELETE FROM listings WHERE ref LIKE 'SL-DEMO%';",
];
const missing = new Set();
listings.forEach((L, i) => {
  const id = 900000 + i;
  for (const n of L.images) if (!existsSync(`public/demo-img/${n}-800.webp`)) missing.add(n);
  const cols = {
    id, ref: `SL-DEMO${String(i + 1).padStart(3, '0')}`, deal: L.deal, type: L.type, status: 'active', title: L.title, description: L.description, price: L.price,
    province_code: L.provinceCode, district_code: L.districtCode, subdistrict_code: L.subdistrictCode, lat: L.lat, lng: L.lng,
    land_rai: L.landRai ?? null, land_ngan: L.landNgan ?? null, land_wah: L.landWah ?? null, land_sqw: L.landSqw ?? null, deed_type: L.deedType ?? null, frontage_m: L.frontageM ?? null, zoning_color: L.zoningColor ?? null,
    usable_sqm: L.usableSqm ?? null, bedrooms: L.bedrooms ?? null, bathrooms: L.bathrooms ?? null, floors: L.floors ?? null, parking: L.parking ?? null,
    project_name: L.projectName ?? null, floor_no: L.floorNo ?? null, common_fee: L.commonFee ?? null,
    deposit_months: L.depositMonths ?? null, min_contract_months: L.minContractMonths ?? null, furnished: L.furnished ?? null,
    features: JSON.stringify(L.features), cover_key: `/demo-img/${L.images[0]}:webp`, image_count: L.images.length,
    poster_role: L.posterRole, owner_name: 'ประกาศตัวอย่าง', owner_phone: '0000000000',
    manage_token_hash: createHash('sha256').update('demo-' + id).digest('hex'), featured: L.featured, views: ri(15, 900),
    created_at: L.created, updated_at: L.created + 3600, approved_at: L.created + 3600, expires_at: now + 180 * 86400,
  };
  out.push(`INSERT INTO listings (${Object.keys(cols).join(',')}) VALUES (${Object.values(cols).map(q).join(',')});`);
  out.push(`INSERT INTO listing_images (listing_id, idx, key_base, ext, width, height) VALUES ${L.images.map((n, k) => `(${id},${k},'/demo-img/${n}','webp',1600,1200)`).join(',')};`);
  out.push(`INSERT INTO price_history (listing_id, price, changed_at) VALUES (${id}, ${L.price}, ${L.created});`);
  out.push(`INSERT INTO timeline (listing_id, event, actor, created_at) VALUES (${id}, 'submitted', 'owner', ${L.created}), (${id}, 'approved', 'admin:demo', ${L.created + 3600});`);
  const prov = PROV[String(L.provinceCode)], dist = DIST[String(L.provinceCode)].find((d) => d.code === L.districtCode);
  const toks = indexTokens([L.title, L.description, L.projectName, DEALS[L.deal], TYPES[L.type]], [prov.th, prov.en, dist.th, dist.en, cols.ref]);
  for (let k = 0; k < toks.length; k += 80) out.push(`INSERT OR IGNORE INTO listing_tokens (token, listing_id) VALUES ${toks.slice(k, k + 80).map((t) => `(${q(t)},${id})`).join(',')};`);
});
writeFileSync('seed/demo.sql', out.join('\n') + '\n');
const byType = listings.reduce((m, l) => ((m[l.type + '/' + l.deal] = (m[l.type + '/' + l.deal] || 0) + 1), m), {});
console.log(`ประกาศตัวอย่าง ${listings.length} รายการ · ${new Set(listings.map((l) => l.provinceCode)).size} จังหวัด →  seed/demo.sql`);
console.log(byType);
if (missing.size) console.warn(`⚠ ยังไม่มีไฟล์รูป ${missing.size} ชุด เช่น ${[...missing].slice(0, 5).join(', ')}`);
