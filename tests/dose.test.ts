import { describe, expect, it } from 'vitest';
import { calculateDap, calculateInakEsak } from '$lib/dose';

// Golden values generated from the desktop Python implementation
// (D:/radiologi/text-recognition/core/inak_esak_calculator.py).
// The TS port must match to 9 decimals.
describe('calculateInakEsak', () => {
  it('menghitung y, INAK, dan ESAK untuk 70 kVp / 10 mAs', () => {
    const result = calculateInakEsak({ kvp: 70, ma: 200, timeS: 0.05 });

    expect(result.mas).toBeCloseTo(10.0, 9);
    expect(result.yMgy).toBeCloseTo(24.21032289123948, 9);
    expect(result.inakMgy).toBeCloseTo(0.2421032289123948, 9);
    expect(result.esakMgy).toBeCloseTo(0.326839359031733, 9);
  });

  it('menghitung y, INAK, dan ESAK untuk 81 kVp / 6.4 mAs', () => {
    const result = calculateInakEsak({ kvp: 81, ma: 160, timeS: 0.04 });

    expect(result.mas).toBeCloseTo(6.4, 9);
    expect(result.yMgy).toBeCloseTo(35.341144907912124, 9);
    expect(result.inakMgy).toBeCloseTo(0.2261833274106376, 9);
    expect(result.esakMgy).toBeCloseTo(0.3053474920043608, 9);
  });

  it('memakai BSF kustom saat diberikan', () => {
    const result = calculateInakEsak({ kvp: 70, ma: 200, timeS: 0.05, bsf: 1.4 });

    expect(result.esakMgy).toBeCloseTo(result.inakMgy * 1.4, 9);
  });

  it('menolak kVp nol atau negatif', () => {
    expect(() => calculateInakEsak({ kvp: 0, ma: 200, timeS: 0.05 })).toThrow();
    expect(() => calculateInakEsak({ kvp: -70, ma: 200, timeS: 0.05 })).toThrow();
  });

  it('mAs langsung setara dengan mA × waktu', () => {
    const viaOverride = calculateInakEsak({ kvp: 70, masOverride: 10 });

    expect(viaOverride.mas).toBeCloseTo(10.0, 9);
    expect(viaOverride.inakMgy).toBeCloseTo(0.2421032289123948, 9);
    expect(viaOverride.esakMgy).toBeCloseTo(0.326839359031733, 9);
  });

  it('override null kembali ke mA × waktu', () => {
    const result = calculateInakEsak({ kvp: 70, ma: 200, timeS: 0.05, masOverride: null });

    expect(result.mas).toBeCloseTo(10.0, 9);
    expect(result.inakMgy).toBeCloseTo(0.2421032289123948, 9);
  });
});

describe('calculateDap', () => {
  it('menghitung rantai DAP untuk SID 100 cm (tanpa koreksi jarak)', () => {
    const result = calculateDap({ kvp: 70, mas: 10, sidCm: 100, fieldAreaCm2: 625 });

    expect(result.yKvp).toBeCloseTo(24.8884, 9);
    expect(result.iakSddMgy).toBeCloseTo(0.248884, 9);
    expect(result.iakSidMgy).toBeCloseTo(0.248884, 9);
    expect(result.dapMgyCm2).toBeCloseTo(155.5525, 9);
  });

  it('menghitung rantai DAP dengan koreksi SID 120 cm', () => {
    const result = calculateDap({ kvp: 81, mas: 6.4, sidCm: 120, fieldAreaCm2: 400 });

    expect(result.yKvp).toBeCloseTo(35.6222, 9);
    expect(result.iakSddMgy).toBeCloseTo(0.22798208, 9);
    expect(result.iakSidMgy).toBeCloseTo(0.1583208888888889, 9);
    expect(result.dapMgyCm2).toBeCloseTo(63.32835555555556, 9);
  });

  it('menolak kVp atau SID nol atau negatif', () => {
    expect(() => calculateDap({ kvp: 0, mas: 10, sidCm: 100, fieldAreaCm2: 625 })).toThrow();
    expect(() => calculateDap({ kvp: 70, mas: 10, sidCm: 0, fieldAreaCm2: 625 })).toThrow();
  });
});
