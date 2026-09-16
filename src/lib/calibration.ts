/**
 * Kalibrasi: konversi µGy dan regresi power y = a × kVp^b.
 * Port dari desktop Python (`inak_esak_panel` + `INAKESAKCalculator.fit_power_regression`).
 * Nilai `value` adalah variabel y regresi — di desktop diisi kolom µGy/mAs.
 */

export interface CalibrationPoint {
  kvp: number;
  value: number;
}

export interface RegressionResult {
  a: number;
  b: number;
  rSquared: number;
  pointsUsed: number;
}

/** mGy → µGy (×1000). */
export function toMicroGy(mgy: number): number {
  return mgy * 1000;
}

/**
 * µGy/mAs dari µGy dan mAs.
 *
 * @returns null saat mAs nol/negatif (sel tabel tampil "—", seperti desktop).
 */
export function toMicroGyPerMas(ugy: number, mas: number): number | null {
  if (!(mas > 0)) return null;
  return ugy / mas;
}

/**
 * Regresi power y = a × x^b via OLS pada data ln-ln.
 * Langkah identik desktop: X=ln(kVp), Y=ln(value), Y = A + b·X, a = e^A.
 *
 * @throws {Error} Jika titik < 2 atau semua kVp identik.
 */
export function fitPowerRegression(points: CalibrationPoint[]): RegressionResult {
  const n = points.length;
  if (n < 2) throw new Error('Minimal 2 titik kalibrasi diperlukan untuk regresi.');

  const xs = points.map((p) => Math.log(p.kvp));
  const ys = points.map((p) => Math.log(p.value));

  const sumX = xs.reduce((s, x) => s + x, 0);
  const sumY = ys.reduce((s, y) => s + y, 0);
  const sumXY = xs.reduce((s, x, i) => s + x * (ys[i] as number), 0);
  const sumX2 = xs.reduce((s, x) => s + x * x, 0);

  const denom = n * sumX2 - sumX ** 2;
  if (Math.abs(denom) < 1e-15) {
    throw new Error('Data kalibrasi degenerat (nilai kVp identik).');
  }
  const b = (n * sumXY - sumX * sumY) / denom;
  const aLog = (sumY - b * sumX) / n;
  const a = Math.exp(aLog);

  const yMean = sumY / n;
  const ssTot = ys.reduce((s, y) => s + (y - yMean) ** 2, 0);
  const ssRes = ys.reduce((s, y, i) => s + (y - (aLog + b * (xs[i] as number))) ** 2, 0);
  const rSquared = ssTot > 1e-15 ? 1 - ssRes / ssTot : 1.0;

  return { a, b, rSquared, pointsUsed: n };
}
