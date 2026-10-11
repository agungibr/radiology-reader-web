<script lang="ts">
  import { isDicomBuffer } from '$lib/dicom';

  export interface PanelFile {
    name: string;
    buffer: ArrayBuffer;
    thumb: string | null;
  }

  let {
    files,
    selected,
    onSelect,
    onRemove
  }: {
    files: PanelFile[];
    selected: number;
    onSelect: (i: number) => void;
    onRemove: (i: number) => void;
  } = $props();
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
  {#if files.length > 0}
    <ul class="slim-scroll mt-1 flex max-h-[60dvh] flex-col gap-1 overflow-y-auto">
      {#each files as f, i (f.name + i)}
        <li class="group relative shrink-0">
          <button
            type="button"
            onclick={() => onSelect(i)}
            class={`flex w-full items-center gap-2 rounded-[8px] border p-1.5 text-left transition-colors ${i === selected ? 'border-blue-500 bg-blue-600/10' : 'border-white/10 hover:border-white/25'}`}
          >
            {#if f.thumb}
              <img
                src={f.thumb}
                alt=""
                class="h-12 w-12 shrink-0 rounded-[5px] bg-black object-cover"
              />
            {:else}
              <div
                class="flex h-12 w-12 shrink-0 items-center justify-center rounded-[5px] bg-black font-mono text-[10px] text-zinc-600"
              >
                —
              </div>
            {/if}
            <span class="min-w-0 flex-1">
              <span class="block truncate font-mono text-[11px] text-zinc-200">
                {i + 1}: {f.name}
              </span>
              <span class="block font-mono text-[10px] text-zinc-500">
                {isDicomBuffer(f.buffer) ? 'DICOM' : 'gambar'}
              </span>
            </span>
          </button>
          <button
            type="button"
            class="absolute top-0.5 right-0.5 rounded bg-black/70 px-1 font-mono text-[10px] text-zinc-500 opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-300 focus-visible:opacity-100"
            aria-label={`Hapus file ${i + 1}`}
            onclick={() => onRemove(i)}
          >
            ✕
          </button>
        </li>
      {/each}
    </ul>
  {:else}
    <p class="p-2 text-xs text-zinc-500">
      Belum ada studi. Buka File/Folder atau seret file ke viewport.
    </p>
  {/if}
</section>
