<script lang="ts">
  import type { DicomTag } from '$lib/dicom';

  let { tags }: { tags: DicomTag[] } = $props();
</script>

<section class="panel p-6" aria-label="Tag DICOM">
  <h2 class="panel-title mb-3">Tag DICOM ({tags.length})</h2>
  {#if tags.length > 0}
    <div class="slim-scroll max-h-64 overflow-auto">
      <table class="w-full font-mono text-xs">
        <thead class="sticky top-0 bg-[#F7F6F3]">
          <tr class="border-b border-[#EAEAEA]">
            <th class="p-1.5 text-left font-sans text-xs font-semibold">Tag</th>
            <th class="p-1.5 text-left font-sans text-xs font-semibold">VR</th>
            <th class="p-1.5 text-left font-sans text-xs font-semibold">Nilai</th>
          </tr>
        </thead>
        <tbody>
          {#each tags as t (t.tag)}
            <tr class="border-b border-[#EAEAEA] last:border-0">
              <td class="p-1.5 whitespace-nowrap">{t.tag.slice(0, 4)},{t.tag.slice(4)}</td>
              <td class="p-1.5">{t.vr}</td>
              <td class="p-1.5 break-all">{t.value}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {:else}
    <p class="text-sm text-[#787774]">Belum ada tag.</p>
  {/if}
</section>
