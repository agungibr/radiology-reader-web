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
  /** Nilai rescale mentah (slope/intercept terapan) untuk windowing ulang. */
  raw: Float64Array;
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

function validDa(raw: string): boolean {
  if (!/^\d{8}$/.test(raw)) return false;
  const year = Number(raw.slice(0, 4));
  const month = Number(raw.slice(4, 6));
  const day = Number(raw.slice(6, 8));
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return year > 0 && month >= 1 && month <= 12 && day >= 1 && day <= days[month - 1];
}

function ageFromAs(raw: string): string {
  const match = /^(\d{3})([DWMY])$/.exec(raw);
  if (!match) return '';
  const unitsPerYear: Record<string, number> = { D: 365, W: 52, M: 12, Y: 1 };
  return String(Math.floor(Number(match[1]) / unitsPerYear[match[2]]));
}

function calcAge(birthRaw: string, studyRaw: string): string {
  const b = birthRaw.trim();
  const s = studyRaw.trim();
  if (!validDa(b) || !validDa(s)) return '';
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
  const age = calcAge(birthRaw, studyRaw) || ageFromAs(safeString(ds, 'x00101010'));

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
  const transferSyntax = safeString(ds, 'x00020010');
  if (
    !['1.2.840.10008.1.2', '1.2.840.10008.1.2.1', '1.2.840.10008.1.2.2'].includes(transferSyntax)
  ) {
    throw new Error('Transfer Syntax tidak didukung');
  }
  const littleEndian = transferSyntax !== '1.2.840.10008.1.2.2';
  const bitsAllocated = uint16(ds, 'x00280100');
  const bitsStored = uint16(ds, 'x00280101');
  const highBit = uint16(ds, 'x00280102');
  const representation = uint16(ds, 'x00280103');
  if (
    ![8, 16].includes(bitsAllocated) ||
    bitsStored < 1 ||
    bitsStored > bitsAllocated ||
    highBit < bitsStored - 1 ||
    highBit >= bitsAllocated ||
    ![0, 1].includes(representation)
  ) {
    throw new Error('Bits piksel tidak didukung');
  }
  const photometric = safeString(ds, 'x00280004').toUpperCase();
  if (!['MONOCHROME1', 'MONOCHROME2'].includes(photometric) || uint16(ds, 'x00280002') !== 1) {
    throw new Error('Photometric Interpretation tidak didukung');
  }
  const invert = photometric === 'MONOCHROME1';

  const element = (ds.elements as Record<string, { dataOffset: number; length: number }>)[
    'x7fe00010'
  ];
  if (!element) throw new Error('Pixel Data (7FE0,0010) tidak ditemukan');
  if (width <= 0 || height <= 0) throw new Error('Dimensi citra tidak valid');

  const count = width * height;
  const bytesPerPixel = bitsAllocated / 8;
  const byteLength = count * bytesPerPixel;
  if (element.length < byteLength || element.dataOffset + byteLength > byteArray.byteLength) {
    throw new Error('Data piksel tidak lengkap');
  }
  const view = new DataView(
    byteArray.buffer,
    byteArray.byteOffset + element.dataOffset,
    byteLength
  );
  const shift = highBit + 1 - bitsStored;
  const range = 2 ** bitsStored;
  const mask = range - 1;
  const slope = firstFloat(ds, 'x00281053') ?? 1;
  const intercept = firstFloat(ds, 'x00281052') ?? 0;
  if (!Number.isFinite(slope) || !Number.isFinite(intercept) || slope === 0) {
    throw new Error('Rescale piksel tidak valid');
  }
  const raw = new Float64Array(count);
  for (let i = 0; i < count; i++) {
    const word = bitsAllocated === 8 ? view.getUint8(i) : view.getUint16(i * 2, littleEndian);
    let value = (word >>> shift) & mask;
    if (representation === 1 && value >= range / 2) value -= range;
    raw[i] = value * slope + intercept;
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
    if (!(hi - lo > 1e-9)) return { gray: new Uint8Array(count), width, height, invert, raw };
  }

  const gray = new Uint8Array(count);
  const span = hi - lo;
  for (let i = 0; i < count; i++) {
    const clamped = Math.min(hi, Math.max(lo, raw[i] as number));
    gray[i] = Math.round(((clamped - lo) / span) * 255);
  }
  return { gray, width, height, invert, raw };
}

/**
 * Windowing ulang linear: petakan nilai mentah ke 0–255 via
 * lo = center − width/2, hi = center + width/2 (clamp + bulatkan).
 * Width nol/negatif dijaga agar tak melempar (mendekati fungsi step).
 */
export function applyWindow(raw: Float64Array, center: number, width: number): Uint8Array {
  const w = width > 0 ? width : 1e-6;
  const lo = center - w / 2;
  const hi = center + w / 2;
  const span = hi - lo;
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    const v = Math.min(hi, Math.max(lo, raw[i] as number));
    out[i] = Math.round(((v - lo) / span) * 255);
  }
  return out;
}

/** Jendela default dari min-max data (render awal identik min-max). */
export function defaultWindow(raw: Float64Array): { center: number; width: number } {
  if (raw.length === 0) return { center: 0, width: 1 };
  let lo = Infinity;
  let hi = -Infinity;
  for (let i = 0; i < raw.length; i++) {
    const v = raw[i] as number;
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  if (!(hi - lo > 1e-9)) return { center: lo, width: 1 };
  return { center: (lo + hi) / 2, width: hi - lo };
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
