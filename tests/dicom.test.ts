import { describe, expect, it } from 'vitest';
import { extractPixels, isDicomBuffer, listTags, parseDicom, renderGrayscale } from '$lib/dicom';

// --- Synthetic Explicit-VR Little-Endian DICOM builder (2x2, 8-bit) ---

function elem(
  group: number,
  element: number,
  vr: string,
  value: Uint8Array | number[] | string | number
): Uint8Array {
  const bytes: number[] = [group & 0xff, group >> 8, element & 0xff, element >> 8];
  bytes.push(vr.charCodeAt(0), vr.charCodeAt(1));
  let val: Uint8Array;
  if (typeof value === 'string') {
    val = new TextEncoder().encode(value);
    if (val.length % 2 === 1) val = new Uint8Array([...val, vr === 'UI' ? 0x00 : 0x20]);
  } else if (typeof value === 'number') {
    val = new Uint8Array([value & 0xff, (value >> 8) & 0xff]);
  } else {
    val = value instanceof Uint8Array ? value : new Uint8Array(value);
  }
  const longVr = ['OB', 'OW', 'OF', 'SQ', 'UC', 'UR', 'UT', 'UN'].includes(vr);
  if (longVr) {
    bytes.push(0, 0, val.length & 0xff, (val.length >> 8) & 0xff, 0, 0);
  } else {
    bytes.push(val.length & 0xff, (val.length >> 8) & 0xff);
  }
  return new Uint8Array([...bytes, ...val]);
}

function buildDicom(extra: Uint8Array[] = []): ArrayBuffer {
  const preamble = new Uint8Array(128);
  const prefix = new TextEncoder().encode('DICM');
  const meta = [
    elem(0x0002, 0x0001, 'OB', [0, 1]),
    elem(0x0002, 0x0002, 'UI', '1.2.840.10008.5.1.4.1.1.2'),
    elem(0x0002, 0x0003, 'UI', '1.2.3.4'),
    elem(0x0002, 0x0010, 'UI', '1.2.840.10008.1.2.1'),
    elem(0x0010, 0x0010, 'PN', 'Budi^Test'),
    elem(0x0010, 0x0020, 'LO', 'P001'),
    elem(0x0010, 0x0030, 'DA', '19900101'),
    elem(0x0010, 0x0040, 'CS', 'M'),
    elem(0x0008, 0x0020, 'DA', '20240101'),
    elem(0x0008, 0x0060, 'CS', 'CR'),
    elem(0x0008, 0x1030, 'LO', 'Chest PA'),
    elem(0x0018, 0x0015, 'CS', 'CHEST'),
    elem(0x0018, 0x5101, 'CS', 'PA'),
    elem(0x0010, 0x1030, 'DS', '70'),
    elem(0x0018, 0x0060, 'DS', '70'),
    elem(0x0018, 0x1151, 'DS', '200'),
    elem(0x0018, 0x1150, 'DS', '50'),
    elem(0x0028, 0x0002, 'US', 1),
    elem(0x0028, 0x0004, 'CS', 'MONOCHROME2'),
    elem(0x0028, 0x0010, 'US', 2),
    elem(0x0028, 0x0011, 'US', 2),
    elem(0x0028, 0x0100, 'US', 8),
    elem(0x0028, 0x0101, 'US', 8),
    elem(0x0028, 0x0102, 'US', 7),
    elem(0x0028, 0x0103, 'US', 0),
    elem(0x7fe0, 0x0010, 'OB', [0, 85, 170, 255]),
    ...extra
  ];
  const total = preamble.length + prefix.length + meta.reduce((s, m) => s + m.length, 0);
  const out = new Uint8Array(total);
  let o = 0;
  for (const part of [preamble, prefix, ...meta]) {
    out.set(part, o);
    o += part.length;
  }
  return out.buffer as ArrayBuffer;
}

