// สร้าง seed/geo/*.sql จากข้อมูลจังหวัด/อำเภอ/ตำบล (thailand-geography-json)
// ใช้: node scripts/build-geo-sql.mjs [โฟลเดอร์ที่มี provinces.json districts.json subdistricts.json]
// ถ้าไม่ระบุ จะดาวน์โหลดจาก GitHub
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const SRC = 'https://raw.githubusercontent.com/thailand-geography-data/thailand-geography-json/main/src/';
const dir = process.argv[2];
async function load(name) {
  if (dir && existsSync(join(dir, name + '.json'))) return JSON.parse(readFileSync(join(dir, name + '.json'), 'utf8'));
  const r = await fetch(SRC + name + '.json');
  if (!r.ok) throw new Error('download failed ' + name);
  return r.json();
}
const q = (s) => "'" + String(s).replace(/'/g, "''") + "'";
const slugify = (s) => String(s).toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
function region(code) {
  const c = Math.floor(code / 10);
  return { 1: 'central', 2: 'east', 3: 'northeast', 4: 'northeast', 5: 'north', 6: 'north', 7: 'west', 8: 'south', 9: 'south' }[c] || 'central';
}
// ข้อยกเว้นภูมิภาค (ตามการแบ่ง 6 ภาคที่ใช้ทั่วไป)
const REGION_FIX = { 60: 'central', 61: 'central', 62: 'central', 64: 'central', 66: 'central', 67: 'central', 70: 'west', 71: 'west', 72: 'central', 73: 'central', 74: 'central', 75: 'central', 76: 'west', 77: 'west', 63: 'west', 86: 'south' };

const [P, D, S] = await Promise.all(['provinces', 'districts', 'subdistricts'].map(load));
const out = 'seed/.geo-parts';
mkdirSync(out, { recursive: true });

const provRows = P.map((p) => `(${p.provinceCode},${q(p.provinceNameTh)},${q(p.provinceNameEn)},${q(slugify(p.provinceNameEn))},${q(REGION_FIX[p.provinceCode] || region(p.provinceCode))})`);
writeFileSync(join(out, '01_provinces.sql'), 'DELETE FROM provinces;\nINSERT INTO provinces (code,name_th,name_en,slug,region) VALUES\n' + provRows.join(',\n') + ';\n');

// slug อำเภอไม่ซ้ำภายในจังหวัด
const seen = new Map();
const distRows = D.map((d) => {
  let s = slugify(d.districtNameEn) || String(d.districtCode);
  const k = d.provinceCode + ':' + s;
  if (seen.has(k)) s = s + '-' + d.districtCode;
  seen.set(k, 1);
  return `(${d.districtCode},${d.provinceCode},${q(d.districtNameTh)},${q(d.districtNameEn)},${q(s)},${q(d.postalCode ?? '')})`;
});
const chunk = (arr, n) => Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n));
let i = 0;
writeFileSync(join(out, '02_districts_00.sql'), 'DELETE FROM districts;\n');
for (const c of chunk(distRows, 300)) writeFileSync(join(out, `02_districts_${String(++i).padStart(2, '0')}.sql`), 'INSERT INTO districts (code,province_code,name_th,name_en,slug,postal_code) VALUES\n' + c.join(',\n') + ';\n');

const subRows = S.map((s) => `(${s.subdistrictCode},${s.districtCode},${s.provinceCode},${q(s.subdistrictNameTh)},${q(s.subdistrictNameEn)},${q(s.postalCode ?? '')})`);
i = 0;
writeFileSync(join(out, '03_subdistricts_00.sql'), 'DELETE FROM subdistricts;\n');
for (const c of chunk(subRows, 400)) writeFileSync(join(out, `03_subdistricts_${String(++i).padStart(2, '0')}.sql`), 'INSERT INTO subdistricts (code,district_code,province_code,name_th,name_en,postal_code) VALUES\n' + c.join(',\n') + ';\n');

console.log(`provinces ${P.length}, districts ${D.length}, subdistricts ${S.length} → ${out}/`);

// รวมเป็นไฟล์เดียว (แต่ละคำสั่ง INSERT ยังเล็กกว่า 100KB)
import { readdirSync as _rd } from 'node:fs';
const combined = _rd(out).filter((f) => f.endsWith('.sql')).sort().map((f) => readFileSync(join(out, f), 'utf8')).join('\n');
writeFileSync('seed/geo.sql', '-- SMILELAND: จังหวัด/อำเภอ/ตำบล ทั่วประเทศ (สร้างโดย scripts/build-geo-sql.mjs)\n' + combined);
console.log('→ seed/geo.sql');
