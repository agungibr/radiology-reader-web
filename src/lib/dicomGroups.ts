/**
 * Pengelompokan tag DICOM untuk panel metadata workstation.
 * Fungsi murni — teruji di `tests/dicomGroups.test.ts`.
 */
import type { DicomTag } from './dicom';

export type DicomModule = 'Pasien' | 'Studi' | 'Citra' | 'Lainnya';

export interface NamedDicomTag extends DicomTag {
  /** Nama tampilan; tag tak dikenal memakai hex "XXXX,XXXX". */
  name: string;
}

export interface DicomTagGroup {
  name: DicomModule;
  tags: NamedDicomTag[];
}

/** Peta hex (8 char, tanpa koma) → [modul, nama tampilan]. */
const KNOWN: Record<string, [Exclude<DicomModule, 'Lainnya'>, string]> = {
  '00100010': ['Pasien', 'Patient Name'],
  '00100020': ['Pasien', 'Patient ID'],
  '00100030': ['Pasien', 'Birth Date'],
  '00100040': ['Pasien', 'Patient Sex'],
  '00101010': ['Pasien', 'Patient Age'],
  '00101030': ['Pasien', 'Patient Weight'],
  '00080020': ['Studi', 'Study Date'],
  '00080060': ['Studi', 'Modality'],
  '00080080': ['Studi', 'Institution'],
  '00081030': ['Studi', 'Study Description'],
  '0008103E': ['Studi', 'Series Description'],
  '00180015': ['Citra', 'Body Part Examined'],
  '00185101': ['Citra', 'View Position'],
  '00180060': ['Citra', 'KVP'],
  '00181150': ['Citra', 'Exposure Time'],
  '00181151': ['Citra', 'Tube Current'],
  '00181152': ['Citra', 'Exposure (mAs)'],
  '0018115E': ['Citra', 'DAP'],
  '00280002': ['Citra', 'Samples per Pixel'],
  '00280004': ['Citra', 'Photometric Interpretation'],
  '00280010': ['Citra', 'Rows'],
  '00280011': ['Citra', 'Columns'],
  '00281050': ['Citra', 'Window Center'],
  '00281051': ['Citra', 'Window Width']
};

const ORDER: DicomModule[] = ['Pasien', 'Studi', 'Citra', 'Lainnya'];

/** Kelompokkan tag datar menjadi modul berurutan; grup kosong dihilangkan. */
export function groupDicomTags(tags: DicomTag[]): DicomTagGroup[] {
  const buckets = new Map<DicomModule, NamedDicomTag[]>();
  for (const t of tags) {
    const known = KNOWN[t.tag];
    const module: DicomModule = known?.[0] ?? 'Lainnya';
    const name = known?.[1] ?? `${t.tag.slice(0, 4)},${t.tag.slice(4)}`;
    if (!buckets.has(module)) buckets.set(module, []);
    buckets.get(module)?.push({ ...t, name });
  }
  return ORDER.filter((m) => (buckets.get(m)?.length ?? 0) > 0).map((m) => ({
    name: m,
    tags: buckets.get(m) as NamedDicomTag[]
  }));
}
