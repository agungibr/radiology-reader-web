import { describe, expect, it } from 'vitest';
import {
  clampSliceIndex,
  clampStudiesWidth,
  groupIntoStudies,
  loadStudiesWidth,
  SliceCache,
  type SliceInfo
} from '$lib/study';

function slice(over: Partial<SliceInfo> & { name: string }): SliceInfo {
  return {
    studyUid: '',
    seriesUid: '',
    studyDescription: '',
    seriesDescription: '',
    bodyPartExamined: '',
    seriesNumber: null,
    instanceNumber: null,
    ...over
  };
}

describe('groupIntoStudies', () => {
  it('mengelompokkan 2 series dalam 1 study dan mengurutkan slice numerik', () => {
    const files = [
      slice({ name: 's1-10.dcm', studyUid: 'ST1', seriesUid: 'SE1', instanceNumber: 10 }),
      slice({ name: 's2-1.dcm', studyUid: 'ST1', seriesUid: 'SE2', instanceNumber: 1 }),
      slice({ name: 's1-2.dcm', studyUid: 'ST1', seriesUid: 'SE1', instanceNumber: 2 }),
      slice({ name: 's2-2.dcm', studyUid: 'ST1', seriesUid: 'SE2', instanceNumber: 2 })
    ];
    const [study] = groupIntoStudies(files);

    expect(study?.series).toHaveLength(2);
    expect(study?.totalImages).toBe(4);
    const [a, b] = study?.series ?? [];
    // '2' sebelum '10' (numerik, bukan leksikal)
    expect(a?.slices.map((s) => s.name)).toEqual(['s1-2.dcm', 's1-10.dcm']);
    expect(b?.slices.map((s) => s.name)).toEqual(['s2-1.dcm', 's2-2.dcm']);
  });

  it('file tanpa UID masing-masing menjadi pseudo-study sendiri', () => {
    const studies = groupIntoStudies([slice({ name: 'a.dcm' }), slice({ name: 'b.dcm' })]);

    expect(studies).toHaveLength(2);
    expect(studies[0]?.totalImages).toBe(1);
    expect(studies[0]?.label).toBe('Study 001');
    expect(studies[1]?.label).toBe('Study 002');
  });

  it('series tanpa UID dikelompokkan per deskripsi dalam study yang sama', () => {
    const files = [
      slice({ name: 'a.dcm', studyUid: 'ST1', seriesDescription: 'Axial' }),
      slice({ name: 'b.dcm', studyUid: 'ST1', seriesDescription: 'Scout' }),
      slice({ name: 'c.dcm', studyUid: 'ST1', seriesDescription: 'Axial' })
    ];
    const [study] = groupIntoStudies(files);

    expect(study?.series).toHaveLength(2);
    expect(study?.series[0]?.slices).toHaveLength(2);
  });

  it('mengembalikan list kosong untuk input kosong', () => {
    expect(groupIntoStudies([])).toEqual([]);
  });
});

describe('clampSliceIndex', () => {
  it('menjepit indeks ke rentang stack', () => {
    expect(clampSliceIndex(-1, 240)).toBe(0);
    expect(clampSliceIndex(240, 240)).toBe(239);
    expect(clampSliceIndex(119, 240)).toBe(119);
  });

  it('nol saat stack kosong', () => {
    expect(clampSliceIndex(5, 0)).toBe(0);
  });
});

describe('SliceCache', () => {
  it('menyimpan dan mengambil sampai batas', () => {
    const c = new SliceCache<string>(3);
    c.set(0, 'a');
    c.set(1, 'b');
    c.set(2, 'c');
    expect(c.get(0)).toBe('a');
    expect(c.size).toBe(3);
  });

  it('mengusir yang paling lama tak dipakai', () => {
    const c = new SliceCache<string>(2);
    c.set(0, 'a');
    c.set(1, 'b');
    c.get(0);
    c.set(2, 'c');
    expect(c.get(0)).toBe('a');
    expect(c.get(1)).toBeUndefined();
    expect(c.get(2)).toBe('c');
  });

  it('clear mengosongkan cache', () => {
    const c = new SliceCache<string>(2);
    c.set(0, 'a');
    c.clear();
    expect(c.size).toBe(0);
    expect(c.get(0)).toBeUndefined();
  });
});

describe('studies panel width', () => {
  it('default 232, dijepit 160..400', () => {
    expect(clampStudiesWidth(232)).toBe(232);
    expect(clampStudiesWidth(100)).toBe(160);
    expect(clampStudiesWidth(900)).toBe(400);
    expect(clampStudiesWidth(Number.NaN)).toBe(232);
  });

  it('loadStudiesWidth aman tanpa storage (SSR)', () => {
    expect(loadStudiesWidth()).toBe(232);
  });
});
