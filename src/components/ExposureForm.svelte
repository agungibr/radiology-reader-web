<script lang="ts">
  import { untrack } from 'svelte';
  import DrlBadge from '$components/DrlBadge.svelte';
  import { DEFAULT_BSF, calculateInakEsak } from '$lib/dose';
  import { assessDrl, type DrlResult } from '$lib/drl';
  import type { ActiveFile } from '$lib/session';

  let {
    file,
    coeffA = $bindable(0.0004),
    coeffB = $bindable(2.5917)
  }: {
    file: ActiveFile | null;
    coeffA?: number;
    coeffB?: number;
  } = $props();

  // Parent me-reset komponen per file via {#key}: nilai awal dibaca
  // sekali (sengaja, via untrack), selanjutnya milik form (editable).
  // `meta` untuk badge DICOM + submit tetap reaktif via $derived.
  const initial = untrack(() => file?.metadata ?? null);
  const meta = $derived(file?.metadata ?? null);
  let kvp: number | null = $state(initial?.kvp ?? null);
  let ma: number | null = $state(initial?.ma ?? null);
  let timeS: number | null = $state(initial?.exposureTimeS ?? null);
  let bsf = $state(DEFAULT_BSF);
  let dap: number | null = $state(initial?.dapMgyCm2 ?? null);

  const mas = $derived(ma !== null && timeS !== null ? ma * timeS : null);
  let result = $state<{ inak: number; esak: number; y: number } | null>(null);
  let drl: DrlResult | null = $state(null);
  let notice = $state('');
  let saving = $state(false);

  async function hitung() {
    notice = '';
    drl = null;
    result = null;
    if (kvp === null || kvp <= 0 || ma === null || ma <= 0 || timeS === null || timeS <= 0) {
      notice = 'kVp, mA, dan waktu harus lebih dari 0.';
      return;
    }
    const dose = calculateInakEsak({ kvp, ma, timeS, bsf, coeffA, coeffB });
    result = { inak: dose.inakMgy, esak: dose.esakMgy, y: dose.yMgy };
    drl = assessDrl({
      inak: dose.inakMgy,
      esak: dose.esakMgy,
      dap,
      studyDescription: meta?.studyDescription ?? '',
      bodyPartExamined: meta?.bodyPartExamined ?? '',
      viewPosition: meta?.viewPosition ?? '',
      patientAge: meta?.age ?? ''
    });

    saving = true;
    try {
      const res = await fetch('/api/history', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          patientId: meta?.patientId ?? '',
          patientName: meta?.patientName ?? '',
          gender: meta?.sex ?? '',
          age: meta?.age ?? '',
          weightKg: meta?.weightKg ?? null,
          examType: '',
          view: meta?.viewPosition ?? '',
          studyDescription: meta?.studyDescription ?? '',
          bodyPartExamined: meta?.bodyPartExamined ?? '',
          kvp,
          ma,
          timeS,
          bsf,
          coeffA,
          coeffB,
          dapMgyCm2: dap
        })
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        notice = `Hasil dihitung, tapi tidak tersimpan: ${body?.error ?? res.statusText}`;
      }
    } catch {
      notice = 'Hasil dihitung, tapi tidak tersimpan: server tidak terjangkau.';
    } finally {
      saving = false;
    }
  }
</script>

