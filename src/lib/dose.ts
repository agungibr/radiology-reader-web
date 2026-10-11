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
  ma?: number | null;
  /** Waktu eksposur dalam detik. */
  timeS?: number | null;
  /**
   * mAs langsung (mis. tag DICOM 0018,1152) — dipakai bila ada, jika tidak
   * dihitung dari mA × waktu. INAK hanya butuh mAs (`y × mAs/1000`).
   */
  masOverride?: number | null;
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
    masOverride = null,
    bsf = DEFAULT_BSF,
    coeffA = DEFAULT_COEFF_A,
    coeffB = DEFAULT_COEFF_B
  } = input;

  const mas = masOverride ?? (ma ?? 0) * (timeS ?? 0);
  const yMgy = calculateTubeOutputY(kvp, coeffA, coeffB);
  const inakMgy = yMgy * (mas / 1000);
  const esakMgy = inakMgy * bsf;

  return { kvp, ma: ma ?? 0, timeS: timeS ?? 0, mas, yMgy, inakMgy, esakMgy, bsf, coeffA, coeffB };
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

// ---------------------------------------------------------------------------
// Estimasi dosis efektif sederhana (parity desktop DoseCalculator)
// ---------------------------------------------------------------------------

/** Faktor dosis dasar per jenis pemeriksaan (mSv). */
export const DOSE_FACTORS: Record<string, number> = {
  CT_HEAD: 2.0,
  CT_CHEST: 7.0,
  CT_ABDOMEN: 10.0,
  CT_PELVIS: 8.0,
  XRAY_CHEST: 0.1,
  XRAY_SPINE: 1.5,
  XRAY_ABDOMEN: 0.7,
  MAMMOGRAPHY: 0.4,
  DEFAULT: 5.0
};

export interface DoseEstimateInput {
  age: number;
  gender: string;
  weightKg: number;
  examType?: string;
}

export interface DoseEstimate {
  estimatedDoseMSv: number;
  baseDose: number;
  ageFactor: number;
  weightFactor: number;
  genderFactor: number;
  examType: string;
}

function ageFactorFor(age: number): number {
  if (age < 10) return 0.3;
  if (age < 18) return 0.6;
  return 1.0;
}

function weightFactorFor(weightKg: number): number {
  if (weightKg < 20) return 0.3;
  if (weightKg < 40) return 0.5;
  if (weightKg < 60) return 0.8;
  if (weightKg < 80) return 1.0;
  if (weightKg < 100) return 1.2;
  return 1.5;
}

/**
 * Estimasi dosis efektif (mSv). Model sederhana untuk gambaran —
 * bukan pengganti kalibrasi klinis (sama seperti desktop).
 */
export function estimateEffectiveDose(input: DoseEstimateInput): DoseEstimate {
  const { age, gender, weightKg, examType = 'DEFAULT' } = input;
  const baseDose = DOSE_FACTORS[examType] ?? DOSE_FACTORS['DEFAULT']!;
  const ageFactor = ageFactorFor(age);
  const weightFactor = weightFactorFor(weightKg);
  const genderFactor = gender.toUpperCase() === 'F' ? 0.95 : 1.0;
  const estimated = baseDose * ageFactor * weightFactor * genderFactor;

  return {
    estimatedDoseMSv: Math.round(estimated * 100) / 100,
    baseDose,
    ageFactor,
    weightFactor,
    genderFactor,
    examType
  };
}

export interface DoseComparison {
  doseMSv: number;
  equivalentDaysOfBackground: number;
  equivalentChestXrays: number;
  airTravelHours: number;
}

/** Bandingkan dosis dengan radiasi alam (~2.4 mSv/tahun). */
export function getDoseComparison(doseMSv: number): DoseComparison {
  const annualBackground = 2.4;
  return {
    doseMSv,
    equivalentDaysOfBackground: Math.round((doseMSv / annualBackground) * 365 * 10) / 10,
    equivalentChestXrays: Math.round((doseMSv / 0.1) * 10) / 10,
    airTravelHours: Math.round((doseMSv / 0.005) * 60)
  };
}
