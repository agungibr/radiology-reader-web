<script lang="ts">
  import type { Study } from '$lib/study';

  let {
    studies,
    totalFiles,
    selectedFile,
    thumbOf,
    onSelectFile,
    onRemoveSeries
  }: {
    studies: Study[];
    totalFiles: number;
    selectedFile: number;
    thumbOf: (fileIndex: number) => string | null;
    onSelectFile: (i: number) => void;
    onRemoveSeries: (fileIndices: number[]) => void;
  } = $props();

  function firstFileOf(study: Study, seriesKey: string): number | null {
    const s = study.series.find((x) => x.key === seriesKey);
    return s?.slices[0]?.fileIndex ?? null;
  }

  function containsFile(study: Study, fileIndex: number): boolean {
    return study.series.some((s) => s.slices.some((sl) => sl.fileIndex === fileIndex));
  }
</script>

<section
  class="min-w-0 rounded-[12px] border border-white/10 bg-white/[0.02] p-2"
  aria-label="Studies"
>
  <h2
    class="px-1.5 pt-1 font-mono text-[10px] font-semibold tracking-widest text-zinc-500 uppercase"
  >
    Studies
  </h2>
  {#if totalFiles > 0}
    <ul class="slim-scroll mt-1 flex max-h-[60dvh] flex-col gap-2 overflow-y-auto">
      {#each studies as study (study.key)}
        {@const active = containsFile(study, selectedFile)}
        <li
          class={`rounded-[8px] border p-1.5 transition-colors ${active ? 'border-blue-500/60 bg-blue-600/5' : 'border-white/10'} flex flex-col gap-1`}
        >
          <div class="flex items-center gap-2 px-0.5">
            <span class="min-w-0 flex-1">
              <span class="block truncate text-xs font-semibold text-zinc-100">
                {study.label}
              </span>
              <span class="block font-mono text-[10px] text-zinc-500">
                {study.series.length} series · {study.totalImages} images
              </span>
            </span>
          </div>
          <ul class="flex flex-col gap-1">
            {#each study.series as series (series.key)}
              {@const target = firstFileOf(study, series.key)}
              {@const chosen = target !== null && target === selectedFile}
              {@const thumb = target !== null ? thumbOf(target) : null}
              <li class="group relative">
                <button
                  type="button"
                  disabled={target === null}
                  onclick={() => target !== null && onSelectFile(target)}
                  class={`flex w-full items-center gap-2 rounded-[6px] border p-1.5 text-left transition-colors disabled:opacity-40 ${chosen ? 'border-blue-500 bg-blue-600/10' : 'border-white/10 hover:border-white/25'}`}
                >
                  {#if thumb}
                    <img
                      src={thumb}
                      alt=""
                      class="h-10 w-10 shrink-0 rounded-[5px] bg-black object-cover"
                    />
                  {:else}
                    <div
                      aria-hidden="true"
                      class="flex h-10 w-10 shrink-0 items-center justify-center rounded-[5px] bg-black font-mono text-[10px] text-zinc-600"
                    >
                      —
                    </div>
                  {/if}
                  <span class="min-w-0 flex-1">
                    <span class="block truncate text-xs font-semibold text-zinc-100">
                      {series.label}
                    </span>
                    <span class="block truncate font-mono text-[10px] text-zinc-500">
                      {series.description} · {series.slices.length} img
                    </span>
                    {#if series.slices.length === 1}
                      <span class="block truncate font-mono text-[10px] text-zinc-600">
                        {series.slices[0]?.name ?? ''}
                      </span>
                    {/if}
                  </span>
                </button>
                <button
                  type="button"
                  class="absolute top-1 right-1 rounded bg-black/70 px-1 font-mono text-[10px] text-zinc-500 opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-300 focus-visible:opacity-100"
                  aria-label={`Hapus ${series.label}`}
                  onclick={() =>
                    onRemoveSeries(
                      series.slices
                        .map((sl) => sl.fileIndex)
                        .filter((x): x is number => x !== undefined)
                    )}
                >
                  ✕
                </button>
              </li>
            {/each}
          </ul>
        </li>
      {/each}
    </ul>
  {:else}
    <p class="p-2 text-xs text-zinc-500">
      Belum ada studi. Buka File/Folder atau seret file ke viewport.
    </p>
  {/if}
</section>
