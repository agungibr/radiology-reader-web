import { describe, expect, it } from 'vitest';
import { filterDicomTags, nameDicomTag, pageWindow } from '$lib/dicomGroups';
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

describe('nameDicomTag', () => {
  it('memakai nama kamus untuk tag dikenal', () => {
    const t = nameDicomTag(tag('00100010', 'PN', 'SITI'));
    expect(t.name).toBe('Patient Name');
    expect(t.known).toBe(true);
  });

  it('melabeli jujur tag tak dikenal grup genap', () => {
    const t = nameDicomTag(tag('00180061', 'DS', '1'));
    expect(t.name).toBe('Unknown tag');
    expect(t.known).toBe(false);
  });

  it('melabeli jujur tag privat grup ganjil', () => {
    const t = nameDicomTag(tag('00091000', 'LO', 'x'));
    expect(t.name).toBe('Private tag');
    expect(t.known).toBe(false);
  });
});

describe('dictionary coverage', () => {
  it.each([
    ['00080005', 'Specific Character Set'],
    ['00080008', 'Image Type'],
    ['00080012', 'Instance Creation Date'],
    ['00080013', 'Instance Creation Time'],
    ['00080016', 'SOP Class UID'],
    ['00080018', 'SOP Instance UID'],
    ['00080021', 'Series Date'],
    ['00080031', 'Series Time'],
    ['00080070', 'Manufacturer'],
    ['00081010', 'Station Name'],
    ['00081090', "Manufacturer's Model Name"],
    ['00181000', 'Device Serial Number'],
    ['00181020', 'Software Versions'],
    ['00181030', 'Protocol Name'],
    ['00181110', 'Distance Source to Detector'],
    ['00181111', 'Distance Source to Patient'],
    ['00185100', 'Patient Position'],
    ['0020000E', 'Series Instance UID'],
    ['00200010', 'Study ID'],
    ['00200011', 'Series Number'],
    ['00200013', 'Instance Number'],
    ['00200060', 'Laterality'],
    ['00280008', 'Number of Frames'],
    ['00281052', 'Rescale Intercept'],
    ['00281053', 'Rescale Slope'],
    ['00282110', 'Lossy Image Compression'],
    ['00400254', 'Performed Procedure Step Description']
  ])('names standard tag %s as "%s"', (hex, expected) => {
    const t = nameDicomTag(tag(hex, 'LO', 'x'));
    expect(t.name).toBe(expected);
    expect(t.known).toBe(true);
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
