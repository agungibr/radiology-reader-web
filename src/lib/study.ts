/**
 * Pengelompokan Study → Series → slice dari metadata file.
 * Fungsi murni (tanpa UI) — teruji di `tests/study.test.ts`.
 * File tanpa UID menjadi pseudo-study sendiri agar alur X-ray
 * citra-tunggal tetap seperti sekarang.
 */

export interface SliceInfo {
  name: string;
  studyUid: string;
  seriesUid: string;
  studyDescription: string;
  seriesDescription: string;
  bodyPartExamined: string;
  seriesNumber: number | null;
  instanceNumber: number | null;
  /** Indeks file di sesi impor; diabaikan saat grouping, dipakai UI untuk memilih file. */
  fileIndex?: number;
}

export interface StudySeries {
  key: string;
  label: string;
  description: string;
  slices: SliceInfo[];
}

export interface Study {
  key: string;
  label: string;
  description: string;
  series: StudySeries[];
  totalImages: number;
}

function pad(n: number): string {
  return String(n).padStart(3, '0');
}

/** Lebar default panel Studies (px) — sempit agar viewer lega. */
export const STUDIES_WIDTH_DEFAULT = 232;
/** Batas seret panel Studies (px). */
export const STUDIES_WIDTH_MIN = 160;
export const STUDIES_WIDTH_MAX = 400;
const STUDIES_WIDTH_KEY = 'rr-studies-w';

/** Jepit lebar panel ke rentang; non-angka kembali ke default. */
export function clampStudiesWidth(width: number): number {
  if (!Number.isFinite(width)) return STUDIES_WIDTH_DEFAULT;
  return Math.min(STUDIES_WIDTH_MAX, Math.max(STUDIES_WIDTH_MIN, width));
}

/** Baca lebar tersimpan (default bila storage tak ada/rusak — aman SSR). */
export function loadStudiesWidth(): number {
  try {
    const raw = localStorage.getItem(STUDIES_WIDTH_KEY);
    if (raw === null) return STUDIES_WIDTH_DEFAULT;
    return clampStudiesWidth(Number(raw));
  } catch {
    return STUDIES_WIDTH_DEFAULT;
  }
}

/** Simpan lebar panel; gagal diam-diam bila storage tak tersedia. */
export function saveStudiesWidth(width: number): void {
  try {
    localStorage.setItem(STUDIES_WIDTH_KEY, String(clampStudiesWidth(width)));
  } catch {
    // abaikan (mode privat/SSR)
  }
}

/** Jepit indeks slice ke rentang stack [0, total). */
export function clampSliceIndex(index: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(total - 1, Math.max(0, index));
}

/**
 * Cache LRU kecil untuk hasil decode slice (indeks file → data).
 * Indeks file bergeser saat file dihapus, jadi cache dibersihkan
 * setiap files berubah (lihat pemakaian di halaman Viewer).
 */
export class SliceCache<T> {
  private entries = new Map<number, T>();

  constructor(private maxSize = 5) {}

  get size(): number {
    return this.entries.size;
  }

  get(key: number): T | undefined {
    const value = this.entries.get(key);
    if (value !== undefined) {
      this.entries.delete(key);
      this.entries.set(key, value);
    }
    return value;
  }

  set(key: number, value: T): void {
    this.entries.delete(key);
    this.entries.set(key, value);
    while (this.entries.size > this.maxSize) {
      const oldest = this.entries.keys().next().value;
      if (oldest === undefined) break;
      this.entries.delete(oldest);
    }
  }

  clear(): void {
    this.entries.clear();
  }
}

function compareSlices(a: SliceInfo, b: SliceInfo): number {
  const ai = a.instanceNumber;
  const bi = b.instanceNumber;
  if (ai !== null && bi !== null && ai !== bi) return ai - bi;
  if (ai !== null && bi === null) return -1;
  if (ai === null && bi !== null) return 1;
  return a.name.localeCompare(b.name, undefined, { numeric: true });
}

/**
 * Kelompokkan file menjadi Study → Series → slice terurut.
 * Stabil dan deterministik untuk input yang sama.
 */
export function groupIntoStudies(files: SliceInfo[]): Study[] {
  const studyOrder = new Map<string, number>();
  const byStudy = new Map<string, SliceInfo[]>();

  files.forEach((f, i) => {
    const key = f.studyUid !== '' ? `uid:${f.studyUid}` : `file:${i}`;
    if (!byStudy.has(key)) {
      studyOrder.set(key, byStudy.size);
      byStudy.set(key, []);
    }
    byStudy.get(key)?.push(f);
  });

  return [...byStudy.entries()].map(([studyKey, members], si) => {
    const seriesOrder = new Map<string, number>();
    const bySeries = new Map<string, SliceInfo[]>();
    for (const f of members) {
      const desc = f.seriesDescription || f.bodyPartExamined || 'Series';
      const key = f.seriesUid !== '' ? `uid:${f.seriesUid}` : `desc:${studyKey}:${desc}`;
      if (!bySeries.has(key)) {
        seriesOrder.set(key, bySeries.size);
        bySeries.set(key, []);
      }
      bySeries.get(key)?.push(f);
    }

    const groups = [...bySeries.entries()].map(([key, slices]) => {
      const sorted = [...slices].sort(compareSlices);
      const first = sorted[0] as SliceInfo;
      return { key, desc: first.seriesDescription || first.bodyPartExamined || 'Series', sorted };
    });
    groups.sort((a, b) => {
      const an = (a.sorted[0]?.seriesNumber ?? null) as number | null;
      const bn = (b.sorted[0]?.seriesNumber ?? null) as number | null;
      if (an !== null && bn !== null && an !== bn) return an - bn;
      if (an !== null && bn === null) return -1;
      if (an === null && bn !== null) return 1;
      return (seriesOrder.get(a.key) ?? 0) - (seriesOrder.get(b.key) ?? 0);
    });
    // Label diberi SETELAH urut agar "Series 001" selalu yang pertama tampil.
    const series: StudySeries[] = groups.map((g, ni) => ({
      key: g.key,
      label: `Series ${pad(ni + 1)}`,
      description: g.desc,
      slices: g.sorted
    }));

    const head = members[0] as SliceInfo;
    return {
      key: studyKey,
      label: `Study ${pad(si + 1)}`,
      description: head.studyDescription || head.bodyPartExamined || head.name,
      series,
      totalImages: members.length
    };
  });
}
