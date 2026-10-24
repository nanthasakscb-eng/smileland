// สร้าง seed/demo.sql — ข้อมูลตัวอย่าง (ใช้ทดสอบในเครื่องเท่านั้น ห้ามรันกับ production)
// ใช้: node scripts/build-demo-seed.mjs   (Node 22.18+ รองรับ import ไฟล์ .ts)
import { writeFileSync, readFileSync } from 'node:fs';
import { createHash, randomBytes } from 'node:crypto';
import { indexTokens } from '../src/lib/thai.ts';

const geoSql = readFileSync('seed/geo.sql', 'utf8');
const pName = {}, dName = {};
for (const m of geoSql.matchAll(/\((\d{2}),'([^']+)','([^']+)','[^']+','[a-z]+'\)/g)) pName[m[1]] = [m[2], m[3]];
for (const m of geoSql.matchAll(/\((\d{4}),(\d{2}),'([^']+)','([^']+)','[^']+','\d*'\)/g)) dName[m[1]] = [m[3], m[4]];

const q = (v) => (v == null ? 'NULL' : typeof v === 'number' ? String(v) : "'" + String(v).replace(/'/g, "''") + "'");
const now = Math.floor(Date.now() / 1000);
const DEALS = { sale: 'ขาย', rent: 'เช่า' }, TYPES = { house: 'บ้าน', land: 'ที่ดิน', condo: 'คอนโด' };

// [deal,type,district,title,price,desc,extra,lat,lng,features,featured]
const L = [
  ['sale', 'land', 3401, 'ขายที่ดินติดถนนชยางกูร 2 ไร่ ใกล้ห้างเซ็นทรัลอุบล', 9800000, 'ที่ดินแปลงสวยหน้ากว้าง 40 เมตร ติดถนนชยางกูร เหมาะทำโชว์รูม ร้านค้า หรือที่พักอาศัย ถมแล้วบางส่วน ไฟฟ้าประปาพร้อม ห่างเซ็นทรัลอุบลประมาณ 3 กม.', { landRai: 2, landNgan: 0, landWah: 0, deedType: 'chanote', frontageM: 40, zoningColor: 'red' }, 15.2667, 104.8442, ['road', 'electric', 'water', 'near-market'], 1],
  ['sale', 'house', 3401, 'ขายบ้านเดี่ยว 2 ชั้น 4 ห้องนอน หมู่บ้านใกล้ ม.ราชภัฏอุบล', 3290000, 'บ้านเดี่ยวสภาพดี พร้อมอยู่ ต่อเติมครัวหลังบ้าน หลังคาใหม่ ปลอดภัยด้วยระบบรักษาความปลอดภัย 24 ชั่วโมง เดินทางสะดวกใกล้มหาวิทยาลัยราชภัฏอุบลราชธานีและโรงพยาบาล', { landRai: 0, landNgan: 0, landWah: 60, usableSqm: 165, bedrooms: 4, bathrooms: 3, floors: 2, parking: 2, deedType: 'chanote' }, 15.2489, 104.8532, ['security', 'near-school', 'near-hospital'], 1],
  ['sale', 'land', 3415, 'ขายที่ดินวารินชำราบ 1 ไร่ 2 งาน ใกล้ ม.อุบลฯ', 2250000, 'ที่ดินเปล่าใกล้มหาวิทยาลัยอุบลราชธานี เหมาะสร้างหอพักหรือบ้านพัก ถนนลาดยางเข้าถึง น้ำไม่ท่วม เจ้าของขายเอง', { landRai: 1, landNgan: 2, landWah: 0, deedType: 'chanote', frontageM: 25, zoningColor: 'yellow' }, 15.1229, 104.9043, ['road', 'no-flood', 'owner-direct', 'near-school'], 0],
  ['rent', 'house', 3415, 'ให้เช่าบ้านเดี่ยวชั้นเดียว 3 ห้องนอน วารินชำราบ', 9500, 'บ้านเดี่ยวชั้นเดียว มีแอร์ 2 เครื่อง เฟอร์นิเจอร์บางส่วน ที่จอดรถ 2 คัน เลี้ยงสัตว์เล็กได้ ใกล้ตลาดวาริน', { usableSqm: 110, bedrooms: 3, bathrooms: 2, floors: 1, parking: 2, depositMonths: 2, minContractMonths: 12, furnished: 1 }, 15.1952, 104.8634, ['aircon', 'pet', 'near-market'], 0],
  ['sale', 'land', 3403, 'ขายที่ดินวิวแม่น้ำโขง โขงเจียม 3 ไร่ เหมาะทำรีสอร์ท', 6500000, 'ที่ดินวิวแม่น้ำโขงทำเลท่องเที่ยว ใกล้ผาแต้มและแม่น้ำสองสี เหมาะทำรีสอร์ท โฮมสเตย์ หรือร้านกาแฟวิวสวย', { landRai: 3, landNgan: 0, landWah: 0, deedType: 'ns3k', frontageM: 60, zoningColor: 'green' }, 15.3195, 105.4955, ['road', 'electric'], 1],
  ['sale', 'land', 3407, 'ขายที่นา 12 ไร่ เดชอุดม ติดคลองชลประทาน', 1800000, 'ที่นาแปลงใหญ่ดินดี ติดคลองชลประทาน ทำนาได้ปีละ 2 ครั้ง ถนนลูกรังเข้าถึง เหมาะลงทุนเกษตรหรือเก็บไว้เป็นมรดก', { landRai: 12, landNgan: 0, landWah: 0, deedType: 'chanote', zoningColor: 'green' }, 14.9063, 105.0789, ['water'], 0],
  ['sale', 'condo', 1030, 'ขายคอนโดติด BTS หมอชิต 1 ห้องนอน 35 ตร.ม. ชั้น 18', 3650000, 'ห้องมุมวิวสวนจตุจักร ตกแต่งครบ พร้อมเครื่องใช้ไฟฟ้า สระว่ายน้ำ ฟิตเนส เดิน 3 นาทีถึงสถานี เหมาะอยู่เองหรือปล่อยเช่า', { usableSqm: 35, bedrooms: 1, bathrooms: 1, parking: 0, projectName: 'เดอะ ไลน์ จตุจักร', floorNo: 18, commonFee: 1900 }, 13.8034, 100.5531, ['pool', 'gym', 'security', 'aircon'], 1],
  ['rent', 'condo', 1039, 'ให้เช่าคอนโดหรู ทองหล่อ 2 ห้องนอน 78 ตร.ม.', 55000, 'คอนโด Luxury ใจกลางทองหล่อ แต่งสวย เฟอร์ครบ วิวเมือง ใกล้ BTS ทองหล่อ ร้านอาหาร และห้างสรรพสินค้า', { usableSqm: 78, bedrooms: 2, bathrooms: 2, parking: 1, projectName: 'ทองหล่อ เรสซิเดนซ์', floorNo: 25, commonFee: 6500, depositMonths: 2, minContractMonths: 12, furnished: 1 }, 13.7305, 100.5805, ['pool', 'gym', 'security', 'aircon'], 1],
  ['sale', 'house', 1006, 'ขายทาวน์โฮม 3 ชั้น บางกะปิ ใกล้เดอะมอลล์', 4890000, 'ทาวน์โฮม 3 ชั้น 3 ห้องนอน รีโนเวทใหม่ทั้งหลัง ใกล้ห้างและโรงพยาบาล เดินทางเข้าเมืองสะดวก', { landRai: 0, landNgan: 0, landWah: 21, usableSqm: 180, bedrooms: 3, bathrooms: 3, floors: 3, parking: 1, deedType: 'chanote' }, 13.7656, 100.6431, ['renovated', 'near-market', 'near-hospital'], 0],
  ['rent', 'condo', 1047, 'ให้เช่าคอนโดบางนา ใกล้ BTS อุดมสุข สตูดิโอ', 9000, 'ห้องสตูดิโอ 26 ตร.ม. เฟอร์ครบ เครื่องซักผ้า ใกล้ BTS อุดมสุข และไบเทค บางนา', { usableSqm: 26, bedrooms: 0, bathrooms: 1, projectName: 'ไอดีโอ บางนา', floorNo: 9, commonFee: 900, depositMonths: 2, minContractMonths: 6, furnished: 1 }, 13.6793, 100.6094, ['pool', 'aircon', 'security'], 0],
  ['sale', 'house', 5015, 'ขายบ้านเดี่ยวสไตล์ล้านนา หางดง วิวดอย 4 ห้องนอน', 7900000, 'บ้านเดี่ยวสไตล์ล้านนาร่วมสมัยบนที่ดิน 1 งาน วิวดอยสุเทพ สวนสวย สระว่ายน้ำส่วนตัว บรรยากาศเงียบสงบ ใกล้ถนนวงแหวนรอบ 3', { landRai: 0, landNgan: 1, landWah: 20, usableSqm: 260, bedrooms: 4, bathrooms: 4, floors: 2, parking: 3, deedType: 'chanote' }, 18.6868, 98.9214, ['pool', 'garden', 'security'], 1],
  ['sale', 'land', 5007, 'ขายที่ดินแม่ริม 1 ไร่ ติดลำธาร บรรยากาศดี', 3200000, 'ที่ดินติดลำธารน้ำไหลตลอดปี ร่มรื่น เหมาะสร้างบ้านพักตากอากาศหรือคาเฟ่ ห่างตัวเมืองเชียงใหม่ 25 นาที', { landRai: 1, landNgan: 0, landWah: 0, deedType: 'chanote', frontageM: 30, zoningColor: 'green' }, 18.9137, 98.9442, ['road', 'electric', 'water'], 0],
  ['rent', 'house', 5014, 'ให้เช่าบ้านในหมู่บ้าน สันทราย 3 ห้องนอน มีสวน', 15000, 'บ้านเดี่ยวในหมู่บ้านจัดสรร มีสวนหน้าบ้าน แอร์ทุกห้อง ใกล้โรงเรียนนานาชาติ', { usableSqm: 150, bedrooms: 3, bathrooms: 2, floors: 2, parking: 2, depositMonths: 2, minContractMonths: 12, furnished: 1 }, 18.8461, 99.0441, ['garden', 'aircon', 'near-school', 'security'], 0],
  ['sale', 'condo', 5001, 'ขายคอนโดนิมมาน 1 ห้องนอน ชั้น 7 วิวดอยสุเทพ', 2390000, 'คอนโดทำเลนิมมานเหมินท์ เดินถึงห้างเมญ่า วิวดอยสุเทพ เหมาะลงทุนปล่อยเช่านักศึกษาและนักท่องเที่ยว', { usableSqm: 32, bedrooms: 1, bathrooms: 1, projectName: 'นิมมาน ฮิลล์', floorNo: 7, commonFee: 1200 }, 18.7988, 98.9675, ['pool', 'gym', 'aircon'], 0],
  ['sale', 'house', 4001, 'ขายบ้านเดี่ยว ขอนแก่น ใกล้ ม.ขอนแก่น 3 ห้องนอน', 2590000, 'บ้านเดี่ยวชั้นเดียวพร้อมอยู่ ใกล้มหาวิทยาลัยขอนแก่นและเซ็นทรัลขอนแก่น หมู่บ้านปลอดภัย', { landRai: 0, landNgan: 0, landWah: 55, usableSqm: 120, bedrooms: 3, bathrooms: 2, floors: 1, parking: 2, deedType: 'chanote' }, 16.4672, 102.8236, ['near-school', 'security'], 0],
  ['sale', 'house', 8303, 'ขายพูลวิลล่า ถลาง ภูเก็ต 3 ห้องนอน สระส่วนตัว', 18500000, 'พูลวิลล่าสร้างใหม่ ใกล้หาดลายัน และสนามบินภูเก็ต ตกแต่งพร้อมเข้าอยู่ เหมาะปล่อยเช่ารายวัน', { landRai: 0, landNgan: 1, landWah: 0, usableSqm: 220, bedrooms: 3, bathrooms: 4, floors: 1, parking: 2, deedType: 'chanote' }, 8.0187, 98.3184, ['pool', 'garden', 'new-build'], 1],
  ['rent', 'condo', 8302, 'ให้เช่าคอนโดป่าตอง 1 ห้องนอน วิวทะเล', 25000, 'คอนโดใกล้หาดป่าตอง วิวทะเล เฟอร์ครบ พร้อมอยู่ สระว่ายน้ำบนดาดฟ้า', { usableSqm: 40, bedrooms: 1, bathrooms: 1, projectName: 'ป่าตอง ซีวิว', floorNo: 6, commonFee: 2400, depositMonths: 2, minContractMonths: 6, furnished: 1 }, 7.8925, 98.2988, ['pool', 'aircon', 'security'], 0],
  ['sale', 'land', 8301, 'ขายที่ดินภูเก็ต เมือง 200 ตร.ว. ใกล้ถนนเจ้าฟ้า', 5400000, 'ที่ดินเปล่าแปลงสี่เหลี่ยม ติดซอยสาธารณะ ใกล้ถนนเจ้าฟ้าตะวันออก เหมาะสร้างบ้านหรือทาวน์โฮม', { landRai: 0, landNgan: 2, landWah: 0, deedType: 'chanote', frontageM: 20, zoningColor: 'orange' }, 7.8601, 98.3762, ['road', 'electric', 'water'], 0],
  ['sale', 'condo', 2004, 'ขายคอนโดพัทยา วิวทะเล จอมเทียน 2 ห้องนอน', 4200000, 'คอนโดวิวทะเลจอมเทียน ห้องใหญ่ 65 ตร.ม. ตกแต่งครบ เหมาะอยู่อาศัยหรือปล่อยเช่า', { usableSqm: 65, bedrooms: 2, bathrooms: 2, projectName: 'จอมเทียน บีช คอนโด', floorNo: 21, commonFee: 3200 }, 12.8956, 100.8724, ['pool', 'gym', 'security'], 0],
  ['rent', 'house', 2007, 'ให้เช่าทาวน์โฮม ศรีราชา ใกล้นิคมแหลมฉบัง', 12000, 'ทาวน์โฮม 2 ชั้น 3 ห้องนอน เหมาะพนักงานนิคมอุตสาหกรรม ใกล้โรบินสันศรีราชา', { usableSqm: 120, bedrooms: 3, bathrooms: 2, floors: 2, parking: 1, depositMonths: 2, minContractMonths: 12, furnished: 0 }, 13.1678, 100.9295, ['aircon', 'near-market'], 0],
  ['sale', 'land', 3021, 'ขายที่ดินปากช่อง เขาใหญ่ 5 ไร่ วิวภูเขา', 12500000, 'ที่ดินวิวเขาใหญ่ 360 องศา อากาศดีตลอดปี เหมาะทำบ้านพักตากอากาศ รีสอร์ท หรือฟาร์มสเตย์', { landRai: 5, landNgan: 0, landWah: 0, deedType: 'chanote', frontageM: 80, zoningColor: 'green' }, 14.5658, 101.4112, ['road', 'electric'], 1],
  ['sale', 'house', 3001, 'ขายบ้านแฝด นครราชสีมา ใกล้เดอะมอลล์โคราช', 2190000, 'บ้านแฝด 2 ชั้น 3 ห้องนอน หมู่บ้านใหม่ ส่วนกลางครบ ใกล้ห้างและโรงเรียน', { landRai: 0, landNgan: 0, landWah: 35, usableSqm: 130, bedrooms: 3, bathrooms: 2, floors: 2, parking: 2, deedType: 'chanote' }, 14.9799, 102.0978, ['new-build', 'security', 'near-school'], 0],
  ['sale', 'house', 1206, 'ขายบ้านเดี่ยว ปากเกร็ด ริมน้ำ 4 ห้องนอน', 12900000, 'บ้านเดี่ยวริมแม่น้ำเจ้าพระยา ที่ดินกว้าง 120 ตร.ว. ท่าเรือส่วนตัว บรรยากาศสงบ ใกล้ทางด่วน', { landRai: 0, landNgan: 1, landWah: 20, usableSqm: 320, bedrooms: 4, bathrooms: 5, floors: 2, parking: 3, deedType: 'chanote' }, 13.9123, 100.5085, ['garden', 'security'], 0],
  ['rent', 'condo', 1201, 'ให้เช่าคอนโดนนทบุรี ติด MRT 1 ห้องนอน', 8500, 'คอนโดติดรถไฟฟ้าสายสีม่วง เฟอร์ครบ ใกล้กระทรวงสาธารณสุขและเซ็นทรัลรัตนาธิเบศร์', { usableSqm: 30, bedrooms: 1, bathrooms: 1, projectName: 'พลัม คอนโด นนทบุรี', floorNo: 12, commonFee: 1000, depositMonths: 2, minContractMonths: 12, furnished: 1 }, 13.8622, 100.5143, ['pool', 'aircon'], 0],
  ['sale', 'condo', 7707, 'ขายคอนโดหัวหิน ใกล้ชายหาด 1 ห้องนอน', 3150000, 'คอนโดทำเลหัวหินใจกลางเมือง เดินถึงชายหาด สระว่ายน้ำ วิวสวน เหมาะเป็นบ้านหลังที่สอง', { usableSqm: 45, bedrooms: 1, bathrooms: 1, projectName: 'หัวหิน บลู', floorNo: 4, commonFee: 2000 }, 12.5684, 99.9577, ['pool', 'security'], 0],
  ['sale', 'land', 4101, 'ขายที่ดินอุดรธานี 3 งาน ใกล้เซ็นทรัลอุดร', 4500000, 'ที่ดินเปล่าในเมืองอุดรธานี ทำเลค้าขาย ใกล้เซ็นทรัลและสถานีรถไฟ เหมาะสร้างอาคารพาณิชย์', { landRai: 0, landNgan: 3, landWah: 0, deedType: 'chanote', frontageM: 18, zoningColor: 'red' }, 17.4128, 102.7871, ['road', 'electric', 'water', 'near-market'], 0],
  ['sale', 'land', 8404, 'ขายที่ดินเกาะสมุย วิวทะเล 1 ไร่ เฉวง', 15000000, 'ที่ดินบนเนินวิวทะเลเฉวง เหมาะสร้างพูลวิลล่า ถนนคอนกรีตเข้าถึง ไฟฟ้าประปาพร้อม', { landRai: 1, landNgan: 0, landWah: 0, deedType: 'chanote', frontageM: 35 }, 9.5357, 100.0612, ['road', 'electric', 'water'], 0],
  ['rent', 'land', 5701, 'ให้เช่าที่ดินเชียงราย 2 ไร่ ติดถนนพหลโยธิน', 20000, 'ที่ดินติดถนนพหลโยธิน เหมาะทำลานจอดรถ เต็นท์รถ หรือร้านค้า สัญญาระยะยาว', { landRai: 2, landNgan: 0, landWah: 0, deedType: 'chanote', frontageM: 50, depositMonths: 3, minContractMonths: 36 }, 19.9071, 99.8325, ['road', 'electric'], 0],
];

const out = ['-- SMILELAND demo data (ทดสอบในเครื่องเท่านั้น)', 'DELETE FROM listing_tokens WHERE listing_id BETWEEN 1000 AND 1099;', 'DELETE FROM listing_images WHERE listing_id BETWEEN 1000 AND 1099;', "DELETE FROM listings WHERE ref LIKE 'SL-DEMO%';"];
L.forEach(([deal, type, dist, title, price, description, x, lat, lng, features, featured], i) => {
  const id = 1000 + i;
  const prov = Math.floor(dist / 100);
  const sqw = x.landRai != null ? x.landRai * 400 + (x.landNgan || 0) * 100 + (x.landWah || 0) : null;
  const created = now - (i * 37000 + 3600);
  const cols = {
    id, ref: `SL-DEMO${String(i + 1).padStart(2, '0')}`, deal, type, status: 'active', title, description, price,
    province_code: prov, district_code: dist, lat, lng, land_rai: x.landRai ?? null, land_ngan: x.landNgan ?? null, land_wah: x.landWah ?? null, land_sqw: sqw,
    deed_type: x.deedType ?? null, frontage_m: x.frontageM ?? null, zoning_color: x.zoningColor ?? null, usable_sqm: x.usableSqm ?? null,
    bedrooms: x.bedrooms ?? null, bathrooms: x.bathrooms ?? null, floors: x.floors ?? null, parking: x.parking ?? null,
    project_name: x.projectName ?? null, floor_no: x.floorNo ?? null, common_fee: x.commonFee ?? null,
    deposit_months: x.depositMonths ?? null, min_contract_months: x.minContractMonths ?? null, furnished: x.furnished ?? null,
    features: JSON.stringify(features), poster_role: i % 3 === 0 ? 'agent' : 'owner', owner_name: 'ตัวอย่าง ทดสอบ', owner_phone: '0800000' + String(100 + i),
    manage_token_hash: createHash('sha256').update(randomBytes(16)).digest('hex'), featured, views: (i * 53) % 400 + 12,
    created_at: created, updated_at: created, approved_at: created + 1800, expires_at: created + 180 * 86400,
  };
  out.push(`INSERT INTO listings (${Object.keys(cols).join(',')}) VALUES (${Object.values(cols).map(q).join(',')});`);
  out.push(`INSERT INTO price_history (listing_id, price, changed_at) VALUES (${id}, ${price}, ${created});`);
  out.push(`INSERT INTO timeline (listing_id, event, actor, created_at) VALUES (${id}, 'submitted', 'owner', ${created}), (${id}, 'approved', 'admin:demo', ${created + 1800});`);
  const toks = indexTokens([title, description, x.projectName, DEALS[deal], TYPES[type]], [pName[prov]?.[0], pName[prov]?.[1], dName[dist]?.[0], dName[dist]?.[1], cols.ref]);
  for (let k = 0; k < toks.length; k += 60) out.push(`INSERT OR IGNORE INTO listing_tokens (token, listing_id) VALUES ${toks.slice(k, k + 60).map((t) => `(${q(t)},${id})`).join(',')};`);
});
writeFileSync('seed/demo.sql', out.join('\n') + '\n');
console.log(`demo listings: ${L.length} → seed/demo.sql`);
