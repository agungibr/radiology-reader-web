import { describe, expect, it } from 'vitest';
import { buildDrlLimitText, toExportRow, worstDrlStatus } from '$lib/history';
import { assessDrl } from '$lib/drl';

// Port logika history_entry desktop (main_window._on_calculate_inak_esak):
// batas "INAK≤x, ESAK≤y" / "DAP≤z", status terburuk above > equal > below.
describe('worstDrlStatus', () => {
  it('memilih status terburuk dari INAK/ESAK', () => {
    const r = assessDrl({
      inak: 0.25,
      esak: 0.15,
      dap: null,
      studyDescription: 'Chest PA',
      bodyPartExamined: '',
      viewPosition: 'PA',
      patientAge: '45'
    });
    // inak above (0.25 > 0.2), esak below (0.15 < 0.2)
    expect(r.inakStatus).toBe('above');
    expect(r.esakStatus).toBe('below');
    expect(worstDrlStatus(r)).toBe('above');
  });

  it('memakai status DAP untuk metrik dap', () => {
    const r = assessDrl({
      inak: null,
      esak: null,
      dap: 100,
      studyDescription: 'panoramik',
      bodyPartExamined: '',
      viewPosition: '',
      patientAge: '20'
    });
    expect(worstDrlStatus(r)).toBe('below');
  });

  it('string kosong saat tidak cocok', () => {
    const r = assessDrl({
      inak: 0.1,
      esak: 0.1,
      dap: null,
      studyDescription: 'xyz-tidak-dikenal',
      bodyPartExamined: '',
      viewPosition: '',
      patientAge: ''
    });
    expect(worstDrlStatus(r)).toBe('');
  });
});

describe('buildDrlLimitText', () => {
  it('format batas INAK/ESAK seperti desktop', () => {
    const r = assessDrl({
      inak: 0.25,
      esak: 0.31,
      dap: null,
      studyDescription: 'Chest PA',
      bodyPartExamined: '',
      viewPosition: 'PA',
      patientAge: '45'
    });
    expect(buildDrlLimitText(r)).toBe('INAK≤0.2 mGy, ESAK≤0.2 mGy');
  });

  it('format batas DAP', () => {
    const r = assessDrl({
      inak: null,
      esak: null,
      dap: 100,
      studyDescription: 'panoramik',
      bodyPartExamined: '',
      viewPosition: '',
      patientAge: '20'
    });
    expect(buildDrlLimitText(r)).toBe('DAP≤120 mGy·cm²');
  });
});

describe('toExportRow', () => {
  it('memetakan baris history ke 16 kolom Indonesia', () => {
    const row = toExportRow({
      no: 1,
      patientId: 'P001',
      patientName: 'Budi',
      gender: 'L',
      age: '45',
      weightKg: 70,
      examType: 'Chest PA',
      kvp: 70,
      ma: 200,
      timeS: 0.05,
      mas: 10,
      inakMgy: 0.242103,
      esakMgy: 0.326839,
      dapMgyCm2: null,
      drlLimitText: 'INAK≤0.2 mGy, ESAK≤0.2 mGy',
      drlStatus: 'above'
    });

    expect(Object.keys(row)).toHaveLength(16);
    expect(row['No']).toBe(1);
    expect(row['Nama Pasien']).toBe('Budi');
    expect(row['DAP (mGy·cm²)']).toBe('');
    expect(row['Hasil DRL']).toBe('Above DRL');
  });
});
