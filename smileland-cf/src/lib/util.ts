export const DEALS = { sale: 'ขาย', rent: 'เช่า' } as const;
export const TYPES = { house: 'บ้าน', land: 'ที่ดิน', condo: 'คอนโด' } as const;
export const TYPE_SLUGS = ['house', 'land', 'condo', 'property'] as const;
export type Deal = keyof typeof DEALS;
export type PType = keyof typeof TYPES;

export const REGIONS: Record<string, string> = {
  central: 'ภาคกลาง', north: 'ภาคเหนือ', northeast: 'ภาคตะวันออกเฉียงเหนือ',
  east: 'ภาคตะวันออก', west: 'ภาคตะวันตก', south: 'ภาคใต้',
};
export const REGION_ORDER = ['central', 'northeast', 'north', 'east', 'west', 'south'];

export const DEED_TYPES: Record<string, string> = {
  chanote: 'โฉนดที่ดิน (น.ส.4 จ.)', ns3k: 'น.ส.3 ก.', ns3: 'น.ส.3', spk: 'ส.ป.ก. 4-01', other: 'อื่น ๆ',
};
export const ZONING: Record<string, string> = {
  yellow: 'สีเหลือง (ที่อยู่อาศัยหนาแน่นน้อย)', orange: 'สีส้ม (หนาแน่นปานกลาง)', brown: 'สีน้ำตาล (หนาแน่นมาก)',
  red: 'สีแดง (พาณิชยกรรม)', purple: 'สีม่วง (อุตสาหกรรม)', green: 'สีเขียว (ชนบทและเกษตรกรรม)',
  'green-white': 'สีเขียวคาดขาว (อนุรักษ์ชนบทและเกษตรกรรม)', none: 'ไม่อยู่ในผังเมือง / ไม่ทราบ',
};
export const FEATURES: Record<string, string> = {
  road: 'ติดถนนสาธารณะ', electric: 'ไฟฟ้าเข้าถึง', water: 'ประปาเข้าถึง', 'no-flood': 'น้ำไม่ท่วม',
  'near-school': 'ใกล้สถานศึกษา', 'near-hospital': 'ใกล้โรงพยาบาล', 'near-market': 'ใกล้ตลาด/ห้าง',
  pool: 'สระว่ายน้ำ', gym: 'ฟิตเนส', security: 'รปภ. 24 ชม.', pet: 'เลี้ยงสัตว์ได้', aircon: 'เครื่องปรับอากาศ',
  garden: 'สวน', 'new-build': 'บ้านสร้างใหม่', renovated: 'รีโนเวทแล้ว', 'owner-direct': 'เจ้าของขายเอง',
};

export const nowSec = () => Math.floor(Date.now() / 1000);

export function formatPrice(n: number | null | undefined): string {
  if (n == null) return '-';
  return new Intl.NumberFormat('th-TH').format(n);
}
/** 3,500,000 → "3.5 ล้าน" */
export function shortPrice(n: number): string {
  if (n >= 1_000_000) return (Math.round(n / 100_000) / 10).toLocaleString('th-TH') + ' ล้าน';
  if (n >= 10_000) return (Math.round(n / 1_000)).toLocaleString('th-TH') + ' พัน';
  return n.toLocaleString('th-TH');
}

export function thaiDate(sec: number | null | undefined): string {
  if (!sec) return '-';
  return new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeZone: 'Asia/Bangkok' }).format(new Date(sec * 1000));
}
export function thaiDateTime(sec: number | null | undefined): string {
  if (!sec) return '-';
  return new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Bangkok' }).format(new Date(sec * 1000));
}

/** ไร่-งาน-ตร.ว. → ตร.ว. รวม (1 ไร่ = 400 ตร.ว., 1 งาน = 100 ตร.ว.) */
export function toSqw(rai?: number | null, ngan?: number | null, wah?: number | null): number | null {
  if (rai == null && ngan == null && wah == null) return null;
  return (rai || 0) * 400 + (ngan || 0) * 100 + (wah || 0);
}
export function landText(sqw: number | null | undefined): string {
  if (!sqw) return '';
  const rai = Math.floor(sqw / 400);
  const ngan = Math.floor((sqw % 400) / 100);
  const wah = Math.round((sqw % 100) * 10) / 10;
  const parts: string[] = [];
  if (rai) parts.push(`${rai.toLocaleString('th-TH')} ไร่`);
  if (ngan) parts.push(`${ngan} งาน`);
  if (wah) parts.push(`${wah} ตร.ว.`);
  return parts.join(' ') || '0 ตร.ว.';
}

export function slugify(s: string): string {
  return s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

const REF_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export function newRef(): string {
  const b = crypto.getRandomValues(new Uint8Array(6));
  return 'SL-' + Array.from(b, (x) => REF_ALPHABET[x % REF_ALPHABET.length]).join('');
}

export function normPhone(p: string): string {
  let d = String(p || '').replace(/\D/g, '');
  if (d.startsWith('66') && d.length === 11) d = '0' + d.slice(2);
  return d;
}
export const isThaiPhone = (p: string) => /^0\d{8,9}$/.test(p);
export const isEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);

export function clampInt(v: unknown, min: number, max: number): number | null {
  if (v === '' || v == null) return null;
  const n = Math.round(Number(String(v).replace(/,/g, '')));
  if (!Number.isFinite(n)) return null;
  return Math.min(max, Math.max(min, n));
}
export function clampNum(v: unknown, min: number, max: number): number | null {
  if (v === '' || v == null) return null;
  const n = Number(String(v).replace(/,/g, ''));
  if (!Number.isFinite(n)) return null;
  return Math.min(max, Math.max(min, n));
}
export function str(v: unknown, max: number): string {
  return String(v ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, max);
}

export function truncate(s: string, n: number): string {
  const t = s.replace(/\s+/g, ' ').trim();
  return t.length > n ? t.slice(0, n - 1).trimEnd() + '…' : t;
}

export function listingUrl(l: { id: number }): string {
  return `/listing/${l.id}`;
}

export function pricePerUnit(l: { price: number; deal: string; type: string; landSqw: number | null; usableSqm: number | null }): string | null {
  if (l.deal !== 'sale') return null;
  if (l.type === 'land' && l.landSqw) return `${formatPrice(Math.round(l.price / l.landSqw))} บาท/ตร.ว.`;
  if (l.usableSqm) return `${formatPrice(Math.round(l.price / l.usableSqm))} บาท/ตร.ม.`;
  return null;
}
