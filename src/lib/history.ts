/**
 * Helper history: verdict DRL terburuk, teks batas, dan baris export 16 kolom.
 * Port logika `main_window._on_calculate_inak_esak` desktop.
 */
import { statusLabel, type DrlResult } from './drl';

const PRIORITY: Record<string, number> = { above: 2, equal: 1, below: 0 };

/**
 * Status DRL terburuk: above > equal > below.
 * Untuk metrik DAP memakai status DAP; '' saat tidak cocok.
 */
export function worstDrlStatus(result: DrlResult): string {
  if (!result.matched) return '';
  if (result.metric === 'dap') return result.dapStatus ?? '';
  const statuses = [result.inakStatus, result.esakStatus].filter(
    (s): s is 'below' | 'equal' | 'above' => s !== null
  );
  if (statuses.length === 0) return '';
  return statuses.sort((a, b) => (PRIORITY[b] as number) - (PRIORITY[a] as number))[0] as string;
}

/** Teks batas DRL: "INAK≤0.2 mGy, ESAK≤0.2 mGy" atau "DAP≤120 mGy·cm²". */
export function buildDrlLimitText(result: DrlResult): string {
  if (!result.matched) return '';
  if (result.metric === 'dap') {
    return result.drlDap !== null ? `DAP≤${result.drlDap} mGy·cm²` : '';
  }
  const parts: string[] = [];
  if (result.drlInak !== null) parts.push(`INAK≤${result.drlInak} mGy`);
  if (result.drlEsak !== null) parts.push(`ESAK≤${result.drlEsak} mGy`);
  return parts.join(', ');
}

export interface HistoryEntry {
  no: number;
  patientId: string;
  patientName: string;
  gender: string;
  age: string;
  weightKg: number | null;
  examType: string;
  kvp: number;
  /** null bila kalkulasi memakai mAs langsung (tanpa mA/waktu). */
  ma: number | null;
  timeS: number | null;
  mas: number;
  inakMgy: number;
  esakMgy: number;
  dapMgyCm2: number | null;
  drlLimitText: string;
  drlStatus: string;
}

export type ExportRow = Record<string, string | number>;

/** Baris export 16 kolom Indonesia (xlsx + csv memakai pemetaan yang sama). */
export function toExportRow(e: HistoryEntry): ExportRow {
  return {
    No: e.no,
    'Patient ID': e.patientId,
    'Nama Pasien': e.patientName,
    Gender: e.gender,
    Umur: e.age,
    'BB (kg)': e.weightKg !== null ? e.weightKg.toFixed(1) : '',
    'Jenis Pemeriksaan': e.examType,
    kVp: e.kvp,
    mA: e.ma ?? '',
    s: e.timeS ?? '',
    mAs: e.mas,
    'INAK (mGy)': e.inakMgy,
    'ESAK (mGy)': e.esakMgy,
    'DAP (mGy·cm²)': e.dapMgyCm2 !== null ? e.dapMgyCm2.toFixed(4) : '',
    'DRL Batas': e.drlLimitText,
    'Hasil DRL': e.drlStatus ? statusLabel(e.drlStatus) : ''
  };
}
