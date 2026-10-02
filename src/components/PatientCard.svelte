<script lang="ts">
  import type { DicomMetadata } from '$lib/dicom';

  let { metadata, tone = 'light' }: { metadata: DicomMetadata | null; tone?: 'light' | 'dark' } =
    $props();

  const rows: { label: string; get: (m: DicomMetadata) => string }[] = [
    { label: 'ID Pasien', get: (m) => m.patientId || '—' },
    { label: 'Nama', get: (m) => m.patientName || '—' },
    { label: 'Jenis Kelamin', get: (m) => m.sex || '—' },
    { label: 'Umur', get: (m) => (m.age ? `${m.age} th` : '—') },
    { label: 'Tgl. Studi', get: (m) => m.studyDate || '—' },
    { label: 'Deskripsi Studi', get: (m) => m.studyDescription || '—' },
    { label: 'Modalitas', get: (m) => m.modality || '—' },
    { label: 'Bagian Tubuh', get: (m) => m.bodyPartExamined || '—' },
    { label: 'Proyeksi', get: (m) => m.viewPosition || '—' }
  ];
</script>

<section
  class={tone === 'dark'
    ? 'rounded-[12px] border border-white/10 bg-white/[0.03] p-4'
    : 'panel p-6'}
  aria-label="Data pasien"
>
  <h2
    class={tone === 'dark'
      ? 'mb-3 font-mono text-[10px] font-semibold tracking-widest text-zinc-500 uppercase'
      : 'panel-title mb-3'}
  >
    {tone === 'dark' ? 'PASIEN' : 'Data Pasien'}
  </h2>
  {#if metadata}
    <dl class="grid grid-cols-[110px_1fr] gap-y-1.5 text-sm">
      {#each rows as r (r.label)}
        <dt class={tone === 'dark' ? 'text-zinc-500' : 'text-[#787774]'}>{r.label}</dt>
        <dd class={tone === 'dark' ? 'text-zinc-100' : ''}>{r.get(metadata)}</dd>
      {/each}
    </dl>
  {:else}
    <p class={tone === 'dark' ? 'text-sm text-zinc-500' : 'text-sm text-[#787774]'}>
      Tidak ada metadata DICOM. Isi manual di halaman Dosimetri.
    </p>
  {/if}
</section>
