<script lang="ts">
  import ViewerIcon from '$components/ViewerIcon.svelte';
  import type { DicomTag } from '$lib/dicom';
  import { filterDicomTags, pageWindow } from '$lib/dicomGroups';

  let {
    tags,
    variant = 'full',
    pageSize = 15
  }: {
    tags: DicomTag[];
    /** ringkas: 8 baris pertama tanpa cari/paginasi; penuh: cari + VR + paginasi. */
    variant?: 'summary' | 'full';
    pageSize?: number;
  } = $props();

  const PAGE_SIZES = [15, 25, 50, 100];
  let query = $state('');
  let page = $state(1);
  let sizeOverride: number | null = $state(null);
  const size = $derived(sizeOverride ?? pageSize);

  const filtered = $derived(filterDicomTags(tags, query));
  const pages = $derived(Math.max(1, Math.ceil(filtered.length / size)));
  const safePage = $derived(Math.min(page, pages));
  const fullRows = $derived(filtered.slice((safePage - 1) * size, safePage * size));
  const rows = $derived(variant === 'summary' ? filtered.slice(0, 8) : fullRows);

  function fmt(tag: string): string {
    return `${tag.slice(0, 4)},${tag.slice(4)}`;
  }

  // Kembali ke halaman 1 saat kueri, ukuran halaman, atau file berganti.
  let lastKey = '';
  $effect(() => {
    const key = `${query}|${size}|${tags.length}`;
    if (key !== lastKey) {
      lastKey = key;
      page = 1;
    }
  });
</script>

{#if variant === 'summary'}
  {#if tags.length > 0}
    <table class="w-full table-fixed text-xs">
      <colgroup><col class="w-20" /><col class="w-32" /><col /></colgroup>
      <tbody class="font-mono">
        {#each rows as t (t.tag)}
          <tr class="border-b border-white/10 last:border-0">
            <td class="p-1.5 whitespace-nowrap text-zinc-500">{fmt(t.tag)}</td>
            <td class="truncate p-1.5 text-zinc-300" title={t.name}>{t.name}</td>
            <td class="truncate p-1.5 text-zinc-100" title={t.value}>{t.value}</td>
          </tr>
        {/each}
      </tbody>
    </table>
    <p class="tnum mt-1 px-1 font-mono text-[11px] text-zinc-500">
      Total: {filtered.length} tag
    </p>
  {:else}
    <p class="p-2 text-xs text-zinc-500">Belum ada tag.</p>
  {/if}
{:else}
  <section
    class="min-w-0 rounded-[12px] border border-white/10 bg-white/[0.03] p-4"
    aria-label="Tag DICOM"
  >
    <div class="mb-2 flex items-center gap-2">
      <h2 class="font-mono text-[10px] font-semibold tracking-widest text-zinc-500 uppercase">
        DICOM Tags
      </h2>
      <label class="relative ml-auto block w-36">
        <span class="sr-only">Cari tag</span>
        <ViewerIcon
          name="search"
          class="pointer-events-none absolute top-1/2 left-2 h-3 w-3 -translate-y-1/2 text-zinc-500"
        />
        <input
          type="search"
          class="w-full rounded-[6px] border border-white/10 bg-white/5 py-1 pr-2 pl-7 text-xs text-zinc-100 [color-scheme:dark] placeholder:text-zinc-600"
          placeholder="Cari tag…"
          bind:value={query}
        />
      </label>
    </div>
    {#if tags.length > 0}
      <div class="slim-scroll max-h-80 overflow-auto">
        <table class="w-full table-fixed text-xs">
          <colgroup><col class="w-24" /><col class="w-44" /><col class="w-14" /><col /></colgroup>
          <thead class="sticky top-0 bg-[#141416]">
            <tr class="border-b border-white/10 text-left">
              <th class="p-1.5 font-sans font-semibold whitespace-nowrap text-zinc-400">Tag</th>
              <th class="p-1.5 font-sans font-semibold whitespace-nowrap text-zinc-400">Nama Tag</th
              >
              <th class="p-1.5 font-sans font-semibold whitespace-nowrap text-zinc-400">VR</th>
              <th class="p-1.5 font-sans font-semibold text-zinc-400">Nilai</th>
            </tr>
          </thead>
          <tbody class="font-mono">
            {#each rows as t (t.tag)}
              <tr class="border-b border-white/10 last:border-0">
                <td class="p-1.5 whitespace-nowrap text-zinc-500">{fmt(t.tag)}</td>
                <td class="truncate p-1.5 text-zinc-300" title={t.name}>{t.name}</td>
                <td class="p-1.5 whitespace-nowrap text-zinc-500">{t.vr || '—'}</td>
                <td class="truncate p-1.5 text-zinc-100" title={t.value}>{t.value}</td>
              </tr>
            {/each}
          </tbody>
        </table>
        {#if filtered.length === 0}
          <p class="p-3 text-center text-xs text-zinc-500">Tidak ada tag yang cocok.</p>
        {/if}
      </div>
      <div class="mt-2 flex items-center gap-1.5 overflow-x-auto">
        <span class="tnum mr-auto font-mono text-[11px] whitespace-nowrap text-zinc-500">
          Total: {filtered.length} tag
        </span>
        <span class="flex items-center gap-1" role="group" aria-label="Baris per halaman">
          {#each PAGE_SIZES as n (n)}
            <button
              type="button"
              class={`rounded-[5px] px-1.5 py-0.5 font-mono text-[11px] transition-colors ${n === size ? 'bg-blue-600 font-bold text-white' : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-100'}`}
              aria-pressed={n === size}
              aria-label={`${n} baris per halaman`}
              onclick={() => (sizeOverride = n)}
            >
              {n}
            </button>
          {/each}
        </span>
        <button
          type="button"
          class="rounded-[5px] border border-white/10 px-1.5 py-0.5 font-mono text-[11px] text-zinc-400 transition-colors hover:bg-white/5 hover:text-zinc-100 disabled:opacity-40"
          disabled={safePage <= 1}
          aria-label="Halaman sebelumnya"
          onclick={() => (page = safePage - 1)}
        >
          <ViewerIcon name="chevL" class="h-3 w-3" />
        </button>
        {#each pageWindow(safePage, pages) as p, i (i)}
          {#if p === '…'}
            <span class="px-0.5 font-mono text-[11px] text-zinc-600">…</span>
          {:else}
            <button
              type="button"
              class={`rounded-[5px] px-1.5 py-0.5 font-mono text-[11px] transition-colors ${p === safePage ? 'bg-blue-600 font-bold text-white' : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-100'}`}
              aria-current={p === safePage ? 'page' : undefined}
              aria-label={`Halaman ${p}`}
              onclick={() => (page = p)}
            >
              {p}
            </button>
          {/if}
        {/each}
        <button
          type="button"
          class="rounded-[5px] border border-white/10 px-1.5 py-0.5 font-mono text-[11px] text-zinc-400 transition-colors hover:bg-white/5 hover:text-zinc-100 disabled:opacity-40"
          disabled={safePage >= pages}
          aria-label="Halaman berikutnya"
          onclick={() => (page = safePage + 1)}
        >
          <ViewerIcon name="chevR" class="h-3 w-3" />
        </button>
      </div>
    {:else}
      <p class="text-sm text-zinc-500">Belum ada tag.</p>
    {/if}
  </section>
{/if}
