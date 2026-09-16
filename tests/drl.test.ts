import { describe, expect, it } from 'vitest';
import {
  assessDrl,
  determineAgeGroup,
  matchExamination,
  normalizeView,
  statusLabel
} from '$lib/drl';

// Golden behaviors verified against desktop Python
// (D:/radiologi/text-recognition/core/drl_engine.py).
describe('matchExamination', () => {
  it('mencocokkan chest dari study description', () => {
    expect(matchExamination('Chest PA', '')).toBe('Chest');
    expect(matchExamination('THORAX AP', '')).toBe('Chest');
  });

  it('memprioritaskan keyword terpanjang (thoracolumbar bukan lumbar)', () => {
    expect(matchExamination('thorakolumbar AP', '')).toBe('Thoracolumbar');
  });

  it('jatuh ke body part saat study kosong', () => {
    expect(matchExamination('', 'CHEST')).toBe('Chest');
  });

  it('mengembalikan null saat tidak dikenali', () => {
    expect(matchExamination('xyz-tidak-dikenal', '')).toBeNull();
  });
});

describe('normalizeView', () => {
  it('memetakan alias umum', () => {
    expect(normalizeView('pa', 'Chest')).toBe('PA');
    expect(normalizeView('LL', 'Wrist Joint')).toBe('Lateral');
    expect(normalizeView('obl', 'Manus')).toBe('Oblique');
  });

  it('selalu Waters untuk Sinus Paranasal apa pun inputnya', () => {
    expect(normalizeView('PA', 'Sinus Paranasal')).toBe('Waters');
    expect(normalizeView('', 'Sinus Paranasal')).toBe('Waters');
  });

  it('default Standard untuk Panoramic tanpa view', () => {
    expect(normalizeView('', 'Panoramic')).toBe('Standard');
  });
});

describe('determineAgeGroup', () => {
  it('mengelompokkan usia dengan benar', () => {
    expect(determineAgeGroup('3')).toBe('infant');
    expect(determineAgeGroup('10')).toBe('children');
    expect(determineAgeGroup('45')).toBe('adult');
  });

  it('default adult saat usia tidak diketahui', () => {
    expect(determineAgeGroup('')).toBe('adult');
  });
});

describe('assessDrl', () => {
  it('Chest PA dewasa: INAK/ESAK di atas DRL', () => {
    const r = assessDrl({
      inak: 0.25,
      esak: 0.31,
      dap: null,
      studyDescription: 'Chest PA',
      bodyPartExamined: '',
      viewPosition: 'PA',
      patientAge: '45'
    });

    expect(r.matched).toBe(true);
    expect(r.examination).toBe('Chest');
    expect(r.view).toBe('PA');
    expect(r.metric).toBe('inak_esak');
    expect(r.drlInak).toBeCloseTo(0.2, 9);
    expect(r.drlEsak).toBeCloseTo(0.2, 9);
    expect(r.inakStatus).toBe('above');
    expect(r.esakStatus).toBe('above');
  });

  it('Thoracolumbar di bawah DRL (bukan salah match Lumbar)', () => {
    const r = assessDrl({
      inak: 0.15,
      esak: 0.18,
      dap: null,
      studyDescription: 'thorakolumbar AP',
      bodyPartExamined: '',
      viewPosition: 'AP',
      patientAge: '30'
    });

    expect(r.matched).toBe(true);
    expect(r.examination).toBe('Thoracolumbar');
    expect(r.drlInak).toBeCloseTo(0.7, 9);
    expect(r.inakStatus).toBe('below');
    expect(r.esakStatus).toBe('below');
  });

  it('Panoramic memakai metrik DAP', () => {
    const r = assessDrl({
      inak: null,
      esak: null,
      dap: 100.0,
      studyDescription: 'panoramik',
      bodyPartExamined: '',
      viewPosition: '',
      patientAge: '20'
    });

    expect(r.matched).toBe(true);
    expect(r.metric).toBe('dap');
    expect(r.view).toBe('Standard');
    expect(r.drlDap).toBeCloseTo(120.0, 9);
    expect(r.dapStatus).toBe('below');
  });

  it('fallback ke entri adult untuk bayi Chest PA', () => {
    const r = assessDrl({
      inak: 0.2,
      esak: 0.2,
      dap: null,
      studyDescription: 'Chest PA',
      bodyPartExamined: '',
      viewPosition: 'PA',
      patientAge: '3'
    });

    expect(r.matched).toBe(true);
    expect(r.ageGroup).toBe('infant');
    expect(r.inakStatus).toBe('equal');
    expect(r.esakStatus).toBe('equal');
  });

  it('tidak cocok: pesan Indonesia yang membantu', () => {
    const r = assessDrl({
      inak: 0.1,
      esak: 0.1,
      dap: null,
      studyDescription: 'xyz-tidak-dikenal',
      bodyPartExamined: '',
      viewPosition: '',
      patientAge: ''
    });

    expect(r.matched).toBe(false);
    expect(r.message).toContain('tidak dikenali');
  });
});

describe('statusLabel', () => {
  it('melabeli status ke Bahasa Indonesia', () => {
    expect(statusLabel('below')).toBe('Below DRL');
    expect(statusLabel('equal')).toBe('Equal to DRL');
    expect(statusLabel('above')).toBe('Above DRL');
    expect(statusLabel(null)).toBe('—');
  });
});
