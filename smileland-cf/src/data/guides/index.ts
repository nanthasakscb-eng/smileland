import type { Guide } from './types';
import { provinceGuides } from './provinces';
import { knowledgeGuides } from './knowledge';

export type { Guide } from './types';
export const guides: Guide[] = [...provinceGuides, ...knowledgeGuides];
export const guideBySlug = (slug: string) => guides.find((g) => g.slug === slug);
export const guideForProvince = (code: number) => provinceGuides.find((g) => g.provinceCode === code);
