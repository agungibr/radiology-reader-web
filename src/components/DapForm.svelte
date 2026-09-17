<script lang="ts">
  import { untrack } from 'svelte';
  import DrlBadge from '$components/DrlBadge.svelte';
  import {
    DAP_DEFAULT_C1,
    DAP_DEFAULT_C2,
    DAP_DEFAULT_C3,
    calculateDap,
    type DapResult
  } from '$lib/dose';
  import { assessDrl, type DrlResult } from '$lib/drl';
  import type { ActiveFile } from '$lib/session';

  let { file }: { file: ActiveFile | null } = $props();

  const initial = untrack(() => file?.metadata ?? null);
  const meta = $derived(file?.metadata ?? null);
  const dicomDap = $derived(meta?.dapMgyCm2 ?? null);

  let kvp: number | null = $state(initial?.kvp ?? null);
  let ma: number | null = $state(initial?.ma ?? null);
  let timeS: number | null = $state(initial?.exposureTimeS ?? null);
  let sid = $state(100);
  let area = $state(625);
  let c1 = $state(DAP_DEFAULT_C1);
  let c2 = $state(DAP_DEFAULT_C2);
  let c3 = $state(DAP_DEFAULT_C3);

  const mas = $derived(ma !== null && timeS !== null ? ma * timeS : null);
  let result: DapResult | null = $state(null);
  let drl: DrlResult | null = $state(null);
  let notice = $state('');

  function hitung() {
    notice = '';
    result = null;
    drl = null;
    if (kvp === null || kvp <= 0 || mas === null || mas <= 0) {
      notice = 'kVp dan mAs harus lebih dari 0.';
      return;
    }
    result = calculateDap({ kvp, mas, sidCm: sid, fieldAreaCm2: area, c1, c2, c3 });
    drl = assessDrl({
      inak: null,
      esak: null,
      dap: dicomDap,
      studyDescription: meta?.studyDescription ?? '',
      bodyPartExamined: meta?.bodyPartExamined ?? '',
      viewPosition: meta?.viewPosition ?? '',
      patientAge: meta?.age ?? ''
    });
  }

  function resetKoef() {
    c1 = DAP_DEFAULT_C1;
    c2 = DAP_DEFAULT_C2;
    c3 = DAP_DEFAULT_C3;
  }
</script>

<section class="panel p-4" aria-label="Perhitungan DAP">
  <h2 class="text-sm font-bold">Parameter Geometri &amp; Koefisien</h2>

  <div class="mt-2 grid grid-cols-[130px_1fr] items-center gap-2 text-sm">
    <label for="dap-kvp">kVp</label>
    <input
      id="dap-kvp"
      type="number"
      class="border px-2 py-1"
      bind:value={kvp}
      min="0"
      step="0.1"
    />
    <label for="dap-mas">mAs (mA × s)</label>
    <span class="font-mono">{mas !== null ? mas.toFixed(4) : '—'}</span>
    <label for="dap-sid">SID (cm)</label>
    <input
      id="dap-sid"
      type="number"
      class="border px-2 py-1"
      bind:value={sid}
      min="10"
      step="0.1"
    />
    <label for="dap-area">Luas Lapangan (cm²)</label>
    <input
      id="dap-area"
      type="number"
      class="border px-2 py-1"
      bind:value={area}
      min="1"
      step="0.1"
    />
    <label for="dap-c1">c1 (kVp²)</label>
    <input id="dap-c1" type="number" class="border px-2 py-1" bind:value={c1} step="0.000001" />
    <label for="dap-c2">c2 (kVp)</label>
    <input id="dap-c2" type="number" class="border px-2 py-1" bind:value={c2} step="0.0001" />
    <label for="dap-c3">c3 (konstan)</label>
    <input id="dap-c3" type="number" class="border px-2 py-1" bind:value={c3} step="0.0001" />
  </div>

  <div class="mt-2 flex gap-2 text-sm">
    <button type="button" class="btn-primary flex-1 py-2 text-sm" onclick={hitung}>
      Hitung DAP
    </button>
    <button type="button" class="border px-2 py-2" onclick={resetKoef}>Reset Default</button>
  </div>

  {#if result}
    <div class="mt-3 border-t pt-2">
      <p class="text-xs text-slate-500">y kVp</p>
      <p class="font-mono font-bold">{result.yKvp.toFixed(6)}</p>
      <p class="mt-1 text-xs text-slate-500">IAK SDD (mGy)</p>
      <p class="font-mono font-bold">{result.iakSddMgy.toFixed(6)} mGy</p>
      <p class="mt-1 text-xs text-slate-500">IAK SID (mGy)</p>
      <p class="font-mono font-bold">{result.iakSidMgy.toFixed(6)} mGy</p>
      <p class="mt-1 text-xs text-slate-500">DAP (mGy·cm²)</p>
      <p class="tnum font-mono text-2xl font-bold text-cyan-800">
        {result.dapMgyCm2.toFixed(4)} mGy·cm²
      </p>
    </div>
  {/if}

  {#if drl}
    <div class="mt-3 border-t pt-2 text-sm">
      <p class="font-bold">DRL Assessment — DAP DICOM</p>
      {#if drl.matched && drl.metric === 'dap'}
        <p class="text-xs text-slate-500">
          {drl.examination} | View: {drl.view} | {drl.ageGroupLabel}
        </p>
        <div class="mt-1 flex items-center gap-2">
          <span class="font-mono">{dicomDap !== null ? `${dicomDap.toFixed(4)} mGy·cm²` : '—'}</span
          >
          <span class="text-xs text-slate-500">/ DRL {drl.drlDap} mGy·cm²</span>
          <DrlBadge status={drl.dapStatus ?? ''} />
        </div>
      {:else if drl.matched}
        <p class="text-xs text-slate-500">
          Pemeriksaan ini memakai batas INAK/ESAK — lihat panel INAK/ESAK.
        </p>
      {:else}
        <p class="text-xs text-slate-500 italic">{drl.message}</p>
        {#if dicomDap === null}
          <p class="text-xs text-slate-500 italic">DAP tidak ada di tag DICOM (0018,115E).</p>
        {/if}
      {/if}
    </div>
  {/if}

  {#if notice}
    <p role="alert" class="mt-2 text-sm text-red-700">{notice}</p>
  {/if}
</section>
