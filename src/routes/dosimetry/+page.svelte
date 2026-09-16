<script lang="ts">
  import CalibrationTable from '$components/CalibrationTable.svelte';
  import DapForm from '$components/DapForm.svelte';
  import DoseEstimateCard from '$components/DoseEstimateCard.svelte';
  import ExposureForm from '$components/ExposureForm.svelte';
  import { activeFile } from '$lib/session';

  let file = $state($activeFile);
  activeFile.subscribe((v) => (file = v));

  let coeffA = $state(0.0004);
  let coeffB = $state(2.5917);

  // Panel DAP hidden by default seperti desktop. Sengaja $state murni
  // (tanpa ?tab= di URL) agar toggle tidak me-reset input form.
  let showDap = $state(false);
</script>

<h1 class="text-lg font-bold">Dosimetri</h1>
<div class="mt-2">
  <button type="button" class="border px-3 py-1 text-sm" onclick={() => (showDap = !showDap)}>
    {showDap ? 'Sembunyikan DAP' : 'Tampilkan DAP'}
  </button>
</div>

{#key file?.name ?? 'tanpa-file'}
  {#if showDap}
    <div class="mt-4 grid items-start gap-4 lg:grid-cols-2">
      <ExposureForm {file} bind:coeffA bind:coeffB />
      <div class="grid content-start gap-4">
        <DapForm {file} />
        <DoseEstimateCard {file} />
      </div>
    </div>
  {:else}
    <div class="mt-4 grid items-start gap-4">
      <ExposureForm {file} bind:coeffA bind:coeffB />
      <DoseEstimateCard {file} />
    </div>
  {/if}
  <div class="mt-4">
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
