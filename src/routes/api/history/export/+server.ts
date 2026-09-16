/**
 * API export history: GET ?format=xlsx|csv → file unduhan.
 * Kolom + urutan sama dengan desktop (16 kolom Indonesia).
 */
import { desc } from 'drizzle-orm';
import * as XLSX from 'xlsx';
import { getDb } from '$lib/db/client';
import { calculations } from '$lib/db/schema';
import { toExportRow } from '$lib/history';
import type { RequestHandler } from './$types';

function timestamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

function csvCell(v: string | number): string {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export const GET: RequestHandler = async ({ url, platform }) => {
  const format = url.searchParams.get('format') === 'csv' ? 'csv' : 'xlsx';
  const database = platform?.env?.DB;
  if (!database) {
    return new Response(JSON.stringify({ error: 'Database tidak tersedia' }), {
      status: 500,
      headers: { 'content-type': 'application/json' }
    });
  }

  const db = getDb(database);
  const stored = await db.select().from(calculations).orderBy(desc(calculations.id)).limit(5000);
  const rows = stored.map((r, i) =>
    toExportRow({
      no: stored.length - i,
      patientId: r.patientId,
      patientName: r.patientName,
      gender: r.gender,
      age: r.age,
      weightKg: r.weightKg,
      examType: r.examType,
      kvp: r.kvp,
      ma: r.ma,
      timeS: r.timeS,
      mas: r.mas,
      inakMgy: r.inakMgy,
      esakMgy: r.esakMgy,
      dapMgyCm2: r.dapMgyCm2,
      drlLimitText: r.drlLimitText,
      drlStatus: r.drlStatus
    })
  );

  const name = `history_inak_esak_${timestamp()}`;
  if (format === 'csv') {
    const header = Object.keys(rows[0] ?? toExportRowEmpty())
      .map(csvCell)
      .join(',');
    const body = rows.map((r) => Object.values(r).map(csvCell).join(',')).join('\n');
    return new Response(`\uFEFF${header}\n${body}`, {
      headers: {
        'content-type': 'text/csv; charset=utf-8',
        'content-disposition': `attachment; filename="${name}.csv"`
      }
    });
  }

  const sheet = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, 'History INAK ESAK');
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  return new Response(buffer, {
    headers: {
      'content-type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'content-disposition': `attachment; filename="${name}.xlsx"`
    }
  });
};

function toExportRowEmpty() {
  return toExportRow({
    no: 0,
    patientId: '',
    patientName: '',
    gender: '',
    age: '',
    weightKg: null,
    examType: '',
    kvp: 0,
    ma: 0,
    timeS: 0,
    mas: 0,
    inakMgy: 0,
    esakMgy: 0,
    dapMgyCm2: null,
    drlLimitText: '',
    drlStatus: ''
  });
}
