<script lang="ts">
  import ImageViewer from '$components/ImageViewer.svelte';
  import PatientCard from '$components/PatientCard.svelte';
  import TagsTable from '$components/TagsTable.svelte';
  import ViewerIcon from '$components/ViewerIcon.svelte';
  import {
    extractPixels,
    isDicomBuffer,
    listTags,
    parseDicom,
    renderGrayscale,
    type DicomTag
  } from '$lib/dicom';
  import { activeFile, type ActiveFile } from '$lib/session';

  let files: { name: string; buffer: ArrayBuffer; thumb: string | null }[] = $state([]);
  let selected = $state(0);
  let error = $state('');
  let dragging = $state(false);
  let zoomPct = $state(100);

  async function addFiles(list: FileList | File[]) {
    error = '';
    for (const f of Array.from(list)) {
      try {
        const buffer = await f.arrayBuffer();
        const thumb = await makeThumb(buffer);
        files.push({ name: f.name, buffer, thumb });
      } catch {
        error = `Gagal membaca ${f.name}`;
      }
    }
    files = [...files];
    if (files.length > 0) await select(Math.max(0, files.length - 1));
  }

  /** Thumbnail 56px untuk rel file (null bila gagal — rel tetap teks). */
  async function makeThumb(buffer: ArrayBuffer): Promise<string | null> {
    try {
      const src = document.createElement('canvas');
      if (isDicomBuffer(buffer)) {
        const px = extractPixels(buffer);
        src.width = px.width;
        src.height = px.height;
        const ctx = src.getContext('2d');
        if (!ctx) return null;
        ctx.putImageData(
          new ImageData(
            renderGrayscale(px.gray, px.width, px.height, px.invert),
            px.width,
            px.height
          ),
          0,
          0
        );
      } else {
        const bitmap = await createImageBitmap(new Blob([buffer]));
        src.width = bitmap.width;
        src.height = bitmap.height;
        const ctx = src.getContext('2d');
        if (!ctx) return null;
        ctx.drawImage(bitmap, 0, 0);
      }
      if (src.width <= 0 || src.height <= 0) return null;
      const scale = Math.min(1, 56 / Math.max(src.width, src.height));
      const thumb = document.createElement('canvas');
      thumb.width = Math.max(1, Math.round(src.width * scale));
      thumb.height = Math.max(1, Math.round(src.height * scale));
      thumb.getContext('2d')?.drawImage(src, 0, 0, thumb.width, thumb.height);
      return thumb.toDataURL('image/png');
    } catch {
      return null;
    }
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
    winWw = null;
    winWl = null;
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
        const entry: ActiveFile = {
          name: f.name,
          kind: 'dicom',
          image,
          metadata,
          raw: px.raw,
          invertPixels: px.invert
        };
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
  let winWw: number | null = $state(null);
  let winWl: number | null = $state(null);

  function onDrop(e: DragEvent) {
    e.preventDefault();
    dragging = false;
    if (e.dataTransfer?.files) void addFiles(e.dataTransfer.files);
  }

  /** Buka folder (Chromium/Edge): impor semua file citra di dalamnya. */
  async function openFolder() {
    error = '';
    const w = window as unknown as {
      showDirectoryPicker?: () => Promise<{
        values(): AsyncIterableIterator<{
          kind: string;
          name: string;
          getFile(): Promise<File>;
        }>;
      }>;
    };
    if (!w.showDirectoryPicker) {
      error = 'Browser ini tidak mendukung buka folder — gunakan Buka File.';
      return;
    }
    try {
      const dir = await w.showDirectoryPicker();
      const picked: File[] = [];
      for await (const entry of dir.values()) {
        if (entry.kind === 'file' && /\.(dcm|dicom|jpg|jpeg|png|bmp|tif|tiff)$/i.test(entry.name)) {
          picked.push(await entry.getFile());
        }
      }
      if (picked.length > 0) await addFiles(picked);
      else error = 'Tidak ada file citra di folder tersebut.';
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      error = 'Gagal membaca folder.';
    }
  }
</script>

<div class="px-3 py-3">
  <h1 class="sr-only">Browser</h1>

  <div class="grid gap-3 xl:grid-cols-[minmax(0,1fr)_340px]">
    <div class="min-w-0">
      <!-- Viewport -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div
        class={`rounded-[12px] border border-white/10 bg-black p-3 transition-colors ${dragging ? 'border-blue-500/60' : ''}`}
        ondragover={(e) => {
          e.preventDefault();
          dragging = true;
        }}
        ondragleave={() => (dragging = false)}
        ondrop={onDrop}
      >
        <ImageViewer
          image={current?.image ?? null}
          rawPixels={current?.raw ?? null}
          invertPixels={current?.invertPixels ?? false}
          pixelSpacingMm={meta?.pixelSpacingMm ?? null}
          onZoom={(p) => (zoomPct = p)}
          onWindow={(w, l) => {
            winWw = w;
            winWl = l;
          }}
          {fileActions}
        >
          {#snippet overlay()}
            {#if current}
              <span class="absolute top-2 left-2 space-y-px">
                <span class="block" style="color: rgba(255,255,255,0.9)"> Im: 1/1 · Se: 1 </span>
                <span class="block" style="color: rgba(255,255,255,0.6)">
                  {meta
                    ? meta.studyDescription || meta.bodyPartExamined || current.name
                    : current.name}
                </span>
              </span>
              <span class="absolute top-2 right-2 space-y-px text-right">
                <span class="block" style="color: rgba(255,255,255,0.9)">Radiology Reader</span>
                {#if meta}
                  <span class="block" style="color: rgba(255,255,255,0.6)">
                    {meta.patientId || '—'}
                  </span>
                  <span class="block" style="color: rgba(255,255,255,0.45)">
                    {meta.studyDate || ''}
                  </span>
                {/if}
              </span>
              <span class="absolute bottom-2 left-2 space-y-px">
                {#if winWw !== null && winWl !== null}
                  <span class="block" style="color: rgba(255,255,255,0.9)">
                    W: {Math.round(winWw)} L: {Math.round(winWl)}
                  </span>
                {/if}
                <span class="block" style="color: rgba(255,255,255,0.6)">
                  Zoom: {zoomPct}%
                </span>
              </span>
              <span class="absolute right-2 bottom-2 space-y-px text-right">
                <span class="block" style="color: rgba(255,255,255,0.9)">
                  {current.image.width} × {current.image.height}
                </span>
                <span class="block" style="color: rgba(255,255,255,0.6)">
                  {current.kind === 'dicom' ? 'DCM' : 'IMG'}
                </span>
              </span>
            {/if}
          {/snippet}
        </ImageViewer>
        {#if error}
          <p
            role="alert"
            class="mt-2 rounded-[6px] border border-red-500/20 bg-red-500/10 p-2 text-sm text-red-200"
          >
            {error}
          </p>
        {/if}
      </div>

      <!-- Filmstrip -->
      <section
        aria-label="Film"
        class="mt-3 rounded-[12px] border border-white/10 bg-white/[0.02] p-2"
      >
        {#if files.length > 0}
          <ul class="slim-scroll flex gap-2 overflow-x-auto">
            {#each files as f, i (f.name + i)}
              <li class="group relative w-28 shrink-0">
                <button
                  type="button"
                  onclick={() => void select(i)}
                  class={`block w-full rounded-[8px] border p-1.5 text-left transition-colors ${i === selected ? 'border-blue-500 bg-blue-600/10' : 'border-white/10 hover:border-white/25'}`}
                >
                  {#if f.thumb}
                    <img
                      src={f.thumb}
                      alt=""
                      class="h-16 w-full rounded-[5px] bg-black object-cover"
                    />
                  {:else}
                    <div
                      class="flex h-16 w-full items-center justify-center rounded-[5px] bg-black font-mono text-[10px] text-zinc-600"
                    >
                      —
                    </div>
                  {/if}
                  <span class="mt-1 block truncate font-mono text-[11px] text-zinc-200">
                    {i + 1}: {f.name}
                  </span>
                  <span class="block font-mono text-[10px] text-zinc-500">
                    {isDicomBuffer(f.buffer) ? 'DICOM' : 'gambar'}
                  </span>
                </button>
                <button
                  type="button"
                  class="absolute top-0.5 right-0.5 rounded bg-black/70 px-1 font-mono text-[10px] text-zinc-500 opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-300 focus-visible:opacity-100"
                  aria-label={`Hapus file ${i + 1}`}
                  onclick={() => void removeFile(i)}
                >
                  ✕
                </button>
              </li>
            {/each}
          </ul>
        {:else}
          <p class="p-2 text-xs text-zinc-500">
            Belum ada file. Buka File/Folder atau seret file ke viewport.
          </p>
        {/if}
      </section>
    </div>

    <!-- Info -->
    <div class="grid content-start gap-3">
      <PatientCard metadata={meta} />
      <TagsTable tags={currentTags} />
    </div>
  </div>
</div>

{#snippet fileActions()}
  <label
    class="flex cursor-pointer items-center gap-1.5 rounded-[6px] bg-blue-600 px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-blue-500"
    aria-label="Buka file"
  >
    <ViewerIcon name="image" class="h-3.5 w-3.5" />
    Buka File
    <input
      type="file"
      class="hidden"
      multiple
      accept=".dcm,.dicom,.jpg,.jpeg,.png,.bmp,.tiff,.tif"
      onchange={(e) => e.currentTarget.files && void addFiles(e.currentTarget.files)}
    />
  </label>
  <button
    type="button"
    class="flex items-center gap-1.5 rounded-[6px] px-2.5 py-1 text-xs text-zinc-400 transition-colors hover:bg-white/5 hover:text-zinc-100"
    title="Buka folder"
    onclick={openFolder}
  >
    <ViewerIcon name="folder" />
    <span class="hidden lg:inline">Folder</span>
  </button>
{/snippet}
