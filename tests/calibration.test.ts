import { describe, expect, it } from 'vitest';
import { fitPowerRegression, toMicroGy, toMicroGyPerMas } from '$lib/calibration';

describe('toMicroGy', () => {
  it('mengonversi mGy ke µGy (×1000)', () => {
    expect(toMicroGy(0.19)).toBeCloseTo(190.0, 9);
    expect(toMicroGy(1.16)).toBeCloseTo(1160.0, 9);
  });
});

describe('toMicroGyPerMas', () => {
  it('menghitung µGy/mAs dari µGy dan mAs', () => {
    expect(toMicroGyPerMas(190.0, 20)).toBeCloseTo(9.5, 9);
  });

  it('mengembalikan null saat mAs nol atau negatif', () => {
    expect(toMicroGyPerMas(190.0, 0)).toBeNull();
    expect(toMicroGyPerMas(190.0, -5)).toBeNull();
  });
});

// Golden regression values from desktop Python fit_power_regression
// on points (50,190) (60,320) (70,490) (80,690).
describe('fitPowerRegression', () => {
  const points = [
    { kvp: 50, value: 190.0 },
    { kvp: 60, value: 320.0 },
    { kvp: 70, value: 490.0 },
    { kvp: 80, value: 690.0 }
  ];

  it('menurunkan koefisien a, b, dan R² dari data kalibrasi', () => {
    const result = fitPowerRegression(points);

    expect(result.a).toBeCloseTo(0.004075289090185622, 9);
    expect(result.b).toBeCloseTo(2.7503756984957493, 9);
    expect(result.rSquared).toBeCloseTo(0.999452945210824, 9);
    expect(result.pointsUsed).toBe(4);
  });

  it('menolak data kurang dari 2 titik', () => {
    expect(() => fitPowerRegression([{ kvp: 70, value: 490.0 }])).toThrow();
  });

  it('menolak data dengan kVp identik', () => {
    expect(() =>
      fitPowerRegression([
        { kvp: 70, value: 490.0 },
        { kvp: 70, value: 500.0 }
      ])
    ).toThrow();
  });
});
