/**
 * Parsing DICOM di browser via `dicom-parser`.
 * Fungsi murni atas ArrayBuffer — teruji di `tests/dicom.test.ts`.
 * Catatan: kolom Tags menampilkan Tag hex + VR + nilai (dicom-parser
 * tidak membawa kamus deskripsi seperti pydicom di desktop).
 */
import * as dicomParser from 'dicom-parser';

export interface DicomMetadata {
  patientId: string;
  patientName: string;
  birthDate: string;
  sex: string;
  age: string;
  studyDate: string;
  studyDescription: string;
  seriesDescription: string;
  modality: string;
  institution: string;
  bodyPartExamined: string;
  viewPosition: string;
  weightKg: number | null;
  kvp: number | null;
  ma: number | null;
  exposureTimeS: number | null;
  mas: number | null;
  dapMgyCm2: number | null;
  rows: number;
  columns: number;
}

export interface PixelData {
  gray: Uint8Array;
  width: number;
  height: number;
  /** true untuk MONOCHROME1 (perlu invert). */
  invert: boolean;
}

export interface DicomTag {
  tag: string;
  vr: string;
  value: string;
}

/** true jika buffer punya magic "DICM" setelah preamble 128 byte. */
export function isDicomBuffer(buffer: ArrayBuffer): boolean {
  if (buffer.byteLength < 132) return false;
  const b = new Uint8Array(buffer);
  return b[128] === 0x44 && b[129] === 0x49 && b[130] === 0x43 && b[131] === 0x4d;
}

function safeString(ds: dicomParser.DataSet, tag: string): string {
  try {
    return (ds.string(tag) ?? '').trim();
  } catch {
    return '';
  }
}

function firstFloat(ds: dicomParser.DataSet, tag: string): number | null {
  try {
    const v = ds.floatString(tag);
    return v === undefined || v === null || Number.isNaN(v) ? null : v;
  } catch {
    return null;
  }
}

function uint16(ds: dicomParser.DataSet, tag: string): number {
  try {
    return ds.uint16(tag) ?? 0;
  } catch {
    return 0;
  }
}

function formatDa(raw: string): string {
  const d = raw.trim();
  return /^\d{8}$/.test(d) ? `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}` : d;
}

function calcAge(birthRaw: string, studyRaw: string): string {
  if (!/^\d{8}$/.test(birthRaw.trim()) || !/^\d{8}$/.test(studyRaw.trim())) return '';
  const b = birthRaw.trim();
  const s = studyRaw.trim();
  const age =
    Number(s.slice(0, 4)) - Number(b.slice(0, 4)) - (s.slice(4, 8) < b.slice(4, 8) ? 1 : 0);
  if (age < 0 || !Number.isFinite(age)) return '';
  return String(age);
}

