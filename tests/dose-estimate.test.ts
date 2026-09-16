import { describe, expect, it } from 'vitest';
import { estimateEffectiveDose, getDoseComparison } from '$lib/dose';

// Golden dari desktop Python core/dose_calculator.py.
describe('estimateEffectiveDose', () => {
  it('dewasa 70kg XRAY_CHEST = dosis dasar', () => {
    const r = estimateEffectiveDose({ age: 30, gender: 'M', weightKg: 70, examType: 'XRAY_CHEST' });

    expect(r.estimatedDoseMSv).toBeCloseTo(0.1, 9);
    expect(r.baseDose).toBeCloseTo(0.1, 9);
    expect(r.weightFactor).toBeCloseTo(1.0, 9);
  });

  it('anak 8th 25kg CT_HEAD dengan faktor usia/bb/gender', () => {
    const r = estimateEffectiveDose({ age: 8, gender: 'F', weightKg: 25, examType: 'CT_HEAD' });

    expect(r.estimatedDoseMSv).toBeCloseTo(0.28, 9);
    expect(r.ageFactor).toBeCloseTo(0.3, 9);
    expect(r.weightFactor).toBeCloseTo(0.5, 9);
    expect(r.genderFactor).toBeCloseTo(0.95, 9);
  });

  it('exam tak dikenal memakai DEFAULT', () => {
    const r = estimateEffectiveDose({ age: 45, gender: 'M', weightKg: 90, examType: 'DEFAULT' });

    expect(r.estimatedDoseMSv).toBeCloseTo(6.0, 9);
  });
});

describe('getDoseComparison', () => {
  it('membandingkan dengan background dan chest X-ray', () => {
    const c = getDoseComparison(0.1);

    expect(c.equivalentChestXrays).toBeCloseTo(1.0, 9);
    expect(c.equivalentDaysOfBackground).toBeCloseTo(15.2, 9);
    expect(c.airTravelHours).toBe(1200);
  });
});
