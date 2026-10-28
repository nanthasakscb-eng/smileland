import { asc, eq, inArray } from 'drizzle-orm';
import type { Bindings } from '../env';
import { db } from '../db';
import { provinces, districts, subdistricts, type Province, type District } from '../db/schema';

import { SERVICE_PROVINCES } from './service-area';

// ข้อมูลภูมิศาสตร์เปลี่ยนน้อยมาก → แคชในหน่วยความจำของ isolate
let cache: { at: number; provinces: Province[]; districts: District[] } | null = null;
const TTL = 10 * 60 * 1000;

export async function geo(env: Bindings) {
  if (cache && Date.now() - cache.at < TTL) return cache;
  const d = db(env);
  const [p, ds] = await Promise.all([
    d.select().from(provinces).where(inArray(provinces.code, SERVICE_PROVINCES)).orderBy(asc(provinces.nameTh)),
    d.select().from(districts).where(inArray(districts.provinceCode, SERVICE_PROVINCES)).orderBy(asc(districts.nameTh)),
  ]);
  // เรียงตามพจนานุกรมไทย (SQLite เรียงแบบ binary ทำให้ เ แ โ ไปอยู่ท้าย)
  const coll = new Intl.Collator('th');
  p.sort((a, b) => coll.compare(a.nameTh, b.nameTh));
  ds.sort((a, b) => coll.compare(a.nameTh, b.nameTh));
  cache = { at: Date.now(), provinces: p, districts: ds };
  return cache;
}

export async function provinceBySlug(env: Bindings, slug: string) {
  return (await geo(env)).provinces.find((p) => p.slug === slug);
}
export async function provinceByCode(env: Bindings, code: number) {
  return (await geo(env)).provinces.find((p) => p.code === code);
}
export async function districtBySlug(env: Bindings, provinceCode: number, slug: string) {
  return (await geo(env)).districts.find((d) => d.provinceCode === provinceCode && d.slug === slug);
}
export async function districtByCode(env: Bindings, code: number) {
  return (await geo(env)).districts.find((d) => d.code === code);
}
export async function districtsOf(env: Bindings, provinceCode: number) {
  return (await geo(env)).districts.filter((d) => d.provinceCode === provinceCode);
}
export async function subdistrictsOf(env: Bindings, districtCode: number) {
  if (!(await districtByCode(env, districtCode))) return [];
  const coll = new Intl.Collator('th');
  return (await db(env).select({ code: subdistricts.code, nameTh: subdistricts.nameTh, postalCode: subdistricts.postalCode })
    .from(subdistricts).where(eq(subdistricts.districtCode, districtCode))).sort((a, b) => coll.compare(a.nameTh, b.nameTh));
}
export async function subdistrictName(env: Bindings, code: number | null) {
  if (!code) return null;
  const r = await db(env).select({ nameTh: subdistricts.nameTh, districtCode: subdistricts.districtCode }).from(subdistricts).where(eq(subdistricts.code, code)).limit(1);
  return r[0] ?? null;
}

/** ชื่อจังหวัดสำหรับแสดง (กรุงเทพฯ ใช้ "เขต/แขวง") */
export const isBangkok = (provinceCode: number) => provinceCode === 10;
export const districtLabel = (provinceCode: number) => (isBangkok(provinceCode) ? 'เขต' : 'อำเภอ');
export const subdistrictLabel = (provinceCode: number) => (isBangkok(provinceCode) ? 'แขวง' : 'ตำบล');
