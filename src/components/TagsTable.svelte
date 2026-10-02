<script lang="ts">
  import type { DicomTag } from '$lib/dicom';
  import { groupDicomTags } from '$lib/dicomGroups';

  let { tags, tone = 'light' }: { tags: DicomTag[]; tone?: 'light' | 'dark' } = $props();

  const dark = $derived(tone === 'dark');
  const groups = $derived(groupDicomTags(tags));
  let open: Record<string, boolean> = $state({ Pasien: true, Studi: true });

  function fmt(tag: string): string {
    return `${tag.slice(0, 4)},${tag.slice(4)}`;
  }
</script>

<section
  class={dark ? 'rounded-[12px] border border-white/10 bg-white/[0.03] p-4' : 'panel p-6'}
  aria-label="Tag DICOM"
>
  <h2
    class={dark
      ? 'mb-3 font-mono text-[10px] font-semibold tracking-widest text-zinc-500 uppercase'
      : 'panel-title mb-3'}
  >
    {`Tag DICOM (${tags.length})`}
  </h2>
  {#if tags.length > 0}
    <div class="slim-scroll max-h-72 overflow-auto">
      {#each groups as g (g.name)}
        <div
          class={dark
            ? 'border-b border-white/10 last:border-b-0'
            : 'border-b border-[#EAEAEA] last:border-b-0'}
        >
          <button
            type="button"
            class={dark
              ? 'flex w-full items-center justify-between py-2 text-left transition-colors hover:bg-white/5'
              : 'flex w-full items-center justify-between py-2 text-left transition-colors hover:bg-[#F7F6F3]'}
            aria-expanded={open[g.name] ?? false}
            onclick={() => (open = { ...open, [g.name]: !(open[g.name] ?? false) })}
          >
            <span
              class={dark
                ? 'font-mono text-[10px] font-semibold tracking-widest text-zinc-500 uppercase'
                : 'font-mono text-[10px] font-semibold tracking-widest text-[#787774] uppercase'}
            >
              {g.name} · {g.tags.length}
            </span>
            <span
              class={dark ? 'text-xs text-zinc-500' : 'text-xs text-[#787774]'}
              aria-hidden="true"
            >
              {(open[g.name] ?? false) ? '−' : '+'}
            </span>
          </button>
          {#if open[g.name] ?? false}
            <dl class="space-y-2 px-1 pb-3">
              {#each g.tags as t (t.tag)}
                <div>
                  <div class="flex items-baseline gap-1.5">
                    <span
                      class={dark
                        ? 'shrink-0 font-mono text-[9px] text-zinc-600'
                        : 'shrink-0 font-mono text-[9px] text-[#787774]'}
                    >
                      {fmt(t.tag)}
                    </span>
                    <span
                      class={dark
                        ? 'truncate text-[10px] text-zinc-400'
                        : 'truncate text-[10px] text-[#787774]'}
                    >
                      {t.name} · {t.vr}
                    </span>
                  </div>
                  <div
                    class={dark
                      ? 'mt-0.5 font-mono text-[11px] leading-snug break-all text-zinc-200'
                      : 'mt-0.5 font-mono text-[11px] leading-snug break-all text-[#111111]'}
                  >
                    {t.value}
                  </div>
                </div>
              {/each}
            </dl>
          {/if}
        </div>
      {/each}
    </div>
  {:else}
    <p class={dark ? 'text-sm text-zinc-500' : 'text-sm text-[#787774]'}>Belum ada tag.</p>
  {/if}
</section>
