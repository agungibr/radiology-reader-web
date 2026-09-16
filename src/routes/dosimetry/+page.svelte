<script lang="ts">
  import CalibrationTable from '$components/CalibrationTable.svelte';
  import ExposureForm from '$components/ExposureForm.svelte';
  import { activeFile } from '$lib/session';

  let file = $state($activeFile);
  activeFile.subscribe((v) => (file = v));

  let coeffA = $state(0.0004);
  let coeffB = $state(2.5917);
</script>

<h1 class="text-lg font-bold">Dosimetri</h1>

{#key file?.name ?? 'tanpa-file'}
  <div class="mt-4 grid gap-4 lg:grid-cols-2">
    <ExposureForm {file} bind:coeffA bind:coeffB />
    <CalibrationTable
      onFit={(a, b) => {
        coeffA = a;
        coeffB = b;
      }}
    />
  </div>
{/key}

{#if !file}
  <p class="mt-4 border border-amber-300 bg-amber-50 p-2 text-sm">
    Belum ada file aktif. Buka gambar dulu di halaman Viewer agar parameter terisi otomatis — atau
    isi semua manual di atas.
  </p>
{/if}
