import { drizzle } from 'drizzle-orm/d1';
import * as schema from './schema';
import type { Bindings } from '../env';

export const db = (env: Pick<Bindings, 'DB'>) => drizzle(env.DB, { schema });
export type DB = ReturnType<typeof db>;
export { schema };
