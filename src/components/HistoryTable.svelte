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
    rows.map((r, i) =>
      toExportRow({
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
      })
    )
  );

  const columns: string[] = $derived(display.length > 0 ? Object.keys(display[0] as object) : []);
</script>

<div class="overflow-auto border bg-white">
  <table class="w-full text-xs">
    <thead class="sticky top-0 bg-gray-100">
      <tr>
        {#each columns as c (c)}
          <th class="whitespace-nowrap p-1 text-left">{c}</th>
        {/each}
        <th class="p-1"></th>
      </tr>
    </thead>
    <tbody>
      {#each display as row, i (rows[i]?.id)}
        <tr class="border-t">
          {#each columns as c (c)}
            <td class="whitespace-nowrap p-1">{row[c]}</td>
          {/each}
          <td class="p-1">
            <button
              type="button"
              class="text-red-700 hover:underline disabled:opacity-50"
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
</div>