function formatName(raw: string): string {
  return raw.replace(/\^/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Ekstrak metadata pasien/studi/eksposur dari buffer DICOM. */
export function parseDicom(buffer: ArrayBuffer): DicomMetadata {
  const ds = dicomParser.parseDicom(new Uint8Array(buffer));

  const birthRaw = safeString(ds, 'x00100030');
  const studyRaw = safeString(ds, 'x00080020');
  const ageDigits = safeString(ds, 'x00101010').replace(/\D/g, '');
  const age = calcAge(birthRaw, studyRaw) || (ageDigits ? String(parseInt(ageDigits, 10)) : '');

  const expMs = firstFloat(ds, 'x00181150');
  const ma = firstFloat(ds, 'x00181151');
  const masDirect = firstFloat(ds, 'x00181152');
  let timeS = expMs !== null ? expMs / 1000 : null;
  if (timeS === null && masDirect !== null && ma !== null && ma > 0) {
    timeS = masDirect / ma; // turunkan waktu dari mAs ÷ mA (seperti desktop)
  }

  // DAP (0018,115E): DICOM menyimpan dGy·cm² → ×100 ke mGy·cm²
  let dap: number | null = null;
  try {
    const raw = ds.floatString('x0018115e');
    if (raw !== undefined && raw !== null && !Number.isNaN(raw)) dap = raw * 100;
  } catch {
    dap = null;
  }

  const weight = firstFloat(ds, 'x00101030');

  return {
    patientId: safeString(ds, 'x00100020'),
    patientName: formatName(safeString(ds, 'x00100010')),
    birthDate: formatDa(birthRaw),
    sex: safeString(ds, 'x00100040'),
    age,
    studyDate: formatDa(studyRaw),
    studyDescription: safeString(ds, 'x00081030'),
    seriesDescription: safeString(ds, 'x0008103e'),
    modality: safeString(ds, 'x00080060'),
    institution: safeString(ds, 'x00080080'),
    bodyPartExamined: safeString(ds, 'x00180015'),
    viewPosition: safeString(ds, 'x00185101'),
    weightKg: weight,
    kvp: firstFloat(ds, 'x00180060'),
    ma,
    exposureTimeS: timeS,
    mas: masDirect,
    dapMgyCm2: dap,
    rows: uint16(ds, 'x00280010'),
    columns: uint16(ds, 'x00280011')
  };
}

/**
 * Ekstrak piksel grayscale + terapkan windowing (jika ada) atau normalisasi min-max.
 * Mendukung 8/16-bit, single-frame. Multi-frame memakai frame pertama (seperti desktop).
 */
export function extractPixels(buffer: ArrayBuffer): PixelData {
  const byteArray = new Uint8Array(buffer);
  const ds = dicomParser.parseDicom(byteArray);

  const width = uint16(ds, 'x00280011');
  const height = uint16(ds, 'x00280010');
  const bitsAllocated = uint16(ds, 'x00280100') || 8;
  const photometric = safeString(ds, 'x00280004').toUpperCase();
  const invert = photometric === 'MONOCHROME1';

  const element = (ds.elements as Record<string, { dataOffset: number; length: number }>)[
    'x7fe00010'
  ];
  if (!element) throw new Error('Pixel Data (7FE0,0010) tidak ditemukan');
  if (width <= 0 || height <= 0) throw new Error('Dimensi citra tidak valid');

  const count = width * height;
  const raw = new Float64Array(count);
  if (bitsAllocated <= 8) {
    for (let i = 0; i < count; i++) raw[i] = byteArray[element.dataOffset + i] ?? 0;
  } else {
    const view = new DataView(byteArray.buffer, byteArray.byteOffset + element.dataOffset);
    for (let i = 0; i < count; i++) raw[i] = view.getUint16(i * 2, true);
  }

  // Windowing jika tag tersedia dan valid
  const wc = firstFloat(ds, 'x00281050');
  const ww = firstFloat(ds, 'x00281051');
  let lo = Infinity;
  let hi = -Infinity;
  if (wc !== null && ww !== null && ww > 1e-6) {
    lo = wc - ww / 2;
    hi = wc + ww / 2;
  } else {
    for (let i = 0; i < count; i++) {
      const v = raw[i] as number;
      if (v < lo) lo = v;
      if (v > hi) hi = v;
    }
    if (!(hi - lo > 1e-9)) return { gray: new Uint8Array(count), width, height, invert };
  }

  const gray = new Uint8Array(count);
  const span = hi - lo;
  for (let i = 0; i < count; i++) {
    const clamped = Math.min(hi, Math.max(lo, raw[i] as number));
    gray[i] = Math.round(((clamped - lo) / span) * 255);
  }
  return { gray, width, height, invert };
}

/** Grayscale → RGBA untuk `putImageData`. `invert` untuk MONOCHROME1. */
export function renderGrayscale(
  gray: Uint8Array,
  width: number,
  height: number,
  invert: boolean
): Uint8ClampedArray {
  const count = Math.min(gray.length, width * height);
  const rgba = new Uint8ClampedArray(count * 4);
  for (let i = 0; i < count; i++) {
    const v = invert ? 255 - (gray[i] as number) : (gray[i] as number);
    rgba[i * 4] = v;
    rgba[i * 4 + 1] = v;
    rgba[i * 4 + 2] = v;
    rgba[i * 4 + 3] = 255;
  }
  return rgba;
}

/** Daftar semua elemen: tag hex + VR + nilai (dipotong 300 char). */
export function listTags(buffer: ArrayBuffer): DicomTag[] {
  const ds = dicomParser.parseDicom(new Uint8Array(buffer));
  const out: DicomTag[] = [];
  for (const tag of Object.keys(ds.elements)) {
    const hex = tag.substring(1).toUpperCase();
    const element = (ds.elements as Record<string, { vr?: string; length: number }>)[tag];
    let value: string;
    if (hex === '7FE00010') {
      value = `(data ${element?.length ?? 0} bytes)`;
    } else {
      try {
        value = String(ds.string(tag) ?? '');
      } catch {
        value = '(tidak dapat dibaca)';
      }
      if (value.length > 300) value = `${value.slice(0, 297)}...`;
    }
    out.push({ tag: hex, vr: element?.vr ?? '', value });
  }
  return out;
}
