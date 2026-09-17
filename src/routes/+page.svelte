<script lang="ts">
  import ImageViewer from '$components/ImageViewer.svelte';
  import PatientCard from '$components/PatientCard.svelte';
  import TagsTable from '$components/TagsTable.svelte';
  import {
    extractPixels,
    isDicomBuffer,
    listTags,
    parseDicom,
    renderGrayscale,
    type DicomTag
  } from '$lib/dicom';
  import { activeFile, type ActiveFile } from '$lib/session';

  let files: { name: string; buffer: ArrayBuffer }[] = $state([]);
  let selected = $state(0);
  let error = $state('');
  let dragging = $state(false);
  let query = $state('');
  let zoomPct = $state(100);

  const visible = $derived(
    files
      .map((f, i) => ({ f, i }))
      .filter(({ f }) => f.name.toLowerCase().includes(query.trim().toLowerCase()))
  );

  async function addFiles(list: FileList | File[]) {
    error = '';
    for (const f of Array.from(list)) {
      try {
        const buffer = await f.arrayBuffer();
        files.push({ name: f.name, buffer });
      } catch {
        error = `Gagal membaca ${f.name}`;
      }
    }
    files = [...files];
    if (files.length > 0) await select(Math.max(0, files.length - 1));
  }

  async function removeFile(i: number) {
    files = files.filter((_, j) => j !== i);
    if (files.length === 0) {
      selected = 0;
      activeFile.set(null);
      currentTags = [];
      return;
    }
    await select(Math.min(selected, files.length - 1));
  }

  async function select(i: number) {
    selected = i;
    error = '';
    const f = files[i];
    if (!f) {
      activeFile.set(null);
      return;
    }
    try {
      if (isDicomBuffer(f.buffer)) {
        const metadata = parseDicom(f.buffer);
        const px = extractPixels(f.buffer);
        const image = {
          data: renderGrayscale(px.gray, px.width, px.height, px.invert),
          width: px.width,
          height: px.height
        };
        const entry: ActiveFile = { name: f.name, kind: 'dicom', image, metadata };
        activeFile.set(entry);
        currentTags = listTags(f.buffer);
      } else {
        const entry = await loadRaster(f);
        if (files[selected] === f) {
          activeFile.set(entry);
          currentTags = [];
        }
      }
    } catch (e) {
      if (files[selected] !== f) return;
      activeFile.set(null);
      currentTags = [];
      error = e instanceof Error ? e.message : `Gagal memuat ${f.name}`;
    }
  }

  async function loadRaster(f: { name: string; buffer: ArrayBuffer }): Promise<ActiveFile> {
    const blob = new Blob([f.buffer]);
    const bitmap = await createImageBitmap(blob);
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Kanavs tidak tersedia');
    ctx.drawImage(bitmap, 0, 0);
    const img = ctx.getImageData(0, 0, bitmap.width, bitmap.height);
    return {
      name: f.name,
      kind: 'image',
      image: { data: img.data, width: img.width, height: img.height },
      metadata: null
    };
  }

  let currentTags: DicomTag[] = $state([]);
  let current = $state<ActiveFile | null>(null);
  activeFile.subscribe((v) => (current = v));

  const meta = $derived(current?.metadata ?? null);

  function onDrop(e: DragEvent) {
    e.preventDefault();
    dragging = false;
    if (e.dataTransfer?.files) void addFiles(e.dataTransfer.files);
  }
</script>

<div class="grid gap-3 p-4 lg:grid-cols-[264px_minmax(0,1fr)_320px]">
  <h1 class="sr-only">Viewer</h1>
  <!-- Browser ala MicroDicom -->
  <section class="panel content-start p-3" aria-label="Browser file">
    <h2 class="panel-title">Browser</h2>
    <label
      class="btn-primary mt-2 block cursor-pointer px-3 py-1.5 text-center text-sm"
      aria-label="Buka file"
    >
      Buka File
      <input
        type="file"
        class="hidden"
        multiple
        accept=".dcm,.dicom,.jpg,.jpeg,.png,.bmp,.tiff,.tif"
        onchange={(e) => e.currentTarget.files && void addFiles(e.currentTarget.files)}
      />
    </label>
    <input
      type="search"
      class="mt-2 w-full rounded border border-slate-300 px-2 py-1 text-sm"
      placeholder="Cari file…"
      aria-label="Cari file"
      bind:value={query}
    />
    <ul class="slim-scroll mt-2 max-h-72 overflow-auto text-sm">
      {#each visible as { f, i } (f.name + i)}
        <li class="group flex items-center gap-1">
          <button
            type="button"
            class={`w-full truncate rounded p-1.5 text-left transition-colors ${i === selected ? 'bg-cyan-700 font-semibold text-white' : 'hover:bg-slate-800'}`}
            onclick={() => void select(i)}
          >
            {f.name}
          </button>
          <button
            type="button"
            class="rounded px-1 text-slate-400 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-950 hover:text-red-300 focus-visible:opacity-100"
            aria-label={`Hapus ${f.name}`}
            onclick={() => void removeFile(i)}
          >
            ✕
          </button>
        </li>
      {/each}
    </ul>
    {#if files.length === 0}
      <p class="mt-2 text-xs text-slate-400">Seret file ke viewport atau klik Buka File.</p>
    {:else}
      <p class="tnum mt-2 font-mono text-[11px] text-slate-400">{files.length} file</p>
    {/if}
  </section>

  <!-- Viewport -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class={`rounded-lg border border-slate-800 bg-slate-900 p-3 transition-colors ${dragging ? 'border-cyan-400' : ''}`}
    ondragover={(e) => {
      e.preventDefault();
      dragging = true;
    }}
    ondragleave={() => (dragging = false)}
    ondrop={onDrop}
  >
    <ImageViewer image={current?.image ?? null} onZoom={(p) => (zoomPct = p)}>
      {#snippet overlay()}
        {#if current}
          <span class="absolute top-2 left-2">
            {meta ? `${meta.patientName || '—'} · ${meta.patientId || '—'}` : current.name}
          </span>
          {#if meta}
            <span class="absolute top-2 right-2 text-right">
              {meta.studyDescription || '—'}<br />{meta.studyDate || ''}
            </span>
            <span class="absolute bottom-2 left-2">
              Zoom {zoomPct}% · {current.image.width} × {current.image.height}
            </span>
            <span class="absolute right-2 bottom-2 text-right">
              {meta.modality || ''}{meta.viewPosition ? ` · ${meta.viewPosition}` : ''}
            </span>
          {:else}
            <span class="absolute bottom-2 left-2">
              Zoom {zoomPct}% · {current.image.width} × {current.image.height}
            </span>
          {/if}
        {/if}
      {/snippet}
    </ImageViewer>
    {#if error}
      <p
        role="alert"
        class="mt-2 rounded border border-red-800 bg-red-950 p-2 text-sm text-red-200"
      >
        {error}
      </p>
    {/if}
    <p class="tnum mt-2 font-mono text-[11px] text-slate-400">
      {current
        ? `${current.name} · ${current.kind === 'dicom' ? `DICOM · ${currentTags.length} tag` : 'gambar'}`
        : 'Siap'}
    </p>
  </div>

  <!-- Info -->
  <div class="grid content-start gap-3">
    <PatientCard metadata={meta} />
    <TagsTable tags={currentTags} />
  </div>
</div>
