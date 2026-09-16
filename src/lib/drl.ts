/**
 * DRL Assessment — port dari desktop Python `core/drl_engine.py`.
 * Konfigurasi dibaca dari `drl-data.json` (salinan verbatim `drl_config.json` desktop).
 * Perilaku harus identik — lihat `tests/drl.test.ts` (golden dari Python).
 */

import drlConfig from './drl-data.json';

export type AgeGroup = 'infant' | 'children' | 'adult';
export type DrlMetric = 'dap' | 'inak_esak' | '';
export type DrlStatus = 'below' | 'equal' | 'above' | null;

export interface DrlAssessInput {
  inak: number | null;
  esak: number | null;
  dap: number | null;
  studyDescription: string;
  bodyPartExamined: string;
  viewPosition: string;
  patientAge: string;
}

export interface DrlResult {
  examination: string;
  view: string;
  ageGroup: AgeGroup | '';
  ageGroupLabel: string;
  metric: DrlMetric;
  drlDap: number | null;
  drlInak: number | null;
  drlEsak: number | null;
  resultDap: number | null;
  resultInak: number | null;
  resultEsak: number | null;
  dapStatus: DrlStatus;
  inakStatus: DrlStatus;
  esakStatus: DrlStatus;
  matched: boolean;
  message: string;
}

interface DrlEntry {
  metric: string;
  dap?: number;
  inak?: number;
  esak?: number;
}

const AGE_GROUP_LABELS: Record<AgeGroup, string> = {
  infant: 'Bayi (0–4 th)',
  children: 'Anak-anak (5–14 th)',
  adult: 'Dewasa (≥15 th)'
};

const STATUS_LABELS: Record<string, string> = {
  below: 'Below DRL',
  equal: 'Equal to DRL',
  above: 'Above DRL'
};

const keywords = drlConfig.examination_keywords as Record<string, string[]>;
const viewAliases = drlConfig.view_aliases as Record<string, string>;
const drlTable = drlConfig.drl_table as Record<string, Record<string, Record<string, DrlEntry>>>;

/**
 * Cocokkan study description / body part ke jenis pemeriksaan kanonis.
 * Prioritas: study dulu, lalu body part. Keyword terpanjang diuji dulu
 * agar "thoracolumbar" tidak salah match "lumbar".
 */
export function matchExamination(
  studyDescription: string,
  bodyPartExamined: string
): string | null {
  const candidates = Object.entries(keywords).flatMap(([exam, kws]) =>
    kws.map((kw) => ({ exam, kw }))
  );
  candidates.sort((a, b) => b.kw.length - a.kw.length);

  for (const source of [studyDescription, bodyPartExamined]) {
    if (!source) continue;
    const lower = source.toLowerCase();
    for (const { exam, kw } of candidates) {
      if (lower.includes(kw)) return exam;
    }
  }
  return null;
}

/**
 * Normalisasi ViewPosition DICOM ke nama kanonis.
 * Sinus Paranasal selalu Waters; Panoramic kosong → Standard.
 */
export function normalizeView(viewPosition: string, examName: string): string {
  if (examName === 'Sinus Paranasal') return 'Waters';
  if (examName === 'Panoramic' && !viewPosition) return 'Standard';
  if (!viewPosition) return '';
  return viewAliases[viewPosition.trim().toLowerCase()] ?? viewPosition.trim();
}

/** Kelompok usia dari string umur (tahun). Tak diketahui → adult. */
export function determineAgeGroup(ageStr: string): AgeGroup {
  if (!ageStr) return 'adult';
  const digits = String(ageStr).replace(/\D/g, '');
  if (!digits) return 'adult';
  const age = parseInt(digits, 10);
  if (age <= 4) return 'infant';
  if (age <= 14) return 'children';
  return 'adult';
}

/**
 * Ambil entri DRL: exact exam/view/age → fallback adult → fallback view pertama.
 */
export function getDrlEntry(examName: string, view: string, ageGroup: AgeGroup): DrlEntry | null {
  const examTable = drlTable[examName];
  if (!examTable) return null;

  let viewTable = view ? examTable[view] : undefined;
  if (!viewTable && view) viewTable = Object.values(examTable)[0];
  if (!viewTable) return null;

  return viewTable[ageGroup] ?? (ageGroup !== 'adult' ? viewTable['adult'] : undefined) ?? null;
}

function compare(measured: number | null, reference: number): DrlStatus {
  if (measured === null || measured === undefined) return null;
  const diff = measured - reference;
  const tol = reference * 1e-4;
  if (Math.abs(diff) <= tol) return 'equal';
  return diff > 0 ? 'above' : 'below';
}

/** Penilaian DRL penuh. String tidak sensitif kapital. */
export function assessDrl(input: DrlAssessInput): DrlResult {
  const { inak, esak, dap, studyDescription, bodyPartExamined, viewPosition, patientAge } = input;

  const result: DrlResult = {
    examination: '',
    view: '',
    ageGroup: '',
    ageGroupLabel: '',
    metric: '',
    drlDap: null,
    drlInak: null,
    drlEsak: null,
    resultDap: dap,
    resultInak: inak,
    resultEsak: esak,
    dapStatus: null,
    inakStatus: null,
    esakStatus: null,
    matched: false,
    message: ''
  };

  const exam = matchExamination(studyDescription, bodyPartExamined);
  if (!exam) {
    result.message =
      'Jenis pemeriksaan tidak dikenali. Periksa Study Description atau Body Part Examined pada DICOM.';
    return result;
  }
  result.examination = exam;

  const view = normalizeView(viewPosition, exam);
  result.view = view;

  const ageGroup = determineAgeGroup(patientAge);
  result.ageGroup = ageGroup;
  result.ageGroupLabel = AGE_GROUP_LABELS[ageGroup];

  const entry = getDrlEntry(exam, view, ageGroup);
  if (!entry) {
    result.message =
      `Tidak ada data DRL untuk: ${exam} ${view} (${result.ageGroupLabel}). ` +
      'Kombinasi pemeriksaan/view/usia ini belum terdaftar.';
    return result;
  }

  result.matched = true;
  result.metric = entry.metric as DrlMetric;

  if (entry.metric === 'dap' && entry.dap !== undefined) {
    result.drlDap = entry.dap;
    result.dapStatus = compare(dap, entry.dap);
  } else if (entry.metric === 'inak_esak') {
    if (entry.inak !== undefined) {
      result.drlInak = entry.inak;
      result.inakStatus = compare(inak, entry.inak);
    }
    if (entry.esak !== undefined) {
      result.drlEsak = entry.esak;
      result.esakStatus = compare(esak, entry.esak);
    }
  }

  return result;
}

/** Label manusiawi untuk kode status. */
export function statusLabel(status: DrlStatus | string | null | undefined): string {
  return STATUS_LABELS[status ?? ''] ?? '—';
}
