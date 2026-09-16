/**
 * API penilaian DRL: POST { inak, esak, dap, studyDescription, ... } -> DrlResult.
 * Murni komputasi (tanpa DB), memakai data statis `drl-data.json`.
 */
import { json } from '@sveltejs/kit';
import { assessDrl } from '$lib/drl';
import { drlAssessSchema } from '$lib/validation';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
  const parsed = drlAssessSchema.safeParse(await request.json());
  if (!parsed.success) {
    return json({ error: parsed.error.issues[0]?.message ?? 'Input tidak valid' }, { status: 400 });
  }
  return json(assessDrl(parsed.data));
};