<section class="panel p-4" aria-label="Parameter eksposur">
  <h2 class="text-sm font-bold">Parameter Eksposur</h2>
  <p class="mb-2 text-xs text-slate-500">Otomatis dari DICOM atau isi manual.</p>

  <div class="grid max-w-xl grid-cols-[110px_1fr_auto] items-center gap-2 text-sm">
    <label for="kvp">kVp</label>
    <input id="kvp" type="number" class="border px-2 py-1" bind:value={kvp} min="0" step="0.1" />
    <span class="text-xs text-green-700">{meta?.kvp != null ? 'DICOM' : ''}</span>

    <label for="ma">mA</label>
    <input id="ma" type="number" class="border px-2 py-1" bind:value={ma} min="0" step="0.01" />
    <span class="text-xs text-green-700">{meta?.ma != null ? 'DICOM' : ''}</span>

    <label for="time">Waktu (s)</label>
    <input
      id="time"
      type="number"
      class="border px-2 py-1"
      bind:value={timeS}
      min="0"
      step="0.0001"
    />
    <span class="text-xs text-green-700">{meta?.exposureTimeS != null ? 'DICOM' : ''}</span>

    <span>mAs (mA × s)</span>
    <span class="tnum font-mono font-bold text-cyan-800"
      >{mas !== null ? `${mas.toFixed(4)} mAs` : '—'}</span
    >
    <span></span>

    <span>DAP DICOM</span>
    <span class="tnum font-mono font-bold text-slate-900">
      {dap !== null ? `${dap.toFixed(4)} mGy·cm²` : '—'}
    </span>
    <span></span>

    <label for="bsf">BSF</label>
    <input
      id="bsf"
      type="number"
      class="border px-2 py-1"
      bind:value={bsf}
      min="1"
      max="2"
      step="0.01"
    />
    <span></span>

    <label for="coefA">a (koefisien)</label>
    <input
      id="coefA"
      type="number"
      class="border px-2 py-1"
      bind:value={coeffA}
      min="0"
      step="0.000001"
    />
    <span></span>

    <label for="coefB">b (eksponen)</label>
    <input
      id="coefB"
      type="number"
      class="border px-2 py-1"
      bind:value={coeffB}
      min="0"
      step="0.0001"
    />
    <span></span>
  </div>

  <button
    type="button"
    class="btn-primary mt-3 w-full py-2 text-sm disabled:opacity-50"
    disabled={saving}
    onclick={hitung}
  >
    {saving ? 'Menyimpan…' : 'Hitung INAK dan ESAK'}
  </button>

  {#if result}
    <div class="mt-3 border-t pt-2">
      <p class="text-xs text-slate-500">INAK (Incident Air Kerma)</p>
      <p class="tnum font-mono text-xl font-bold">{result.inak.toFixed(6)} mGy</p>
      <p class="mt-1 text-xs text-slate-500">ESAK (Entrance Surface Air Kerma)</p>
      <p class="tnum font-mono text-2xl font-bold text-cyan-800">{result.esak.toFixed(6)} mGy</p>
    </div>
  {/if}

  {#if drl}
    <div class="mt-3 border-t pt-2 text-sm">
      <p class="font-bold">
        DRL Assessment — {drl.examination || '?'} ({drl.metric.toUpperCase() || '?'})
      </p>
      {#if drl.matched}
        <p class="text-xs text-slate-500">View: {drl.view} | Kelompok: {drl.ageGroupLabel}</p>
        {#if drl.metric === 'inak_esak'}
          <div class="mt-1 flex items-center gap-2">
            <span class="w-12 font-bold">INAK</span>
            <span class="font-mono">{result?.inak.toFixed(6)} mGy</span>
            <span class="text-xs text-slate-500">/ DRL {drl.drlInak} mGy</span>
            <DrlBadge status={drl.inakStatus ?? ''} />
          </div>
          <div class="mt-1 flex items-center gap-2">
            <span class="w-12 font-bold">ESAK</span>
            <span class="font-mono">{result?.esak.toFixed(6)} mGy</span>
            <span class="text-xs text-slate-500">/ DRL {drl.drlEsak} mGy</span>
            <DrlBadge status={drl.esakStatus ?? ''} />
          </div>
        {:else}
          <div class="mt-1 flex items-center gap-2">
            <span class="w-12 font-bold">DAP</span>
            <span class="font-mono">{dap !== null ? `${dap.toFixed(4)} mGy·cm²` : '—'}</span>
            <span class="text-xs text-slate-500">/ DRL {drl.drlDap} mGy·cm²</span>
            <DrlBadge status={drl.dapStatus ?? ''} />
          </div>
        {/if}
      {:else}
        <p class="text-xs text-slate-500 italic">{drl.message}</p>
      {/if}
    </div>
  {/if}

  {#if notice}
    <p role="alert" class="mt-2 text-sm text-red-700">{notice}</p>
  {/if}
</section>
