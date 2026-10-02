<script lang="ts">
  import type { DicomTag } from '$lib/dicom';

  let { tags, tone = 'light' }: { tags: DicomTag[]; tone?: 'light' | 'dark' } = $props();
</script>

<section
  class={tone === 'dark'
    ? 'rounded-[12px] border border-white/10 bg-white/[0.03] p-4'
    : 'panel p-6'}
  aria-label="Tag DICOM"
>
  <h2
    class={tone === 'dark'
      ? 'mb-3 font-mono text-[10px] font-semibold tracking-widest text-zinc-500 uppercase'
      : 'panel-title mb-3'}
  >
    {`Tag DICOM (${tags.length})`}
  </h2>
  {#if tags.length > 0}
    <div class="slim-scroll max-h-64 overflow-auto">
      <table class="w-full font-mono text-xs">
        <thead class={tone === 'dark' ? 'sticky top-0 bg-[#141416]' : 'sticky top-0 bg-[#F7F6F3]'}>
          <tr class={tone === 'dark' ? 'border-b border-white/10' : 'border-b border-[#EAEAEA]'}>
            <th class="p-1.5 text-left font-sans text-xs font-semibold">Tag</th>
            <th class="p-1.5 text-left font-sans text-xs font-semibold">VR</th>
            <th class="p-1.5 text-left font-sans text-xs font-semibold">Nilai</th>
          </tr>
        </thead>
        <tbody class={tone === 'dark' ? 'text-zinc-300' : ''}>
          {#each tags as t (t.tag)}
            <tr
              class={tone === 'dark'
                ? 'border-b border-white/10 last:border-0'
                : 'border-b border-[#EAEAEA] last:border-0'}
            >
              <td class="p-1.5 whitespace-nowrap">{t.tag.slice(0, 4)},{t.tag.slice(4)}</td>
              <td class="p-1.5">{t.vr}</td>
              <td class="p-1.5 break-all">{t.value}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {:else}
    <p class={tone === 'dark' ? 'text-sm text-zinc-500' : 'text-sm text-[#787774]'}>
      Belum ada tag.
    </p>
  {/if}
</section>
