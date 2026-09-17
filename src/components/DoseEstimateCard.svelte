<script lang="ts">
  import { untrack } from 'svelte';
  import { estimateEffectiveDose, getDoseComparison } from '$lib/dose';
  import type { ActiveFile } from '$lib/session';

  let { file }: { file: ActiveFile | null } = $props();

  const initial = untrack(() => file?.metadata ?? null);
  let weight = $state(initial?.weightKg ?? 70);
  let examType = $state(normalizeExam(initial?.studyDescription ?? ''));

  /** Normalisasi seperti desktop: kapital, non-alnum → underscore. */
  function normalizeExam(s: string): string {
    const n = (s || 'DEFAULT')
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
    return n || 'DEFAULT';
  }

  let dose: number | null = $state(null);
  let compare = $state('');

  function hitung() {
    const ageNum = parseInt(String(initial?.age ?? '').replace(/\D/g, '') || '30', 10);
    const gender = (initial?.sex ?? '').toUpperCase().startsWith('F')
      ? 'F'
      : (initial?.sex ?? '').toUpperCase().startsWith('M')
        ? 'M'
        : 'O';
    const r = estimateEffectiveDose({
      age: ageNum,
      gender,
      weightKg: weight ?? 70,
      examType: normalizeExam(examType)
    });
    dose = r.estimatedDoseMSv;
    const c = getDoseComparison(r.estimatedDoseMSv);
    compare = `~ ${c.equivalentChestXrays} chest X-ray (${c.equivalentDaysOfBackground} hari background)`;
  }
</script>

<section class="panel p-4" aria-label="Estimasi dosis">
  <h2 class="text-sm font-bold">Estimasi Dosis (mSv)</h2>
  <p class="mb-2 text-xs text-slate-500">Gambaran sederhana, bukan pengganti kalibrasi klinis.</p>

  <div class="grid grid-cols-[110px_1fr] items-center gap-2 text-sm">
    <label for="est-bb">Berat (kg)</label>
    <input
      id="est-bb"
      type="number"
      class="border px-2 py-1"
      bind:value={weight}
      min="1"
      step="0.1"
    />
    <label for="est-exam">Pemeriksaan</label>
    <input id="est-exam" type="text" class="border px-2 py-1" bind:value={examType} />
  </div>

  <button type="button" class="mt-2 w-full border py-2 text-sm font-bold" onclick={hitung}>
    Hitung Estimasi
  </button>

  {#if dose !== null}
    <p class="mt-2 font-mono text-2xl font-bold">{dose.toFixed(2)} mSv</p>
    <p class="text-xs text-slate-500">{compare}</p>
  {/if}
</section>
