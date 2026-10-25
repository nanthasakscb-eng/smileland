export type GuideSection = { id: string; h: string; body: string };
export type Guide = {
  slug: string;
  kind: 'province' | 'knowledge';
  title: string;          // <title> และ h1
  description: string;    // meta description (≤ 160 ตัวอักษร)
  kicker: string;         // ป้ายเล็กเหนือหัวข้อ
  provinceCode?: number;  // คู่มือจังหวัด → แสดงสถิติประกาศจริงและลิงก์หน้าค้นหา
  published: string;      // YYYY-MM-DD
  updated: string;        // YYYY-MM-DD
  intro: string;          // markdown
  sections: GuideSection[];
  faq: { q: string; a: string }[];
  sources: { title: string; url: string }[];
  related?: string[];     // slug คู่มืออื่น
};
