import { drizzle } from 'drizzle-orm/d1';
import * as schema from './schema';

/**
 * Klien D1 bertipe untuk route server.
 * Pakai hanya di `+server.ts` (jangan import dari komponen client).
 */
export function getDb(database: D1Database) {
  return drizzle(database, { schema });
}
