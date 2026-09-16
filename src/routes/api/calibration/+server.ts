/**
 * API set kalibrasi: GET (semua set + titik) / POST (simpan set + titik).
 */
import { json } from '@sveltejs/kit';
import { getDb } from '$lib/db/client';
import { calibrationPoints, calibrationSets } from '$lib/db/schema';
import { calibrationSetSchema } from '$lib/validation';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ platform }) => {
  const database = platform?.env?.DB;
  if (!database) return json({ error: 'Database tidak tersedia' }, { status: 500 });
  const db = getDb(database);
  const sets = await db.select().from(calibrationSets);
  const points = await db.select().from(calibrationPoints);
  return json(sets.map((s) => ({ ...s, points: points.filter((p) => p.setId === s.id) })));
};

export const POST: RequestHandler = async ({ request, platform }) => {
  const parsed = calibrationSetSchema.safeParse(await request.json());
  if (!parsed.success) {
    return json({ error: parsed.error.issues[0]?.message ?? 'Input tidak valid' }, { status: 400 });
  }
  const database = platform?.env?.DB;
  if (!database) return json({ error: 'Database tidak tersedia' }, { status: 500 });
  try {
    const db = getDb(database);
    const v = parsed.data;
    const inserted = await db
      .insert(calibrationSets)
      .values({
        name: v.name,
        coeffA: v.coeffA,
        coeffB: v.coeffB,
        r2: v.r2,
        createdAt: new Date().toISOString()
      })
      .returning({ id: calibrationSets.id });
    const setId = inserted[0]?.id;
    if (setId === undefined || setId === null) throw new Error('Gagal menyimpan set kalibrasi');
    await db.insert(calibrationPoints).values(v.points.map((p) => ({ setId, ...p })));
    return json({ id: setId }, { status: 201 });
  } catch (e) {
    return json(
      { error: e instanceof Error ? e.message : 'Gagal menyimpan kalibrasi' },
      { status: 500 }
    );
  }
};
