import { describe, expect, it } from 'vitest';
import { calculateDap } from '$lib/dose';
import { assessDrl } from '$lib/drl';

// Regression: DapForm must assess the CALCULATED DAP, not the DICOM tag.
// Bug (DapForm.svelte): assessDrl received `dap: dicomDap` instead of
// `result.dapMgyCm2`, so DRL verdict ignored the geometry calculation.
describe('DAP panel wiring (regression)', () => {
  const panoramic = {
    studyDescription: 'panoramik',
    bodyPartExamined: '',
    viewPosition: '',
    patientAge: '20'
  };

  it('calculated DAP drives the DRL verdict', () => {
    const result = calculateDap({ kvp: 70, mas: 5, sidCm: 100, fieldAreaCm2: 100 });
    const drl = assessDrl({ inak: null, esak: null, dap: result.dapMgyCm2, ...panoramic });

    expect(drl.matched).toBe(true);
    expect(drl.metric).toBe('dap');
    expect(drl.drlDap).toBeCloseTo(120, 9);
    expect(drl.dapStatus).toBe('below');
  });
});
