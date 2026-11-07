import type { Guide } from './types';
import { provinceGuides as mainProvinces } from './provinces';
import { southGuides } from './provinces-south';
import { northGuides } from './provinces-north';
import { knowledgeGuides } from './knowledge';

export type { Guide } from './types';
/** คู่มือรายจังหวัดครบ 20 จังหวัด (จังหวัดใหญ่ก่อน แล้วเรียงตามชื่อ) */
export const provinceGuides: Guide[] = [...mainProvinces, ...[...southGuides, ...northGuides].sort((a, b) => a.kicker.localeCompare(b.kicker, 'th'))];
export const guides: Guide[] = [...provinceGuides, ...knowledgeGuides];
export const guideBySlug = (slug: string) => guides.find((g) => g.slug === slug);
export const guideForProvince = (code: number) => provinceGuides.find((g) => g.provinceCode === code);
