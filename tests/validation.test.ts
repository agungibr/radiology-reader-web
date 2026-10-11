import { describe, expect, it } from 'vitest';
import { calculationInputSchema, drlAssessSchema } from '$lib/validation';

describe('calculationInputSchema', () => {
  const valid = {
    patientId: 'P001',
    patientName: 'Budi',
    gender: 'L',
    age: '45',
    weightKg: 70,
    examType: 'Chest PA',
    view: 'PA',
    studyDescription: 'Chest PA',
    bodyPartExamined: '',
    kvp: 70,
    ma: 200,
    timeS: 0.05,
    bsf: 1.35,
    coeffA: 0.0004,
    coeffB: 2.5917,
    dapMgyCm2: null
  };

  it('menerima input lengkap yang valid', () => {
    expect(calculationInputSchema.safeParse(valid).success).toBe(true);
  });

  it('menolak kVp nol atau negatif', () => {
    expect(calculationInputSchema.safeParse({ ...valid, kvp: 0 }).success).toBe(false);
    expect(calculationInputSchema.safeParse({ ...valid, kvp: -70 }).success).toBe(false);
  });

  it('menolak mA atau waktu nol atau negatif', () => {
    expect(calculationInputSchema.safeParse({ ...valid, ma: 0 }).success).toBe(false);
    expect(calculationInputSchema.safeParse({ ...valid, timeS: -1 }).success).toBe(false);
  });

  it('mengizinkan field opsional kosong (berat, DAP)', () => {
    const parsed = calculationInputSchema.safeParse({ ...valid, weightKg: null });
    expect(parsed.success).toBe(true);
  });

  it('menerima mAs langsung tanpa mA dan waktu', () => {
    const parsed = calculationInputSchema.safeParse({ ...valid, ma: null, timeS: null, masOverride: 10 });
    expect(parsed.success).toBe(true);
  });

  it('menolak tanpa mA/waktu maupun mAs', () => {
    const parsed = calculationInputSchema.safeParse({ ...valid, ma: null, timeS: null });
    expect(parsed.success).toBe(false);
  });
});

describe('drlAssessSchema', () => {
  it('menerima penilaian DAP-only tanpa INAK/ESAK', () => {
    const parsed = drlAssessSchema.safeParse({
      inak: null,
      esak: null,
      dap: 100,
      studyDescription: 'panoramik',
      bodyPartExamined: '',
      viewPosition: '',
      patientAge: '20'
    });
    expect(parsed.success).toBe(true);
  });

  it('menolak tanpa konteks pemeriksaan sama sekali', () => {
    const parsed = drlAssessSchema.safeParse({
      inak: 0.2,
      esak: 0.2,
      dap: null,
      studyDescription: '',
      bodyPartExamined: '',
      viewPosition: '',
      patientAge: ''
    });
    expect(parsed.success).toBe(false);
  });
});
