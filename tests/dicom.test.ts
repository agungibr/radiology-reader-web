import { describe, expect, it } from 'vitest';
import {
  applyWindow,
  defaultWindow,
  extractPixels,
  isDicomBuffer,
  isImportableImageName,
  listTags,
  parseDicom,
  renderGrayscale
} from '$lib/dicom';

type TestElement = [number, number, string, Uint8Array | number[] | string | number];

function elem(
  group: number,
  element: number,
  vr: string,
  value: Uint8Array | number[] | string | number,
  littleEndian = true,
  implicit = false
): Uint8Array {
  const word = (n: number) =>
    littleEndian ? [n & 0xff, (n >> 8) & 0xff] : [(n >> 8) & 0xff, n & 0xff];
  const lengthBytes = (n: number) =>
    littleEndian ? [...word(n), ...word(n >>> 16)] : [...word(n >>> 16), ...word(n)];
  const bytes: number[] = [...word(group), ...word(element)];
  if (!implicit) bytes.push(vr.charCodeAt(0), vr.charCodeAt(1));
  let val: Uint8Array;
  if (typeof value === 'string') {
    val = new TextEncoder().encode(value);
    if (val.length % 2 === 1) val = new Uint8Array([...val, vr === 'UI' ? 0x00 : 0x20]);
  } else if (typeof value === 'number') {
    val = new Uint8Array(word(value));
  } else {
    val = value instanceof Uint8Array ? value : new Uint8Array(value);
  }
  const longVr = ['OB', 'OW', 'OF', 'SQ', 'UC', 'UR', 'UT', 'UN'].includes(vr);
  if (implicit) {
    bytes.push(...lengthBytes(val.length));
  } else if (longVr) {
    bytes.push(0, 0, ...lengthBytes(val.length));
  } else {
    bytes.push(...word(val.length));
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

function fixture(
  overrides: TestElement[] = [],
  transferSyntax = '1.2.840.10008.1.2.1'
): ArrayBuffer {
  const littleEndian = transferSyntax !== '1.2.840.10008.1.2.2';
  const implicit = transferSyntax === '1.2.840.10008.1.2';
  const defaults: TestElement[] = [
    [0x0028, 0x0002, 'US', 1],
    [0x0028, 0x0004, 'CS', 'MONOCHROME2'],
    [0x0028, 0x0010, 'US', 2],
    [0x0028, 0x0011, 'US', 2],
    [0x0028, 0x0100, 'US', 8],
    [0x0028, 0x0101, 'US', 8],
    [0x0028, 0x0102, 'US', 7],
    [0x0028, 0x0103, 'US', 0],
    [0x7fe0, 0x0010, 'OB', [0, 85, 170, 255]]
  ];
  const tags = new Map(defaults.map((tag) => [`${tag[0]}:${tag[1]}`, tag]));
  for (const tag of overrides) tags.set(`${tag[0]}:${tag[1]}`, tag);
  const parts = [
    new Uint8Array(128),
    new TextEncoder().encode('DICM'),
    elem(0x0002, 0x0001, 'OB', [0, 1]),
    elem(0x0002, 0x0002, 'UI', '1.2.840.10008.5.1.4.1.1.7'),
    elem(0x0002, 0x0003, 'UI', '1.2.3.4'),
    elem(0x0002, 0x0010, 'UI', transferSyntax),
    ...Array.from(tags.values())
      .sort((a, b) => a[0] - b[0] || a[1] - b[1])
      .map(([group, element, vr, value]) => elem(group, element, vr, value, littleEndian, implicit))
  ];
  if (transferSyntax === '1.2.840.10008.1.2.5') {
    const rle = new Uint8Array(70);
    rle[0] = 1;
    rle[4] = 64;
    rle.set([3, 0, 85, 170, 255], 64);
    parts[parts.length - 1] = new Uint8Array([
      0xe0,
      0x7f,
      0x10,
      0,
      0x4f,
      0x42,
      0,
      0,
      255,
      255,
      255,
      255,
      0xfe,
      0xff,
      0,
      0xe0,
      4,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0xfe,
      0xff,
      0,
      0xe0,
      rle.length,
      0,
      0,
      0,
      ...rle,
      0xfe,
      0xff,
      0xdd,
      0xe0,
      0,
      0,
      0,
      0
    ]);
  }
  const out = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out.buffer as ArrayBuffer;
}

function pixelWords(values: number[], littleEndian: boolean): Uint8Array {
  const bytes = new Uint8Array(values.length * 2);
  const view = new DataView(bytes.buffer);
  values.forEach((value, index) => view.setUint16(index * 2, value, littleEndian));
  return bytes;
}

describe('isDicomBuffer', () => {
  it('mengenali magic DICM setelah preamble 128 byte', () => {
    expect(isDicomBuffer(buildDicom())).toBe(true);
    expect(isDicomBuffer(new Uint8Array([1, 2, 3]).buffer as ArrayBuffer)).toBe(false);
  });
});

describe('isImportableImageName', () => {
  it.each([
    'scan.dcm',
    'SCAN.DCM',
    'study.dicom',
    'foto.JPG',
    'citra.jpeg',
    'x-ray.png',
    'arsip.bmp',
    'slide.tif',
    'slide.tiff'
  ])('menerima ekstensi citra yang didukung: %s', (name) => {
    expect(isImportableImageName(name)).toBe(true);
  });

  it.each(['STUDY001', '1_2_840_113619', 'scan.'])('menerima nama tanpa ekstensi: %s', (name) => {
    expect(isImportableImageName(name)).toBe(true);
  });

  it.each(['catatan.txt', 'aplikasi.exe', 'laporan.pdf', 'arsip.zip', 'cadangan.dcm.bak'])(
    'menolak ekstensi yang jelas bukan citra: %s',
    (name) => {
      expect(isImportableImageName(name)).toBe(false);
    }
  );
});

describe('parseDicom UIDs', () => {
  const uids: TestElement[] = [
    [0x0020, 0x000d, 'UI', '1.2.3.4'],
    [0x0020, 0x000e, 'UI', '1.2.3.4.5'],
    [0x0008, 0x0018, 'UI', '1.2.3.4.5.6'],
    [0x0020, 0x0011, 'IS', '2'],
    [0x0020, 0x0013, 'IS', '120'],
    [0x0028, 0x0008, 'IS', '1']
  ];

  it('membaca UID studi/series/SOP dan nomor series/instance', () => {
    const m = parseDicom(fixture(uids));
    expect(m.studyUid).toBe('1.2.3.4');
    expect(m.seriesUid).toBe('1.2.3.4.5');
    expect(m.sopUid).toBe('1.2.3.4.5.6');
    expect(m.seriesNumber).toBe(2);
    expect(m.instanceNumber).toBe(120);
    expect(m.numberOfFrames).toBe(1);
  });

  it('kosong/null saat tag tidak ada', () => {
    const m = parseDicom(fixture());
    expect(m.studyUid).toBe('');
    expect(m.seriesUid).toBe('');
    expect(m.sopUid).toBe('');
    expect(m.seriesNumber).toBeNull();
    expect(m.instanceNumber).toBeNull();
    expect(m.numberOfFrames).toBeNull();
  });

  it('null untuk IS yang tidak valid', () => {
    const m = parseDicom(fixture([[0x0020, 0x0013, 'IS', 'ABC']]));
    expect(m.instanceNumber).toBeNull();
  });
});

describe('parseDicom', () => {
  it.each([
    ['000Y', '0'],
    ['045Y', '45'],
    ['999Y', '999'],
    ['011M', '0'],
    ['012M', '1'],
    ['023M', '1'],
    ['024M', '2'],
    ['051W', '0'],
    ['052W', '1'],
    ['103W', '1'],
    ['104W', '2'],
    ['364D', '0'],
    ['365D', '1'],
    ['729D', '1'],
    ['730D', '2']
  ])('converts PatientAge %s to %s completed years', (as, expected) => {
    expect(parseDicom(fixture([[0x0010, 0x1010, 'AS', as]])).age).toBe(expected);
  });

  it.each(['', '45Y', '0045Y', '045', '045Q', '045y', '-01Y', '1.5Y', 'ABCY'])(
    'returns empty for invalid PatientAge %s',
    (as) => {
      expect(parseDicom(fixture([[0x0010, 0x1010, 'AS', as]])).age).toBe('');
    }
  );

  it.each([
    ['19900615', '20240614', '33'],
    ['19900615', '20240615', '34'],
    ['19900615', '20240616', '34'],
    ['20240101', '20240101', '0'],
    ['20000229', '20230228', '22'],
    ['20000229', '20230301', '23'],
    ['20000229', '20240229', '24']
  ])('prefers valid dates %s / %s over PatientAge', (birth, study, expected) => {
    expect(
      parseDicom(
        fixture([
          [0x0010, 0x0030, 'DA', birth],
          [0x0008, 0x0020, 'DA', study],
          [0x0010, 0x1010, 'AS', '099Y']
        ])
      ).age
    ).toBe(expected);
  });

  it.each([
    ['19900230', '20240101'],
    ['19901301', '20240101'],
    ['19900100', '20240101'],
    ['00000101', '20240101'],
    ['19900101', '20240230'],
    ['20250101', '20240101'],
    ['19000229', '20240101'],
    ['19900101', '']
  ])('falls back when dates %s / %s cannot establish age', (birth, study) => {
    expect(
      parseDicom(
        fixture([
          [0x0010, 0x0030, 'DA', birth],
          [0x0008, 0x0020, 'DA', study],
          [0x0010, 0x1010, 'AS', '024M']
        ])
      ).age
    ).toBe('2');
  });

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
  it.each([
    ['implicit little-endian', '1.2.840.10008.1.2'],
    ['explicit little-endian', '1.2.840.10008.1.2.1'],
    ['explicit big-endian', '1.2.840.10008.1.2.2']
  ])('decodes signed and unsigned 8/16-bit %s pixels', (_name, syntax) => {
    for (const bits of [8, 16]) {
      for (const signed of [0, 1]) {
        const values = signed ? [-128, -43, 42, 127] : [0, 85, 170, 255];
        const pixels =
          bits === 8
            ? new Uint8Array(values)
            : pixelWords(values, syntax !== '1.2.840.10008.1.2.2');
        const px = extractPixels(
          fixture(
            [
              [0x0028, 0x0100, 'US', bits],
              [0x0028, 0x0101, 'US', bits],
              [0x0028, 0x0102, 'US', bits - 1],
              [0x0028, 0x0103, 'US', signed],
              [0x7fe0, 0x0010, bits === 8 ? 'OB' : 'OW', pixels]
            ],
            syntax
          )
        );
        expect(Array.from(px.gray)).toEqual([0, 85, 170, 255]);
      }
    }
  });

  it.each([0, 1])('uses stored bits and high bit with representation %s', (signed) => {
    const values = signed ? [0x800, 0xd55, 0x2aa, 0x7ff] : [0, 0x555, 0xaaa, 0xfff];
    const px = extractPixels(
      fixture([
        [0x0028, 0x0100, 'US', 16],
        [0x0028, 0x0101, 'US', 12],
        [0x0028, 0x0102, 'US', 14],
        [0x0028, 0x0103, 'US', signed],
        [
          0x7fe0,
          0x0010,
          'OW',
          pixelWords(
            values.map((v, i) => (v << 3) | (i % 2 ? 0x8007 : 0)),
            true
          )
        ]
      ])
    );
    expect(Array.from(px.gray)).toEqual([0, 85, 170, 255]);
  });

  it('applies slope and intercept before windowing', () => {
    const px = extractPixels(
      fixture([
        [0x0028, 0x1052, 'DS', '-100'],
        [0x0028, 0x1053, 'DS', '2'],
        [0x0028, 0x1050, 'DS', '200'],
        [0x0028, 0x1051, 'DS', '400'],
        [0x7fe0, 0x0010, 'OB', [0, 100, 200, 255]]
      ])
    );
    expect(Array.from(px.gray)).toEqual([0, 64, 191, 255]);
  });

  it('applies negative slope before min-max normalization', () => {
    const px = extractPixels(fixture([[0x0028, 0x1053, 'DS', '-2']]));
    expect(Array.from(px.gray)).toEqual([255, 170, 85, 0]);
  });

  it('preserves MONOCHROME1 inversion and constant-image output', () => {
    const px = extractPixels(
      fixture([
        [0x0028, 0x0004, 'CS', 'MONOCHROME1'],
        [0x7fe0, 0x0010, 'OB', [42, 42, 42, 42]]
      ])
    );
    expect(px.invert).toBe(true);
    expect(Array.from(px.gray)).toEqual([0, 0, 0, 0]);
  });

  it('uses only the first frame of native multiframe data', () => {
    const px = extractPixels(
      fixture([
        [0x0028, 0x0008, 'IS', '2'],
        [0x7fe0, 0x0010, 'OB', [0, 85, 170, 255, 42, 42, 42, 42]]
      ])
    );
    expect(Array.from(px.gray)).toEqual([0, 85, 170, 255]);
  });

  it('explicitly rejects RLE-compressed pixels', () => {
    expect(() => extractPixels(fixture([], '1.2.840.10008.1.2.5'))).toThrow(
      /Transfer Syntax.*tidak didukung/i
    );
  });

  it.each(['RGB', 'YBR_FULL', 'PALETTE COLOR'])(
    'explicitly rejects %s color pixels',
    (photometric) => {
      expect(() =>
        extractPixels(
          fixture([
            [0x0028, 0x0002, 'US', photometric === 'PALETTE COLOR' ? 1 : 3],
            [0x0028, 0x0004, 'CS', photometric],
            [0x7fe0, 0x0010, 'OB', new Uint8Array(photometric === 'PALETTE COLOR' ? 4 : 12)]
          ])
        )
      ).toThrow(/Photometric.*tidak didukung/i);
    }
  );

  it.each([1, 32])('explicitly rejects %s-bit allocation', (bits) => {
    expect(() =>
      extractPixels(
        fixture([
          [0x0028, 0x0100, 'US', bits],
          [0x0028, 0x0101, 'US', bits],
          [0x0028, 0x0102, 'US', bits - 1],
          [0x7fe0, 0x0010, 'OW', new Uint8Array(bits === 1 ? 2 : 16)]
        ])
      )
    ).toThrow(/Bits.*tidak didukung/i);
  });

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

describe('applyWindow', () => {
  const ramp = new Float64Array([0, 50, 100, 150, 200]);

  it('memetakan linear center 100 width 100', () => {
    expect(Array.from(applyWindow(ramp, 100, 100))).toEqual([0, 0, 128, 255, 255]);
  });

  it('identik saat jendela melingkupi seluruh rentang', () => {
    expect(Array.from(applyWindow(ramp, 100, 200))).toEqual([0, 64, 128, 191, 255]);
  });

  it('tidak melempar saat width nol dan menjaga panjang', () => {
    const out = applyWindow(ramp, 100, 0);
    expect(out.length).toBe(ramp.length);
    expect(Array.from(out)).toEqual([0, 0, 128, 255, 255]);
  });
});

describe('defaultWindow', () => {
  it('mengambil center dan width dari min-max', () => {
    expect(defaultWindow(new Float64Array([10, 20, 30]))).toEqual({ center: 20, width: 20 });
  });

  it('aman untuk data kosong', () => {
    expect(defaultWindow(new Float64Array(0))).toEqual({ center: 0, width: 1 });
  });
});

describe('extractPixels raw', () => {
  it('menyertakan nilai rescale mentah sepanjang piksel', () => {
    const px = extractPixels(buildDicom());
    expect(px.raw.length).toBe(px.width * px.height);
    expect(Array.from(px.raw)).toEqual([0, 85, 170, 255]);
  });
});
