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
    if (files.length > 0) select(Math.max(0, files.length - 1));
  }

  function select(i: number) {
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
        void loadRaster(f).then((entry) => {
          if (files[selected] === f) {
            activeFile.set(entry);
            currentTags = [];
          }
        });
      }
    } catch (e) {
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

  function onDrop(e: DragEvent) {
    e.preventDefault();
    dragging = false;
    if (e.dataTransfer?.files) void addFiles(e.dataTransfer.files);
  }
</script>

<h1 class="text-lg font-bold">Viewer</h1>

<div class="mt-4 grid gap-4 lg:grid-cols-[220px_1fr_300px]">
  <section class="border bg-white p-4" aria-label="Daftar file">
    <h2 class="mb-2 text-sm font-bold">File</h2>
    <label class="block cursor-pointer border bg-gray-50 p-2 text-center text-sm hover:bg-gray-100">
      📂 Buka File
      <input
        type="file"
        class="hidden"
        multiple
        accept=".dcm,.dicom,.jpg,.jpeg,.png,.bmp,.tiff,.tif"
        onchange={(e) => e.currentTarget.files && void addFiles(e.currentTarget.files)}
      />
    </label>
    <ul class="mt-2 max-h-72 overflow-auto text-sm">
      {#each files as f, i (f.name + i)}
        <li>
          <button
            type="button"
            class={`w-full truncate p-1 text-left hover:bg-gray-100 ${i === selected ? 'bg-blue-600 text-white' : ''}`}
            onclick={() => select(i)}
          >
            {f.name}
          </button>
        </li>
      {/each}
    </ul>
    {#if files.length === 0}
      <p class="mt-2 text-xs text-gray-500">Seret file ke area viewer atau klik Buka File.</p>
    {/if}
  </section>

  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    ondragover={(e) => {
      e.preventDefault();
      dragging = true;
    }}
    ondragleave={() => (dragging = false)}
    ondrop={onDrop}
    class={dragging ? 'outline outline-blue-500' : ''}
  >
    <ImageViewer image={current?.image ?? null} />
    {#if error}
      <p role="alert" class="mt-2 border border-red-300 bg-red-50 p-2 text-sm text-red-700">
        {error}
      </p>
    {/if}
  </div>

  <div class="grid content-start gap-4">
    <PatientCard metadata={current?.metadata ?? null} />
    <TagsTable tags={currentTags} />
  </div>
</div>
