<script lang="ts">
  import { toExportRow, type ExportRow } from '$lib/history';

  export interface HistoryApiRow {
    id: number;
    patientId: string;
    patientName: string;
    gender: string;
    age: string;
    weightKg: number | null;
    examType: string;
    kvp: number;
    ma: number;
    timeS: number;
    mas: number;
    inakMgy: number;
    esakMgy: number;
    dapMgyCm2: number | null;
    drlLimitText: string;
    drlStatus: string;
  }

  let {
    rows,
    onDelete,
    deleting = false
  }: {
    rows: HistoryApiRow[];
    onDelete: (id: number) => void;
    deleting?: boolean;
  } = $props();

  const display: ExportRow[] = $derived(
    rows.map((r, i) => ({
      ...toExportRow({
        no: rows.length - i,
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
      }),
      // Tampilan tabel dibulatkan; file export tetap presisi penuh.
      mAs: fmt(r.mas),
      'INAK (mGy)': fmt(r.inakMgy),
      'ESAK (mGy)': fmt(r.esakMgy)
    }))
  );

  function fmt(v: number): string {
    return Number.isFinite(v) ? v.toFixed(4) : '';
  }

  const columns: string[] = $derived(display.length > 0 ? Object.keys(display[0] as object) : []);
</script>

<div class="panel slim-scroll overflow-auto">
  <table class="tnum w-full text-xs">
    <thead class="sticky top-0 bg-[#F7F6F3]">
      <tr class="border-b border-[#EAEAEA]">
        {#each columns as c (c)}
          <th class="p-1.5 text-left font-sans font-semibold whitespace-nowrap">{c}</th>
        {/each}
        <th class="p-1.5"></th>
      </tr>
    </thead>
    <tbody>
      {#each display as row, i (rows[i]?.id)}
        <tr class="border-b border-[#EAEAEA] last:border-0">
          {#each columns as c (c)}
            <td class="p-1.5 whitespace-nowrap">{row[c]}</td>
          {/each}
          <td class="p-1.5">
            <button
              type="button"
              class="text-[#9F2F2D] hover:underline disabled:opacity-50"
              disabled={deleting}
              onclick={() => rows[i] && onDelete(rows[i].id)}
            >
              Hapus
            </button>
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
  {#if display.length === 0}
    <p class="p-6 text-center text-sm text-[#787774]">Belum ada data history.</p>
  {/if}
</div>
