import content from '../data/travel-content.json';
import landmarks from '../data/isan-landmarks.json';
import provinceCovers from '../data/isan-covers.json';
import { travelProvinces } from '../data/travel-provinces';
import { ubonImages } from '../data/ubon-images';

export type TravelPhoto = { image: string; artist: string; license: string; licenseUrl: string; source: string; title: string; placeName?: string; placeIndex?: number; description?: string };
export type TravelArticle = typeof content[number];
const photos = landmarks as Record<string, TravelPhoto>;
const covers = provinceCovers as Record<string, TravelPhoto | null>;
export const travelArticles = content;
export const travelPhoto = (slug: string, index: number) => {
  const p = photos[`${slug}:${index}`];
  return p && /^CC BY(?:-SA)? [1-4]\.(?:0|5)$/.test(p.license) && p.source.startsWith('https://commons.wikimedia.org/wiki/') ? p : undefined;
};
export const travelSummaries = travelProvinces.map(([name, slug]) => {
  const a = content.find(p => p.slug === slug);
  const photo = slug === 'ubon-ratchathani' ? { ...ubonImages[8], placeName: 'ผาชะนะได' }
    : a?.places.map((_, i) => travelPhoto(slug, i)).find(Boolean)
      || (covers[slug]?.license === 'CC BY 4.0' && covers[slug]?.source.startsWith('https://commons.wikimedia.org/wiki/') ? covers[slug] : undefined);
  return { name, slug, subtitle: a?.subtitle || 'เที่ยวแล้ว…อยากอยู่ต่อ', intro: a?.intro || 'จากวัดงามกลางเมืองอุบล ถึงลานหินและสายน้ำโขง เลือกจุดหมายที่ใช่แล้วออกไปเที่ยวด้วยกัน', photo };
});
export const travelKindNames: Record<string, string> = { temple: 'วัดและศรัทธา', nature: 'ธรรมชาติ', history: 'ประวัติศาสตร์', community: 'ชุมชนและงานฝีมือ', museum: 'พิพิธภัณฑ์และการเรียนรู้', town: 'เดินเมือง', viewpoint: 'จุดชมวิว' };
export const travelKindTips: Record<string, string> = {
  temple: 'แต่งกายสุภาพ ตรวจเวลาจากวัด และเข้าชมเฉพาะส่วนที่อนุญาต เว้นพื้นที่ให้ผู้ประกอบศาสนกิจ',
  nature: 'ตรวจประกาศเปิดและสภาพอากาศจากผู้ดูแลก่อนเดินทาง เลือกเส้นทางตามกำลังและทำตามข้อกำหนดพื้นที่',
  history: 'ตรวจสถานะเปิดกับผู้ดูแลหรือกรมศิลปากร ไม่ปีน สัมผัส หรือเคลื่อนย้ายชิ้นส่วนโบราณสถาน',
  community: 'ติดต่อกลุ่มชุมชนก่อนหากต้องการกิจกรรมหรือชมการผลิต การสาธิตขึ้นอยู่กับความพร้อมของผู้ผลิต',
  museum: 'ตรวจวันเปิดและส่วนจัดแสดงกับสถานที่โดยตรง ปฏิบัติตามข้อกำหนดเรื่องการถ่ายภาพและสิ่งจัดแสดง',
  town: 'เลือกช่วงอากาศเหมาะสม ใช้ทางสาธารณะ และขออนุญาตก่อนถ่ายภาพภายในบ้านหรือร้านของชุมชน',
  viewpoint: 'ใช้จุดชมวิวที่จัดไว้ ตรวจสภาพพื้นที่ก่อนเดินทาง และไม่เข้าใกล้ขอบผาหรือทางจราจรเพื่อถ่ายภาพ',
};
