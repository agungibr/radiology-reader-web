<script lang="ts">
  import type { DicomMetadata } from '$lib/dicom';

  let {
    metadata,
    studyLabel,
    studyDescription,
    seriesLabel,
    seriesDescription
  }: {
    metadata: DicomMetadata | null;
    studyLabel: string;
    studyDescription: string;
    seriesLabel: string;
    seriesDescription: string;
  } = $props();

  const rows: { label: string; value: string }[] = $derived([
    { label: 'Study', value: studyLabel ? `${studyLabel} · ${studyDescription || '—'}` : '—' },
    { label: 'Patient ID', value: metadata?.patientId ? '•••••••' : '—' },
    { label: 'Modalitas', value: metadata?.modality || '—' },
    { label: 'Series', value: seriesLabel ? `${seriesLabel} · ${seriesDescription || '—'}` : '—' }
  ]);
</script>

<section
  class="min-w-0 rounded-[12px] border border-white/10 bg-white/[0.03] p-4"
  aria-label="Study info"
>
  <h2 class="mb-3 font-mono text-[10px] font-semibold tracking-widest text-zinc-500 uppercase">
    Study info
  </h2>
  {#if metadata}
    <dl class="space-y-1.5 text-[13px]">
      {#each rows as r (r.label)}
        <div class="flex items-baseline gap-2">
          <dt class="w-28 shrink-0 truncate text-zinc-500">{r.label}</dt>
          <span class="shrink-0 text-zinc-600" aria-hidden="true">:</span>
          <dd class="min-w-0 flex-1 truncate text-zinc-100" title={r.value}>
            {r.value}
          </dd>
        </div>
      {/each}
    </dl>
  {:else}
    <p class="text-sm text-zinc-500">
      Belum ada studi. Buka File/Folder atau seret file ke viewport.
    </p>
  {/if}
</section>
