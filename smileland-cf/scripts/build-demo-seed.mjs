// สร้าง seed/demo.sql — ประกาศตัวอย่าง 30 รายการ ในเขต 20 จังหวัดภาคอีสาน (ref ขึ้นต้น SL-DEMO)
// ประกาศตัวอย่างติดป้าย "ตัวอย่าง", noindex, ไม่รับการติดต่อ และระบบจะซ่อนเองเมื่อมีประกาศจริงครบตามที่ตั้งใน /admin/settings
// รูปเป็นภาพเรนเดอร์ 3 มิติ (Blender Cycles) อยู่ใน public/demo-img/  — ข้อมูลประกาศอยู่ใน scripts/demo-listings.json
// ใช้: node scripts/build-demo-seed.mjs   (Node 22.18+)
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { indexTokens } from '../src/lib/thai.ts';

/* ---------- seeded random ---------- */
let S = 20261025;
const rnd = () => { S = (S * 16807) % 2147483647; return (S - 1) / 2147483646; };
const ri = (a, b) => Math.floor(a + rnd() * (b - a + 1));
const rf = (a, b) => a + rnd() * (b - a);
const pick = (a) => a[Math.floor(rnd() * a.length)];
const chance = (p) => rnd() < p;
const round = (n, step) => Math.round(n / step) * step;
const fmt = (n) => n.toLocaleString('en-US');

