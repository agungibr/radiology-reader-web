/**
 * API history: GET (paginasi) / POST (simpan + nilai DRL di server) / DELETE (satu/all).
 */
import { json } from '@sveltejs/kit';
import { desc, eq, sql } from 'drizzle-orm';
import { getDb } from '$lib/db/client';
import { calculations } from '$lib/db/schema';
import { calculateInakEsak } from '$lib/dose';
import { assessDrl } from '$lib/drl';
import { buildDrlLimitText, worstDrlStatus } from '$lib/history';
import { calculationInputSchema, historyQuerySchema } from '$lib/validation';
import type { RequestHandler } from './$types';

function requireDb(platform: App.Platform | undefined) {
  const database = platform?.env?.DB;
  if (!database) throw new Error('Database tidak tersedia');
  return getDb(database);
}

export const GET: RequestHandler = async ({ url, platform }) => {
  const query = historyQuerySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!query.success) {
    return json({ error: query.error.issues[0]?.message ?? 'Query tidak valid' }, { status: 400 });
  }
  try {
    const db = requireDb(platform);
    const { page, limit } = query.data;
    const rows = await db
      .select()
      .from(calculations)
      .orderBy(desc(calculations.id))
      .limit(limit)
      .offset((page - 1) * limit);
    const total = (await db.select({ n: sql<number>`count(*)` }).from(calculations))[0]?.n ?? 0;
    return json({ rows, total, page, limit });
  } catch (e) {
    return json(
      { error: e instanceof Error ? e.message : 'Gagal memuat history' },
      { status: 500 }
    );
  }
};

export const POST: RequestHandler = async ({ request, platform }) => {
  const parsed = calculationInputSchema.safeParse(await request.json());
  if (!parsed.success) {
    return json({ error: parsed.error.issues[0]?.message ?? 'Input tidak valid' }, { status: 400 });
  }
  try {
    const db = requireDb(platform);
    const v = parsed.data;

    const dose = calculateInakEsak({
      kvp: v.kvp,
      ma: v.ma,
      timeS: v.timeS,
      bsf: v.bsf,
      coeffA: v.coeffA,
      coeffB: v.coeffB
    });
    const drl = assessDrl({
      inak: dose.inakMgy,
      esak: dose.esakMgy,
      dap: v.dapMgyCm2,
      studyDescription: v.studyDescription,
      bodyPartExamined: v.bodyPartExamined,
      viewPosition: v.view,
      patientAge: v.age
    });

    const examLabel = [drl.examination, drl.view].filter(Boolean).join(' ') || v.examType;
    const inserted = await db
      .insert(calculations)
      .values({
        createdAt: new Date().toISOString(),
        patientId: v.patientId,
        patientName: v.patientName,
        gender: v.gender,
        age: v.age,
        weightKg: v.weightKg,
        examType: examLabel,
        view: drl.view,
        kvp: v.kvp,
        ma: v.ma,
        timeS: v.timeS,
        mas: dose.mas,
        inakMgy: dose.inakMgy,
        esakMgy: dose.esakMgy,
        dapMgyCm2: v.dapMgyCm2,
        drlLimitText: buildDrlLimitText(drl),
        drlStatus: worstDrlStatus(drl)
      })
      .returning({ id: calculations.id });
    return json({ id: inserted[0]?.id ?? null, dose, drl }, { status: 201 });
  } catch (e) {
    return json(
      { error: e instanceof Error ? e.message : 'Gagal menyimpan history' },
      { status: 500 }
    );
  }
};

export const DELETE: RequestHandler = async ({ url, platform }) => {
  try {
    const db = requireDb(platform);
    const id = url.searchParams.get('id');
    if (url.searchParams.get('all') === 'true') {
      await db.delete(calculations);
      return json({ ok: true });
    }
    const numericId = Number(id);
    if (!id || !Number.isInteger(numericId)) {
      return json({ error: 'Parameter id tidak valid' }, { status: 400 });
    }
    await db.delete(calculations).where(eq(calculations.id, numericId));
    return json({ ok: true });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Gagal menghapus' }, { status: 500 });
  }
};
