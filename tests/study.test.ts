import { describe, expect, it } from 'vitest';
import { groupIntoStudies, type SliceInfo } from '$lib/study';

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
