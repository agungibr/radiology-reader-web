/**
 * Perhitungan dosis INAK/ESAK dan DAP.
 * Port dari desktop Python `core/inak_esak_calculator.py` — rumus identik,
 * angka harus cocok sampai 9 desimal (lihat `tests/dose.test.ts`).
 */

// ---------------------------------------------------------------------------
// Konstanta default (sama seperti desktop)
// ---------------------------------------------------------------------------

/** Koefisien regresi power default: y = a × kVp^b. */
export const DEFAULT_COEFF_A = 0.0004;
export const DEFAULT_COEFF_B = 2.5917;
/** Backscatter Factor default. */
export const DEFAULT_BSF = 1.35;

/** Koefisien quadratic DAP default: y = c1·kVp² + c2·kVp + c3. */
export const DAP_DEFAULT_C1 = 0.0067;
export const DAP_DEFAULT_C2 = -0.0359;
export const DAP_DEFAULT_C3 = -5.4286;
/** Jarak sumber-ke-detektor acuan (cm). */
export const DAP_REFERENCE_DISTANCE_CM = 100;

// ---------------------------------------------------------------------------
// INAK / ESAK
// ---------------------------------------------------------------------------

export interface InakEsakInput {
  kvp: number;
  ma: number;
  /** Waktu eksposur dalam detik. */
  timeS: number;
  bsf?: number;
  coeffA?: number;
  coeffB?: number;
}

export interface InakEsakResult {
  kvp: number;
  ma: number;
  timeS: number;
  mas: number;
  yMgy: number;
  inakMgy: number;
  esakMgy: number;
  bsf: number;
  coeffA: number;
  coeffB: number;
}

/**
 * Keluaran dosis tabung y (mGy): y = a × kVp^b.
 *
 * @throws {Error} Jika kVp nol atau negatif.
 */
export function calculateTubeOutputY(
  kvp: number,
  coeffA: number = DEFAULT_COEFF_A,
  coeffB: number = DEFAULT_COEFF_B
): number {
  if (kvp <= 0) throw new Error(`kVp harus positif, diterima ${kvp}`);
  return coeffA * kvp ** coeffB;
}

/**
 * Rantai lengkap mAs → y → INAK → ESAK.
 *
 * INAK = y × (mAs / 1000), ESAK = INAK × BSF.
 */
export function calculateInakEsak(input: InakEsakInput): InakEsakResult {
  const {
    kvp,
    ma,
    timeS,
    bsf = DEFAULT_BSF,
    coeffA = DEFAULT_COEFF_A,
    coeffB = DEFAULT_COEFF_B
  } = input;

  const mas = ma * timeS;
  const yMgy = calculateTubeOutputY(kvp, coeffA, coeffB);
  const inakMgy = yMgy * (mas / 1000);
  const esakMgy = inakMgy * bsf;

  return { kvp, ma, timeS, mas, yMgy, inakMgy, esakMgy, bsf, coeffA, coeffB };
}

// ---------------------------------------------------------------------------
// DAP (Dose Area Product)
// ---------------------------------------------------------------------------

export interface DapInput {
  kvp: number;
  mas: number;
  sidCm: number;
  fieldAreaCm2: number;
  c1?: number;
  c2?: number;
  c3?: number;
}

export interface DapResult {
  kvp: number;
  mas: number;
  sidCm: number;
  fieldAreaCm2: number;
  c1: number;
  c2: number;
  c3: number;
  yKvp: number;
  iakSddMgy: number;
  iakSidMgy: number;
  dapMgyCm2: number;
}

/**
 * Keluaran quadratic y (mGy): y = c1·kVp² + c2·kVp + c3.
 *
 * @throws {Error} Jika kVp nol atau negatif.
 */
export function calculateDapY(
  kvp: number,
  c1: number = DAP_DEFAULT_C1,
  c2: number = DAP_DEFAULT_C2,
  c3: number = DAP_DEFAULT_C3
): number {
  if (kvp <= 0) throw new Error(`kVp harus positif, diterima ${kvp}`);
  return c1 * kvp ** 2 + c2 * kvp + c3;
}

/**
 * Rantai lengkap DAP: y → IAK SDD (acuan 100 cm) → IAK SID → DAP.
 *
 * @throws {Error} Jika kVp atau SID nol atau negatif.
 */
export function calculateDap(input: DapInput): DapResult {
  const {
    kvp,
    mas,
    sidCm,
    fieldAreaCm2,
    c1 = DAP_DEFAULT_C1,
    c2 = DAP_DEFAULT_C2,
    c3 = DAP_DEFAULT_C3
  } = input;

  if (sidCm <= 0) throw new Error(`SID harus positif, diterima ${sidCm}`);

  const yKvp = calculateDapY(kvp, c1, c2, c3);
  const iakSddMgy = (yKvp * mas) / 1000;
  const iakSidMgy = (iakSddMgy * DAP_REFERENCE_DISTANCE_CM ** 2) / sidCm ** 2;
  const dapMgyCm2 = iakSidMgy * fieldAreaCm2;

  return { kvp, mas, sidCm, fieldAreaCm2, c1, c2, c3, yKvp, iakSddMgy, iakSidMgy, dapMgyCm2 };
}
