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

<div class="p-4">
  <h1 class="text-lg font-bold tracking-tight">Dosimetri</h1>
  <div class="mt-2">
    <button
      type="button"
      class="toolbtn"
      aria-pressed={showDap}
      onclick={() => (showDap = !showDap)}
    >
      {showDap ? 'Sembunyikan DAP' : 'Tampilkan DAP'}
    </button>
  </div>

  {#key file?.name ?? 'tanpa-file'}
    <div class={`mt-4 grid items-start gap-4 ${showDap ? 'lg:grid-cols-2' : ''}`}>
      <ExposureForm {file} bind:coeffA bind:coeffB />
      <div class="grid content-start gap-4">
        {#if showDap}
          <DapForm {file} />
        {/if}
        <DoseEstimateCard {file} />
      </div>
    </div>
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
    <p class="panel mt-4 border-amber-300 bg-amber-50 p-2 text-sm">
      Belum ada file aktif. Buka gambar dulu di halaman Viewer agar parameter terisi otomatis — atau
      isi semua manual di atas.
    </p>
  {/if}
</div>
