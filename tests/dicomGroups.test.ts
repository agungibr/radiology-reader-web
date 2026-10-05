import { describe, expect, it } from 'vitest';
import { filterDicomTags, pageWindow } from '$lib/dicomGroups';
import type { DicomTag } from '$lib/dicom';

function tag(tag: string, vr = 'LO', value = 'x'): DicomTag {
  return { tag, vr, value };
}

describe('filterDicomTags', () => {
  const tags = [
    tag('00100010', 'PN', 'SITI RAHMA'),
    tag('00100020', 'LO', 'P001'),
    tag('00180060', 'DS', '70')
  ];

  it('matches display name case-insensitively', () => {
    expect(filterDicomTags(tags, 'patient').map((t) => t.tag)).toEqual(['00100010', '00100020']);
  });

  it('matches tag hex fragments', () => {
    expect(filterDicomTags(tags, '0018').map((t) => t.tag)).toEqual(['00180060']);
  });

  it('matches values', () => {
    expect(filterDicomTags(tags, 'rahma').map((t) => t.tag)).toEqual(['00100010']);
  });

  it('returns everything on empty query', () => {
    expect(filterDicomTags(tags, '   ')).toHaveLength(3);
  });

  it('returns empty on no match', () => {
    expect(filterDicomTags(tags, 'zzz-tidak-ada')).toEqual([]);
  });
});

describe('pageWindow', () => {
  it('lists all pages when few', () => {
    expect(pageWindow(3, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it('collapses edges on first page', () => {
    expect(pageWindow(1, 15)).toEqual([1, 2, '…', 14, 15]);
  });

  it('shows neighborhood mid-range', () => {
    expect(pageWindow(8, 15)).toEqual([1, 2, '…', 7, 8, 9, '…', 14, 15]);
  });
});