describe('isDicomBuffer', () => {
  it('mengenali magic DICM setelah preamble 128 byte', () => {
    expect(isDicomBuffer(buildDicom())).toBe(true);
    expect(isDicomBuffer(new Uint8Array([1, 2, 3]).buffer as ArrayBuffer)).toBe(false);
  });
});

describe('parseDicom', () => {
  it('mengekstrak metadata pasien, studi, dan eksposur', () => {
    const meta = parseDicom(buildDicom());

    expect(meta.patientId).toBe('P001');
    expect(meta.patientName).toBe('Budi Test');
    expect(meta.sex).toBe('M');
    expect(meta.age).toBe('34'); // 1990→2024
    expect(meta.studyDate).toBe('2024-01-01');
    expect(meta.studyDescription).toBe('Chest PA');
    expect(meta.modality).toBe('CR');
    expect(meta.bodyPartExamined).toBe('CHEST');
    expect(meta.viewPosition).toBe('PA');
    expect(meta.weightKg).toBeCloseTo(70, 9);
    expect(meta.kvp).toBeCloseTo(70, 9);
    expect(meta.ma).toBeCloseTo(200, 9);
    expect(meta.exposureTimeS).toBeCloseTo(0.05, 9);
    expect(meta.rows).toBe(2);
    expect(meta.columns).toBe(2);
  });

  it('fallback ke tag PatientAge saat tanggal lahir absen', () => {
    // Bangun ulang tanpa birth date, dengan PatientAge 045Y
    const preamble = new Uint8Array(128);
    const prefix = new TextEncoder().encode('DICM');
    const parts = [
      preamble,
      prefix,
      elem(0x0002, 0x0001, 'OB', [0, 1]),
      elem(0x0002, 0x0002, 'UI', '1.2.840.10008.5.1.4.1.1.2'),
      elem(0x0002, 0x0003, 'UI', '1.2.3.4'),
      elem(0x0002, 0x0010, 'UI', '1.2.840.10008.1.2.1'),
      elem(0x0010, 0x0020, 'LO', 'P002'),
      elem(0x0010, 0x1010, 'AS', '045Y')
    ];
    const total = parts.reduce((s, m) => s + m.length, 0);
    const out = new Uint8Array(total);
    let o = 0;
    for (const p of parts) {
      out.set(p, o);
      o += p.length;
    }
    const meta = parseDicom(out.buffer as ArrayBuffer);
    expect(meta.age).toBe('45');
  });
});

describe('extractPixels', () => {
  it('mengekstrak piksel 8-bit + dimensi + photometric', () => {
    const px = extractPixels(buildDicom());

    expect(px.width).toBe(2);
    expect(px.height).toBe(2);
    expect(px.invert).toBe(false);
    expect(Array.from(px.gray)).toEqual([0, 85, 170, 255]);
  });
});

describe('renderGrayscale', () => {
  it('menormalisasi piksel 8-bit ke RGBA', () => {
    const rgba = renderGrayscale(new Uint8Array([0, 85, 170, 255]), 2, 2, false);

    expect(rgba.length).toBe(16);
    expect(Array.from(rgba.slice(0, 4))).toEqual([0, 0, 0, 255]);
    expect(Array.from(rgba.slice(12, 16))).toEqual([255, 255, 255, 255]);
  });

  it('membalik MONOCHROME1', () => {
    const rgba = renderGrayscale(new Uint8Array([0, 255]), 2, 1, true);
    expect(Array.from(rgba.slice(0, 4))).toEqual([255, 255, 255, 255]);
    expect(Array.from(rgba.slice(4, 8))).toEqual([0, 0, 0, 255]);
  });
});

describe('listTags', () => {
  it('mendaftar semua elemen sebagai tag hex + VR + nilai', () => {
    const tags = listTags(buildDicom());
    const byTag = new Map(tags.map((t) => [t.tag, t]));

    expect(byTag.get('00100010')?.value).toBe('Budi^Test');
    expect(byTag.get('00100020')?.value).toBe('P001');
    expect(byTag.get('7FE00010')?.vr).toBe('OB');
    expect(tags.length).toBeGreaterThan(15);
  });
});
