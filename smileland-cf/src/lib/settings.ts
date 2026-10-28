import type { Bindings } from '../env';
import { db } from '../db';
import { settings } from '../db/schema';

let cache: { at: number; v: Record<string, string> } | null = null;
const TTL = 60_000;

export async function loadSettings(env: Bindings): Promise<Record<string, string>> {
  if (cache && Date.now() - cache.at < TTL) return cache.v;
  try {
    const rows = await db(env).select().from(settings);
    cache = { at: Date.now(), v: Object.fromEntries(rows.map((r) => [r.key, r.value])) };
  } catch {
    cache = { at: Date.now(), v: {} };
  }
  return cache.v;
}
export function invalidateSettings() { cache = null; }
