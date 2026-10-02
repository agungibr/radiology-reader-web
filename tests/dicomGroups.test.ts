import { describe, expect, it } from 'vitest';
import { groupDicomTags } from '$lib/dicomGroups';
import type { DicomTag } from '$lib/dicom';

function tag(tag: string, vr = 'LO', value = 'x'): DicomTag {
  return { tag, vr, value };
}

describe('groupDicomTags', () => {
  it('groups patient tags under Pasien with display names', () => {
    const groups = groupDicomTags([
      tag('00100010', 'PN', 'SITI RAHMA'),
      tag('00100020', 'LO', 'P001')
    ]);
    const pasien = groups.find((g) => g.name === 'Pasien');
    expect(pasien).toBeDefined();
    expect(pasien?.tags.map((t) => t.name)).toEqual(['Patient Name', 'Patient ID']);
    expect(pasien?.tags[0]?.value).toBe('SITI RAHMA');
  });

  it('routes unknown tags to Lainnya preserving count', () => {
    const tags = [tag('00100010'), tag('99990099', 'UN', 'misteri'), tag('00180060')];
    const groups = groupDicomTags(tags);
    const total = groups.reduce((s, g) => s + g.tags.length, 0);
    expect(total).toBe(3);
    const lainnya = groups.find((g) => g.name === 'Lainnya');
    expect(lainnya?.tags.map((t) => t.tag)).toEqual(['99990099']);
  });

  it('orders groups Pasien, Studi, Citra, Lainnya and omits empties', () => {
    const groups = groupDicomTags([tag('00280010'), tag('00100010')]);
    expect(groups.map((g) => g.name)).toEqual(['Pasien', 'Citra']);
  });

  it('puts study and exposure tags in the right modules', () => {
    const groups = groupDicomTags([
      tag('00081030', 'LO', 'Chest PA'),
      tag('00181151', 'DS', '200')
    ]);
    const names = groups.map((g) => g.name);
    expect(names).toContain('Studi');
    expect(names).toContain('Citra');
  });
});
