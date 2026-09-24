<script lang="ts">
  import { fitPowerRegression, toMicroGy, toMicroGyPerMas } from '$lib/calibration';

  let { onFit }: { onFit: (a: number, b: number, r2: number) => void } = $props();

  interface Row {
    kvp: string;
    mas: string;
    mgy: string;
  }

  let rows: Row[] = $state(Array.from({ length: 6 }, () => ({ kvp: '', mas: '20', mgy: '' })));
  let computed: { ugy: string; perMas: string }[] = $state([]);
  let formula = $state('');
  let r2text = $state('');
  let error = $state('');

  function num(s: string): number | null {
    const v = parseFloat(s.replace(',', '.'));
    return Number.isFinite(v) ? v : null;
  }

  function hitung() {
    error = '';
    computed = rows.map((r) => {
      const mgy = num(r.mgy);
      const mas = num(r.mas);
      if (mgy === null) return { ugy: '—', perMas: '—' };
      const ugy = toMicroGy(mgy);
      const perMas = mas !== null ? toMicroGyPerMas(ugy, mas) : null;
      return {
        ugy: ugy.toFixed(4),
        perMas: perMas !== null ? perMas.toFixed(4) : '—'
      };
    });
  }

  function tampilkanRumus() {
    hitung();
    const points: { kvp: number; value: number }[] = [];
    rows.forEach((r, i) => {
      const kvp = num(r.kvp);
      const perMas = num(computed[i]?.perMas ?? '');
      if (kvp !== null && kvp > 0 && perMas !== null && perMas > 0) {
        points.push({ kvp, value: perMas });
      }
    });
    if (points.length < 2) {
      error = 'Klik "Hitung" dulu, minimal 2 baris dengan µGy/mAs valid.';
      return;
    }
    try {
      const reg = fitPowerRegression(points);
      onFit(reg.a, reg.b, reg.rSquared);
      formula = `y = ${reg.a.toFixed(6)} × kVp^${reg.b.toFixed(4)}`;
      r2text = `R² = ${reg.rSquared.toFixed(6)}`;
    } catch (e) {
      error = e instanceof Error ? e.message : 'Regresi gagal';
    }
  }

  function tambahBaris() {
    rows = [...rows, { kvp: '', mas: '20', mgy: '' }];
  }

  function hapusBaris() {
    if (rows.length > 0) rows = rows.slice(0, -1);
  }
</script>

<section class="panel p-6" aria-label="Data kalibrasi">
  <h2 class="panel-title">Data Kalibrasi</h2>
  <p class="mb-3 text-xs text-[#787774]">
    kVp &amp; mGy diisi manual. mAs default 20, bisa diubah.
  </p>

  <table class="w-full text-sm">
    <thead>
      <tr class="border-b border-[#EAEAEA] text-left">
        <th class="p-1.5 text-xs font-semibold">kVp</th>
        <th class="p-1.5 text-xs font-semibold">mAs</th>
        <th class="p-1.5 text-xs font-semibold">mGy</th>
        <th class="p-1.5 text-xs font-semibold">µGy</th>
        <th class="p-1.5 text-xs font-semibold">µGy/mAs</th>
      </tr>
    </thead>
    <tbody>
      {#each rows as r, i (i)}
        <tr class="border-b border-[#EAEAEA] last:border-0">
          <td class="p-1"
            ><input
              class="w-full border px-1"
              bind:value={r.kvp}
              inputmode="decimal"
              aria-label={`kVp baris ${i + 1}`}
            /></td
          >
          <td class="p-1"
            ><input
              class="w-full border px-1"
              bind:value={r.mas}
              inputmode="decimal"
              aria-label={`mAs baris ${i + 1}`}
            /></td
          >
          <td class="p-1"
            ><input
              class="w-full border px-1"
              bind:value={r.mgy}
              inputmode="decimal"
              aria-label={`mGy baris ${i + 1}`}
            /></td
          >
          <td class="p-1 font-mono">{computed[i]?.ugy ?? '—'}</td>
          <td class="p-1 font-mono">{computed[i]?.perMas ?? '—'}</td>
        </tr>
      {/each}
    </tbody>
  </table>

  <div class="mt-2 flex flex-wrap gap-2 text-sm">
    <button type="button" class="border px-2 py-1" onclick={tambahBaris}>+ Baris</button>
    <button type="button" class="border px-2 py-1" onclick={hapusBaris}>− Baris</button>
    <button type="button" class="toolbtn" onclick={hitung}>Hitung</button>
    <button type="button" class="btn-primary px-2 py-1 text-sm" onclick={tampilkanRumus}>
      Tampilkan Rumus Y
    </button>
  </div>

  {#if formula}
    <p
      class="mt-2 rounded-[6px] border border-[#EAEAEA] bg-[#F7F6F3] p-2 text-center font-mono font-bold text-[#111111]"
    >
      {formula}
    </p>
    <p class="text-center text-xs text-[#787774]">{r2text} — koefisien a dan b diperbarui</p>
  {/if}
  {#if error}
    <p role="alert" class="mt-2 text-sm text-[#9F2F2D]">{error}</p>
  {/if}
</section>
