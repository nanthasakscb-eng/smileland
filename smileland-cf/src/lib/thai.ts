// ตัดคำภาษาไทยด้วย Intl.Segmenter (มีใน Workers runtime) เพื่อทำดัชนีค้นหา
// ภาษาไทยไม่มีช่องว่างระหว่างคำ จึงตัดคำตอนบันทึก แล้วเก็บคำลงตาราง listing_tokens

const STOP = new Set(['และ', 'หรือ', 'ที่', 'ใน', 'ของ', 'มี', 'ได้', 'จะ', 'เป็น', 'กับ', 'แล้ว', 'ให้', 'การ', 'ความ', 'นี้', 'ไป', 'มา', 'อยู่', 'ๆ', 'the', 'a', 'an', 'of', 'in', 'for', 'and']);

let seg: Intl.Segmenter | null = null;
function segmenter() {
  if (!seg) seg = new Intl.Segmenter('th', { granularity: 'word' });
  return seg;
}

export function normalize(s: string): string {
  return s.normalize('NFC').toLowerCase().replace(/[​‌‍﻿]/g, '');
}

export function tokenize(text: string, { keepStop = false } = {}): string[] {
  const out: string[] = [];
  for (const part of segmenter().segment(normalize(text))) {
    if (!part.isWordLike) continue;
    const w = part.segment.trim();
    if (!w || w.length > 40) continue;
    if (!keepStop && STOP.has(w)) continue;
    // ตัวเลขยาว ๆ (เช่น เบอร์) ไม่เอาเข้าดัชนี
    if (/^\d{5,}$/.test(w)) continue;
    out.push(w);
    // คำที่มีจุด เช่น "ม.อุบลราชธานี" → เพิ่ม "อุบลราชธานี" ด้วย
    if (w.includes('.')) for (const part of w.split('.')) if (part.length > 1) out.push(part);
  }
  return out;
}

/** คำสำหรับทำดัชนี: คำที่ตัดแล้ว + คำต้นฉบับทั้งก้อน (เช่น ชื่อจังหวัด) */
export function indexTokens(parts: (string | null | undefined)[], whole: (string | null | undefined)[] = []): string[] {
  const set = new Set<string>();
  for (const p of parts) if (p) for (const t of tokenize(p)) set.add(t);
  for (const w of whole) if (w) { const n = normalize(w).trim(); if (n) set.add(n.slice(0, 40)); }
  return [...set].slice(0, 400);
}

/** คำค้นจากผู้ใช้ → token (สูงสุด 6 คำ) */
export function queryTokens(q: string): string[] {
  const t = tokenize(q.slice(0, 120));
  const uniq = [...new Set(t)];
  // ตัดคำที่เป็น prefix ของคำอื่นในชุดออก เพื่อลดเงื่อนไขซ้ำ
  return uniq.filter((a) => !uniq.some((b) => b !== a && b.startsWith(a))).slice(0, 6);
}
