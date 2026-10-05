/**
 * Nama tampilan, saring, dan pagination untuk tabel DICOM Tags.
 * Fungsi murni — teruji di `tests/dicomGroups.test.ts`.
 */
import type { DicomTag } from './dicom';

export interface NamedDicomTag extends DicomTag {
  /** Nama tampilan; tag tak dikenal memakai hex "XXXX,XXXX". */
  name: string;
}

/** Peta hex (8 char, tanpa koma) → nama tampilan kamus DICOM. */
const KNOWN: Record<string, string> = {
  '00080020': 'Study Date',
  '00080030': 'Study Time',
  '00080050': 'Accession Number',
  '00080060': 'Modality',
  '00080080': 'Institution',
  '00080090': 'Referring Physician',
  '00081030': 'Study Description',
  '0008103E': 'Series Description',
  '00100010': 'Patient Name',
  '00100020': 'Patient ID',
  '00100030': 'Birth Date',
  '00100040': 'Patient Sex',
  '00101010': 'Patient Age',
  '00101020': 'Patient Size',
  '00101030': 'Patient Weight',
  '00180015': 'Body Part Examined',
  '00180050': 'Slice Thickness',
  '00180060': 'KVP',
  '00181150': 'Exposure Time',
  '00181151': 'Tube Current',
  '00181152': 'Exposure (mAs)',
  '0018115E': 'DAP',
  '00185101': 'View Position',
  '0020000D': 'Study UID',
  '00200032': 'Image Position',
  '00200037': 'Image Orientation',
  '00201041': 'Slice Location',
  '00280002': 'Samples per Pixel',
  '00280004': 'Photometric Interpretation',
  '00280010': 'Rows',
  '00280011': 'Columns',
  '00280030': 'Pixel Spacing',
  '00280100': 'Bits Allocated',
  '00280101': 'Bits Stored',
  '00281050': 'Window Center',
  '00281051': 'Window Width'
};

/** Nama tampilan; tag tak dikenal memakai hex "XXXX,XXXX". */
export function nameDicomTag(t: DicomTag): NamedDicomTag {
  return { ...t, name: KNOWN[t.tag] ?? `${t.tag.slice(0, 4)},${t.tag.slice(4)}` };
}

/**
 * Saring tag berdasar kueri (nama tampilan, hex dengan/tanpa koma,
 * atau nilai). Tak sensitif kapital; kueri kosong mengembalikan semua.
 */
export function filterDicomTags(tags: DicomTag[], query: string): NamedDicomTag[] {
  const q = query.trim().toLowerCase();
  if (!q) return tags.map(nameDicomTag);
  const qHex = q.replace(',', '');
  return tags
    .map(nameDicomTag)
    .filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.tag.toLowerCase().includes(qHex) ||
        t.value.toLowerCase().includes(q)
    );
}

/**
 * Nomor halaman kompak ala desktop: [1, 2, 7, 8, 9, '…', 14, 15].
 * Semua nomor bila total ≤ 7.
 */
export function pageWindow(page: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const keep = new Set(
    [1, 2, page - 1, page, page + 1, total - 1, total].filter((n) => n >= 1 && n <= total)
  );
  const sorted = [...keep].sort((a, b) => a - b);
  const out: (number | '…')[] = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && (sorted[i] as number) - (sorted[i - 1] as number) > 1) out.push('…');
    out.push(sorted[i] as number);
  }
  return out;
}
