<script lang="ts">
  import type { DicomMetadata } from '$lib/dicom';

  let { metadata }: { metadata: DicomMetadata | null } = $props();

  const rows: { label: string; get: (m: DicomMetadata) => string }[] = [
    { label: 'Nama Pasien', get: (m) => m.patientName || '—' },
    { label: 'ID Pasien', get: (m) => m.patientId || '—' },
    {
      label: 'Tanggal Lahir',
      get: (m) => (m.birthDate ? `${m.birthDate}${m.age ? ` (${m.age} th)` : ''}` : '—')
    },
    { label: 'Jenis Kelamin', get: (m) => m.sex || '—' },
    { label: 'Modalitas', get: (m) => m.modality || '—' },
    { label: 'Tgl. Studi', get: (m) => m.studyDate || '—' },
    { label: 'Deskripsi Studi', get: (m) => m.studyDescription || '—' },
    { label: 'Bagian Tubuh', get: (m) => m.bodyPartExamined || '—' },
    { label: 'Proyeksi', get: (m) => m.viewPosition || '—' },
    { label: 'Institusi', get: (m) => m.institution || '—' }
  ];
</script>

<section class="rounded-[12px] border border-white/10 bg-white/[0.03] p-4" aria-label="Data pasien">
  <h2 class="mb-3 font-mono text-[10px] font-semibold tracking-widest text-zinc-500 uppercase">
    Informasi Pasien
  </h2>
  {#if metadata}
    <dl class="space-y-1.5 text-[13px]">
      {#each rows as r (r.label)}
        <div class="flex items-baseline gap-2">
          <dt class="w-28 shrink-0 truncate text-zinc-500">{r.label}</dt>
          <span class="shrink-0 text-zinc-600" aria-hidden="true">:</span>
          <dd class="min-w-0 flex-1 truncate text-zinc-100" title={r.get(metadata)}>
            {r.get(metadata)}
          </dd>
        </div>
      {/each}
    </dl>
  {:else}
    <p class="text-sm text-zinc-500">Tidak ada metadata DICOM. Isi manual di halaman Dosimetri.</p>
  {/if}
</section>
