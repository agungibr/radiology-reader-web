<script lang="ts">
  import type { DicomTag } from '$lib/dicom';

  let { tags }: { tags: DicomTag[] } = $props();
</script>

<section class="panel p-4" aria-label="Tag DICOM">
  <h2 class="mb-2 text-sm font-bold">Tag DICOM ({tags.length})</h2>
  {#if tags.length > 0}
    <div class="max-h-64 overflow-auto">
      <table class="w-full font-mono text-xs">
        <thead class="sticky top-0 bg-slate-100">
          <tr>
            <th class="p-1 text-left">Tag</th>
            <th class="p-1 text-left">VR</th>
            <th class="p-1 text-left">Nilai</th>
          </tr>
        </thead>
        <tbody>
          {#each tags as t (t.tag)}
            <tr class="border-t">
              <td class="p-1 whitespace-nowrap">{t.tag.slice(0, 4)},{t.tag.slice(4)}</td>
              <td class="p-1">{t.vr}</td>
              <td class="p-1 break-all">{t.value}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {:else}
    <p class="text-sm text-slate-500">Belum ada tag.</p>
  {/if}
</section>
