<script lang="ts">
  import type { DicomMetadata } from '$lib/dicom';

  let { metadata }: { metadata: DicomMetadata | null } = $props();

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

<section class="panel p-4" aria-label="Data pasien">
  <h2 class="mb-2 text-sm font-bold">Data Pasien</h2>
  {#if metadata}
    <dl class="grid grid-cols-[110px_1fr] gap-y-1 text-sm">
      {#each rows as r (r.label)}
        <dt class="text-slate-500">{r.label}</dt>
        <dd>{r.get(metadata)}</dd>
      {/each}
    </dl>
  {:else}
    <p class="text-sm text-slate-500">Tidak ada metadata DICOM. Isi manual di halaman Dosimetri.</p>
  {/if}
</section>