/* ---------- ภูมิศาสตร์ ---------- */
const geoSql = readFileSync('seed/geo.sql', 'utf8');
const PROV = {}, DIST = {}, SUB = {};
for (const m of geoSql.matchAll(/\((\d{2}),'([^']+)','([^']+)','([^']+)','([a-z]+)'\)/g)) PROV[m[1]] = { code: +m[1], th: m[2], en: m[3] };
for (const m of geoSql.matchAll(/\((\d{4}),(\d{2}),'([^']+)','([^']+)','[^']+','\d*'\)/g)) (DIST[m[2]] ||= []).push({ code: +m[1], th: m[3], en: m[4] });
for (const m of geoSql.matchAll(/\((\d{6}),(\d{4}),(\d{2}),'([^']+)','[^']+','\d*'\)/g)) (SUB[m[2]] ||= []).push({ code: +m[1], th: m[4] });
const CAP = { 30: [14.9799, 102.0978], 31: [14.993, 103.1029], 32: [14.8818, 103.4936], 33: [15.1186, 104.322], 34: [15.2448, 104.8473], 35: [15.7944, 104.1453], 36: [15.8068, 102.0316], 37: [15.8657, 104.6258], 38: [18.3609, 103.6466], 39: [17.2218, 102.426], 40: [16.4322, 102.8236], 41: [17.4138, 102.787], 42: [17.486, 101.7223], 43: [17.8783, 102.742], 44: [16.1851, 103.3026], 45: [16.0538, 103.652], 46: [16.4315, 103.5059], 47: [17.1664, 104.1486], 48: [17.392, 104.7695], 49: [16.542, 104.7235] };
const BIG = new Set([30, 40, 41, 34]); // เมืองใหญ่ของภาค

// จุดใกล้เคียงที่คนอีสานใช้บอกทำเล
const LANDMARK = {
  30: ['เซ็นทรัล โคราช', 'เทอร์มินอล 21 โคราช', 'มหาวิทยาลัยเทคโนโลยีสุรนารี', 'ถนนมิตรภาพ'], 31: ['สนามช้าง อารีน่า', 'มหาวิทยาลัยราชภัฏบุรีรัมย์', 'ตลาดเทศบาล'],
  32: ['โรงพยาบาลสุรินทร์', 'มหาวิทยาลัยราชภัฏสุรินทร์', 'ตลาดสดเทศบาล'], 33: ['โรงพยาบาลศรีสะเกษ', 'สถานีรถไฟศรีสะเกษ', 'ตลาดเทศบาล'],
  34: ['เซ็นทรัล อุบลฯ', 'มหาวิทยาลัยอุบลราชธานี', 'สนามบินอุบลราชธานี', 'ทุ่งศรีเมือง'], 35: ['โรงพยาบาลยโสธร', 'สวนสาธารณะพญาแถน', 'ตลาดเทศบาล'],
  36: ['โรงพยาบาลชัยภูมิ', 'มหาวิทยาลัยราชภัฏชัยภูมิ', 'ตลาดเทศบาล'], 37: ['โรงพยาบาลอำนาจเจริญ', 'ศาลากลางจังหวัด', 'ตลาดเทศบาล'],
  38: ['ริมโขง', 'โรงพยาบาลบึงกาฬ', 'ตลาดเทศบาล'], 39: ['โรงพยาบาลหนองบัวลำภู', 'ศาลากลางจังหวัด', 'ตลาดเทศบาล'],
  40: ['มหาวิทยาลัยขอนแก่น', 'เซ็นทรัล ขอนแก่น', 'บึงแก่นนคร', 'สนามบินขอนแก่น', 'ถนนมิตรภาพ'], 41: ['เซ็นทรัล อุดรธานี', 'ยูดีทาวน์', 'สนามบินอุดรธานี', 'หนองประจักษ์'],
  42: ['โรงพยาบาลเลย', 'มหาวิทยาลัยราชภัฏเลย', 'ตลาดเทศบาล'], 43: ['สะพานมิตรภาพไทย-ลาว', 'ริมโขง', 'ตลาดท่าเสด็จ'],
  44: ['มหาวิทยาลัยมหาสารคาม', 'ตลาดเทศบาล', 'โรงพยาบาลมหาสารคาม'], 45: ['บึงพลาญชัย', 'โรงพยาบาลร้อยเอ็ด', 'เซ็นทรัล ร้อยเอ็ด'],
  46: ['โรงพยาบาลกาฬสินธุ์', 'มหาวิทยาลัยกาฬสินธุ์', 'ตลาดเทศบาล'], 47: ['หนองหาร', 'มหาวิทยาลัยราชภัฏสกลนคร', 'โรบินสัน สกลนคร'],
  48: ['ริมโขง', 'โรงพยาบาลนครพนม', 'ถนนเลียบโขง'], 49: ['สะพานมิตรภาพ 2', 'ตลาดอินโดจีน', 'ริมโขง'],
};
const near = (p) => pick(LANDMARK[p]);
const thaiLand = (sqw) => { const r = Math.floor(sqw / 400), n = Math.floor((sqw % 400) / 100), w = sqw % 100; return [r && `${r} ไร่`, n && `${n} งาน`, w && `${w} ตร.ว.`].filter(Boolean).join(' '); };
const PROJECTS = ['เดอะ ทรี', 'ลุมพินี เพลส', 'ศุภาลัย ซิตี้', 'เดอะ ไลฟ์', 'ไอดีโอ วิว', 'ดีคอนโด แคมปัส', 'พลัม คอนโด', 'เดอะ เบส', 'บ้านสวน เรสซิเดนซ์', 'นิว ซิตี้'];

/* ---------- ประกาศ ---------- */
const spec = JSON.parse(readFileSync('scripts/demo-listings.json', 'utf8'));
const now = Math.floor(Date.now() / 1000);
const listings = spec.map((s) => {
  const p = s.province, prov = PROV[String(p)], big = BIG.has(p);
  const ds = DIST[String(p)];
  const dist = (s.type === 'land' && chance(0.6)) ? pick(ds) : ds.find((d) => d.code % 100 === 1) || ds[0];
  const subs = SUB[String(dist.code)] || []; const sub = subs.length ? pick(subs) : null;
  const isMueang = dist.code % 100 === 1;
  const [clat, clng] = CAP[p];
  const jit = isMueang ? 0.03 : 0.12;
  const distWord = 'อ.' + dist.th;
  const where = `${sub ? 'ต.' + sub.th + ' ' : ''}${distWord} จ.${prov.th}`;
  const lm = near(p);
  const L = { ...s, provinceCode: p, districtCode: dist.code, subdistrictCode: sub?.code ?? null, lat: +(clat + rf(-jit, jit)).toFixed(5), lng: +(clng + rf(-jit, jit)).toFixed(5), features: [] };
  const v = s.variant;

  if (s.type === 'land') {
    if (v === 'paddy') {
      const rai = ri(4, 22), sqw = rai * 400 + pick([0, 0, 100, 200]);
      Object.assign(L, { landRai: Math.floor(sqw / 400), landNgan: Math.floor((sqw % 400) / 100), landWah: 0, landSqw: sqw, deedType: pick(['chanote', 'chanote', 'ns3k']), frontageM: ri(40, 160), zoningColor: pick(['green', 'green-white', 'none']) });
      L.price = round(sqw / 400 * rf(110000, 320000), 10000);
      L.title = pick([`ขายที่นา ${thaiLand(sqw)} ติดถนนคอนกรีต ${distWord} ${prov.th}`, `ที่นาดินดี ${thaiLand(sqw)} มีคันนาพร้อม ทำนาได้ทันที ${distWord}`, `ขายที่นา ${rai} ไร่ ใกล้แหล่งน้ำ ${distWord} จ.${prov.th}`]);
      L.features = ['road', 'electric', chance(0.6) ? 'water' : null, chance(0.5) ? 'owner-direct' : null].filter(Boolean);
      L.description = [
        `ที่นาแปลงสวย ขนาด ${thaiLand(sqw)} หน้ากว้างติดถนนประมาณ ${L.frontageM} เมตร แบ่งเป็นแปลงย่อยพร้อมคันนา ดินดี ทำนาปีได้ผลผลิตดี`,
        `ทำเล ${where} ${pick(['ติดถนนคอนกรีตเข้าหมู่บ้าน รถไถรถเกี่ยวเข้าออกสะดวก', 'ห่างถนนลาดยางสายหลักประมาณ 500 เมตร', 'ใกล้คลองส่งน้ำชลประทาน'])}`,
        `มีเถียงนาไว้พักผ่อน ไฟฟ้าผ่านหน้าแปลง ${pick(['เหมาะทำเกษตรผสมผสาน', 'เหมาะทำโคกหนองนา', 'เหมาะซื้อเก็บไว้ลงทุนระยะยาว', 'เหมาะทำนาและปลูกพืชหลังนา'])}`,
        `เอกสารสิทธิ์ ${L.deedType === 'chanote' ? 'โฉนด' : 'น.ส.3 ก.'} พร้อมโอน ${pick(['ราคาต่อรองได้', 'เจ้าของขายเอง', 'ค่าโอนคนละครึ่ง'])}`,
      ].join('\n');
    } else if (v === 'laterite') {
      const sqw = pick([ri(100, 200), ri(200, 400), ri(1, 3) * 400 + ri(0, 3) * 100]);
      Object.assign(L, { landRai: Math.floor(sqw / 400), landNgan: Math.floor((sqw % 400) / 100), landWah: sqw % 100, landSqw: sqw, deedType: 'chanote', frontageM: ri(18, 60), zoningColor: big ? pick(['yellow', 'orange']) : pick(['yellow', 'green']) });
      L.price = round(sqw * (big ? rf(5000, 12000) : rf(2500, 6000)), 10000);
      L.title = pick([`ขายที่ดินถมแล้ว ${thaiLand(sqw)} ติดถนนลาดยาง ${distWord} ${prov.th}`, `ที่ดินถมดินลูกรังแล้ว ${thaiLand(sqw)} พร้อมสร้างบ้าน ใกล้${lm}`, `ขายที่ดินเปล่าถมแล้ว ${thaiLand(sqw)} โฉนดพร้อมโอน ${distWord}`]);
      L.features = ['road', 'electric', 'water', chance(0.6) ? 'no-flood' : null, chance(0.4) ? 'owner-direct' : null].filter(Boolean);
      L.description = [
        `ที่ดินถมดินลูกรังบดอัดแล้ว สูงกว่าระดับถนน ไม่ต้องถมเพิ่ม ขนาด ${thaiLand(sqw)} (${fmt(sqw)} ตร.ว.) หน้ากว้างประมาณ ${L.frontageM} เมตร`,
        `ทำเล ${where} ใกล้${lm} ${pick(['ติดถนนลาดยาง 2 เลน', 'อยู่ในชุมชน มีบ้านคนอยู่รอบ ๆ', 'ห่างถนนสายหลักไม่ถึง 1 กม.'])}`,
        `ไฟฟ้า ประปาผ่านหน้าที่ดิน หมุดหลักเขตครบ ${pick(['เหมาะสร้างบ้าน', 'เหมาะทำหอพัก', 'เหมาะทำร้านค้า โกดัง', 'เหมาะทำบ้านเช่า'])}`,
        `โฉนดพร้อมโอน ${pick(['ราคาต่อรองได้', 'ฟรีค่าโอน', 'เจ้าของขายเอง'])}`,
      ].join('\n');
    } else {
      const sqw = pick([ri(1, 4) * 400 + ri(0, 3) * 100, ri(300, 400)]);
      Object.assign(L, { landRai: Math.floor(sqw / 400), landNgan: Math.floor((sqw % 400) / 100), landWah: sqw % 100, landSqw: sqw, deedType: pick(['chanote', 'chanote', 'ns3k']), frontageM: ri(20, 80), zoningColor: big ? pick(['yellow', 'green']) : pick(['green', 'none']) });
      L.price = round(sqw * (big ? rf(1800, 4500) : rf(700, 2200)), 10000);
      L.title = pick([`ขายที่ดินเปล่า ${thaiLand(sqw)} ติดถนนลาดยาง ${distWord} ${prov.th}`, `ขายที่ดิน ${thaiLand(sqw)} บรรยากาศดี เหมาะสร้างบ้านสวน ${distWord}`, `ที่ดินเปล่าแปลงสวย ${thaiLand(sqw)} ใกล้${lm}`]);
      L.features = ['road', 'electric', chance(0.5) ? 'water' : null, chance(0.4) ? 'owner-direct' : null].filter(Boolean);
      L.description = [
        `ที่ดินเปล่ารูปทรงสี่เหลี่ยม ขนาด ${thaiLand(sqw)} (${fmt(sqw)} ตร.ว.) หน้ากว้างติดถนนประมาณ ${L.frontageM} เมตร มีรั้วลวดหนามและหมุดหลักเขตครบ`,
        `ทำเล ${where} ใกล้${lm} ${pick(['ติดถนนลาดยาง รถเข้าออกสะดวก', 'แวดล้อมด้วยทุ่งนาและต้นไม้ อากาศดี', 'อยู่ไม่ไกลจากตัวเมือง'])}`,
        `ไฟฟ้าผ่านหน้าที่ดิน ${pick(['เหมาะสร้างบ้านพักตากอากาศ', 'เหมาะทำสวนเกษตร', 'เหมาะซื้อเก็บไว้ลงทุน', 'เหมาะทำคาเฟ่ โฮมสเตย์'])}`,
        `เอกสารสิทธิ์ ${L.deedType === 'chanote' ? 'โฉนด' : 'น.ส.3 ก.'} พร้อมโอน`,
      ].join('\n');
    }
  } else if (s.type === 'condo') {
    const beds = pick([0, 1, 1, 1, 2]); const sqm = beds === 0 ? ri(24, 30) : beds === 1 ? ri(28, 40) : ri(52, 68);
    const project = pick(PROJECTS) + ' ' + prov.th;
    Object.assign(L, { usableSqm: sqm, bedrooms: beds, bathrooms: Math.max(1, beds), projectName: project, floorNo: ri(3, 12), commonFee: round(sqm * rf(25, 45), 10), parking: chance(0.6) ? 1 : 0 });
    if (s.deal === 'sale') L.price = round(sqm * rf(38000, 62000), 10000);
    else { L.price = round(sqm * rf(200, 320), 500); Object.assign(L, { depositMonths: 2, minContractMonths: pick([6, 12, 12]), furnished: 1 }); }
    const bedTxt = beds === 0 ? 'ห้องสตูดิโอ' : `${beds} ห้องนอน`;
    L.title = `${s.deal === 'sale' ? 'ขาย' : 'ให้เช่า'}คอนโด ${project} ${bedTxt} ${sqm} ตร.ม. ชั้น ${L.floorNo} ใกล้${lm}`;
    L.features = ['pool', 'security', 'gym', 'aircon', chance(0.2) ? 'pet' : null].filter(Boolean);
    L.description = [
      `${project} ${bedTxt} ${L.bathrooms} ห้องน้ำ ขนาด ${sqm} ตร.ม. ชั้น ${L.floorNo} ${pick(['วิวเมือง', 'วิวโล่ง ไม่มีตึกบัง', 'ทิศเหนือ ไม่ร้อน', 'ห้องมุม แสงเข้าดี'])}`,
      `ตกแต่งครบ พร้อมเข้าอยู่ ${pick(['เตียง ตู้เสื้อผ้า โซฟา', 'เฟอร์นิเจอร์บิวท์อินทั้งห้อง', 'ทีวี ตู้เย็น ไมโครเวฟ'])} แอร์ เครื่องทำน้ำอุ่น${s.deal === 'rent' ? ' เครื่องซักผ้า' : ''}`,
      `ส่วนกลาง: สระว่ายน้ำ ฟิตเนส รปภ. 24 ชม. คีย์การ์ด ค่าส่วนกลาง ${fmt(L.commonFee)} บาท/เดือน`,
      `เดินทางสะดวก ใกล้${lm} ${where}`,
      s.deal === 'rent' ? `สัญญาขั้นต่ำ ${L.minContractMonths} เดือน มัดจำ 2 เดือน ล่วงหน้า 1 เดือน` : pick(['ราคาต่อรองได้', 'ฟรีค่าโอน', 'เหมาะลงทุนปล่อยเช่านักศึกษา']),
    ].join('\n');
  } else {
    const style = v; // modern1 | modern2 | town | stilt
    const floors = style === 'modern1' ? 1 : 2;
    const beds = style === 'modern1' ? pick([2, 3, 3]) : style === 'modern2' ? pick([3, 4, 4]) : style === 'town' ? pick([2, 3]) : pick([2, 3]);
    const sqw = style === 'town' ? ri(18, 26) : style === 'stilt' ? ri(150, 400) : ri(55, 110);
    const sqm = style === 'town' ? ri(100, 140) : style === 'stilt' ? ri(90, 140) : style === 'modern1' ? ri(100, 150) : ri(160, 230);
    Object.assign(L, { landRai: Math.floor(sqw / 400), landNgan: Math.floor((sqw % 400) / 100), landWah: sqw % 100, landSqw: sqw, usableSqm: sqm, bedrooms: beds, bathrooms: style === 'stilt' ? 1 : Math.max(1, beds - pick([0, 1])), floors, parking: style === 'town' ? 1 : style === 'stilt' ? 2 : ri(1, 2), deedType: 'chanote' });
    const base = { modern1: rf(1.6e6, 3.2e6), modern2: rf(3.0e6, 5.6e6), town: rf(1.4e6, 2.4e6), stilt: rf(0.9e6, 1.9e6) }[style] * (big ? 1.15 : 1);
    const word = { modern1: 'บ้านเดี่ยวชั้นเดียว', modern2: 'บ้านเดี่ยว 2 ชั้น', town: 'ทาวน์โฮม 2 ชั้น', stilt: 'บ้านไม้ใต้ถุนสูง' }[style];
    if (s.deal === 'sale') L.price = round(base, 10000);
    else { L.price = round(style === 'town' ? rf(6500, 9500) : style === 'modern2' ? rf(12000, 18000) : rf(7000, 12000), 500); Object.assign(L, { depositMonths: 2, minContractMonths: 12, furnished: chance(0.5) ? 1 : 0 }); }
    L.title = `${s.deal === 'sale' ? 'ขาย' : 'ให้เช่า'}${word} ${beds} ห้องนอน ${pick([`${distWord} ${prov.th}`, `ใกล้${lm}`, `บนที่ดิน ${thaiLand(sqw)}`])}`;
    L.features = [style === 'town' ? 'security' : null, style !== 'town' ? 'garden' : null, chance(0.4) ? 'near-school' : null, chance(0.4) ? 'near-market' : null, style !== 'stilt' && chance(0.4) ? 'new-build' : null, chance(0.3) ? 'no-flood' : null, s.deal === 'rent' ? 'aircon' : null].filter(Boolean);
    const lines = {
      modern1: [`บ้านเดี่ยวชั้นเดียวสไตล์โมเดิร์น ${beds} ห้องนอน ${L.bathrooms} ห้องน้ำ พื้นที่ใช้สอย ${sqm} ตร.ม. บนที่ดิน ${thaiLand(sqw)}`, `${pick(['สร้างใหม่ ยังไม่เคยเข้าอยู่', 'สภาพดี พร้อมเข้าอยู่', 'รีโนเวทใหม่ ทาสีใหม่ทั้งหลัง'])} มีโรงจอดรถ ระเบียงหน้าบ้าน สนามหญ้า รั้วรอบขอบชิด`],
      modern2: [`บ้านเดี่ยว 2 ชั้น ${beds} ห้องนอน ${L.bathrooms} ห้องน้ำ พื้นที่ใช้สอย ${sqm} ตร.ม. บนที่ดิน ${thaiLand(sqw)}`, `${pick(['ห้องนอนใหญ่ชั้นบนมีห้องน้ำในตัว', 'มีห้องนอนชั้นล่าง เหมาะผู้สูงอายุ', 'ห้องนั่งเล่นโปร่ง เพดานสูง'])} โรงจอดรถ สนามหญ้าหน้าบ้าน`],
      town: [`ทาวน์โฮม 2 ชั้น ${beds} ห้องนอน ${L.bathrooms} ห้องน้ำ พื้นที่ใช้สอย ${sqm} ตร.ม. ที่ดิน ${sqw} ตร.ว.`, `ลานจอดรถหน้าบ้าน ประตูรั้วเหล็ก ${pick(['ต่อเติมครัวหลังบ้านแล้ว', 'ติดกันสาดหน้าบ้านแล้ว', 'ห้องหัวมุม'])}`],
      stilt: [`บ้านไม้ใต้ถุนสูงสไตล์อีสาน ${beds} ห้องนอน พื้นที่ใช้สอย ${sqm} ตร.ม. บนที่ดิน ${thaiLand(sqw)}`, `ไม้เนื้อแข็งทั้งหลัง เสาปูน มีชานบ้าน ใต้ถุนโล่งไว้นั่งเล่นรับลม ${pick(['มีบ่อน้ำ', 'ปลูกไม้ผลรอบบ้าน', 'มีพื้นที่ปลูกผักสวนครัว'])}`],
    }[style];
    L.description = [...lines, `${style === 'town' ? 'โครงการมีรปภ. ' : 'อยู่ในชุมชน เงียบสงบ '}ใกล้${lm} เดินทางสะดวก ${where}`, s.deal === 'sale' ? pick(['ราคาต่อรองได้', 'ฟรีค่าโอน', 'ยื่นกู้ได้ทุกธนาคาร', 'เจ้าของขายเอง']) : 'สัญญาขั้นต่ำ 12 เดือน มัดจำ 2 เดือน'].join('\n');
  }
  L.posterRole = chance(0.35) ? 'agent' : 'owner';
  if (L.posterRole === 'owner' && !L.features.includes('owner-direct') && chance(0.4)) L.features.push('owner-direct');
  L.featured = [2, 8, 13, 16, 21, 29].includes(s.no) ? 1 : 0;
  L.created = now - ri(1, 60) * 86400 - ri(0, 86000);
  return L;
});

/* ---------- SQL ---------- */
const q = (v) => (v == null ? 'NULL' : typeof v === 'number' ? String(v) : "'" + String(v).replace(/'/g, "''") + "'");
const DEALS = { sale: 'ขาย', rent: 'เช่า' }, TYPES = { house: 'บ้าน', land: 'ที่ดิน', condo: 'คอนโด' };
const order = [...listings].sort((a, b) => a.created - b.created);
const DEMO_VERSION = '2026-10-25-isan30';
const out = [
  `-- demo_version: ${DEMO_VERSION}`,
  '-- อีสานน่าอยู่ demo data: ประกาศตัวอย่าง 30 รายการ เขตอีสาน (ref SL-DEMO*)',
  '-- ติดป้าย "ตัวอย่าง" / noindex / ไม่รับการติดต่อ / ซ่อนเองเมื่อมีประกาศจริงครบตามที่ตั้ง — ลบถาวรได้ที่ /admin/settings',
  "DELETE FROM listing_tokens WHERE listing_id IN (SELECT id FROM listings WHERE ref LIKE 'SL-DEMO%');",
  "DELETE FROM listing_images WHERE listing_id IN (SELECT id FROM listings WHERE ref LIKE 'SL-DEMO%');",
  "DELETE FROM leads WHERE listing_id IN (SELECT id FROM listings WHERE ref LIKE 'SL-DEMO%');",
  "DELETE FROM listings WHERE ref LIKE 'SL-DEMO%';",
];
const missing = new Set();
order.forEach((L, i) => {
  const id = 910000 + L.no; // ช่วง id ใหม่ (ไม่ชนประวัติของประกาศตัวอย่างชุดเก่า)
  for (const n of L.images) if (!existsSync(`public/demo-img/${n}-800.webp`)) missing.add(n);
  const cols = {
    id, ref: `SL-DEMO${String(L.no).padStart(3, '0')}`, deal: L.deal, type: L.type, status: 'active', title: L.title, description: L.description, price: L.price,
    province_code: L.provinceCode, district_code: L.districtCode, subdistrict_code: L.subdistrictCode, lat: L.lat, lng: L.lng,
    land_rai: L.landRai ?? null, land_ngan: L.landNgan ?? null, land_wah: L.landWah ?? null, land_sqw: L.landSqw ?? null, deed_type: L.deedType ?? null, frontage_m: L.frontageM ?? null, zoning_color: L.zoningColor ?? null,
    usable_sqm: L.usableSqm ?? null, bedrooms: L.bedrooms ?? null, bathrooms: L.bathrooms ?? null, floors: L.floors ?? null, parking: L.parking ?? null,
    project_name: L.projectName ?? null, floor_no: L.floorNo ?? null, common_fee: L.commonFee ?? null,
    deposit_months: L.depositMonths ?? null, min_contract_months: L.minContractMonths ?? null, furnished: L.furnished ?? null,
    features: JSON.stringify(L.features), cover_key: `/demo-img/${L.images[0]}:webp`, image_count: L.images.length,
    poster_role: L.posterRole, owner_name: 'ประกาศตัวอย่าง', owner_phone: '0000000000',
    manage_token_hash: createHash('sha256').update('demo-' + id).digest('hex'), featured: L.featured, views: ri(20, 600),
    created_at: L.created, updated_at: L.created + 3600, approved_at: L.created + 3600, expires_at: now + 3650 * 86400,
  };
  out.push(`INSERT INTO listings (${Object.keys(cols).join(',')}) VALUES (${Object.values(cols).map(q).join(',')});`);
  out.push(`INSERT INTO listing_images (listing_id, idx, key_base, ext, width, height) VALUES ${L.images.map((n, k) => `(${id},${k},'/demo-img/${n}','webp',1600,1200)`).join(',')};`);
  out.push(`INSERT INTO price_history (listing_id, price, changed_at) SELECT ${id}, ${L.price}, ${L.created} WHERE NOT EXISTS (SELECT 1 FROM price_history WHERE listing_id = ${id});`);
  out.push(`INSERT INTO timeline (listing_id, event, actor, created_at) SELECT ${id}, 'submitted', 'owner', ${L.created} WHERE NOT EXISTS (SELECT 1 FROM timeline WHERE listing_id = ${id});`);
  out.push(`INSERT INTO timeline (listing_id, event, actor, created_at) SELECT ${id}, 'approved', 'admin:demo', ${L.created + 3600} WHERE NOT EXISTS (SELECT 1 FROM timeline WHERE listing_id = ${id} AND event = 'approved');`);
  const prov = PROV[String(L.provinceCode)], dist = DIST[String(L.provinceCode)].find((d) => d.code === L.districtCode);
  const toks = indexTokens([L.title, L.description, L.projectName, DEALS[L.deal], TYPES[L.type]], [prov.th, prov.en, dist.th, dist.en, cols.ref]);
  for (let k = 0; k < toks.length; k += 80) out.push(`INSERT OR IGNORE INTO listing_tokens (token, listing_id) VALUES ${toks.slice(k, k + 80).map((t) => `(${q(t)},${id})`).join(',')};`);
});
out.push(`INSERT INTO settings (key, value) VALUES ('demo_version', '${DEMO_VERSION}') ON CONFLICT(key) DO UPDATE SET value = excluded.value;`);
writeFileSync('seed/demo.sql', out.join('\n') + '\n');
const byType = listings.reduce((m, l) => ((m[l.type + '/' + l.deal] = (m[l.type + '/' + l.deal] || 0) + 1), m), {});
console.log(`ประกาศตัวอย่าง ${listings.length} รายการ · ${new Set(listings.map((l) => l.provinceCode)).size} จังหวัด → seed/demo.sql`);
console.log(byType);
if (missing.size) console.warn(`⚠ ยังไม่มีไฟล์รูป ${missing.size} ชุด เช่น ${[...missing].slice(0, 5).join(', ')}`);
