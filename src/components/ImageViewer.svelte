<script lang="ts">
  import ViewerIcon from '$components/ViewerIcon.svelte';

  /** Alat aktif tunggal ala PACS. Window/ruler diisi Tugas 5-6. */
  export type ViewerTool = 'window' | 'pan' | 'zoom' | 'ruler';

  let {
    image,
    alt = 'Citra radiologi',
    onZoom,
    overlay
  }: {
    image: { data: Uint8ClampedArray; width: number; height: number } | null;
    alt?: string;
    onZoom?: (percent: number) => void;
    overlay?: import('svelte').Snippet;
  } = $props();

  let canvas: HTMLCanvasElement | null = $state(null);
  let frame: HTMLDivElement | null = $state(null);
  let zoom = $state(1);
  let offsetX = $state(0);
  let offsetY = $state(0);
  let dragging = $state(false);
  let lastX = 0;
  let lastY = 0;
  let tool: ViewerTool = $state('pan');
  let invertView = $state(false);
  let zoomBase = 1;

  const MIN_ZOOM = 0.15;
  const MAX_ZOOM = 8;

  const tools: { id: ViewerTool; label: string }[] = [
    { id: 'window', label: 'W/L' },
    { id: 'pan', label: 'Pan' },
    { id: 'zoom', label: 'Zoom' },
    { id: 'ruler', label: 'Ruler' }
  ];

  function draw() {
    onZoom?.(Math.round(zoom * 100));
    if (!canvas || !image) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const putW = Math.max(1, Math.round(image.width * zoom));
    const putH = Math.max(1, Math.round(image.height * zoom));
    canvas.width = putW;
    canvas.height = putH;
    const off = document.createElement('canvas');
    off.width = image.width;
    off.height = image.height;
    const offCtx = off.getContext('2d');
    if (!offCtx) return;
    offCtx.putImageData(new ImageData(image.data, image.width, image.height), 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(off, offsetX, offsetY, putW, putH);
  }

  function resetView() {
    fit();
    invertView = false;
  }

  function zoomBy(factor: number) {
    zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom * factor));
    draw();
  }

  function fit() {
    if (!frame || !image) return;
    const r = frame.getBoundingClientRect();
    zoom = Math.min(
      MAX_ZOOM,
      Math.max(MIN_ZOOM, Math.min((r.width - 24) / image.width, (r.height - 24) / image.height))
    );
    offsetX = 0;
    offsetY = 0;
    draw();
  }

  function onWheel(e: WheelEvent) {
    e.preventDefault();
    zoomBy(e.deltaY < 0 ? 1.15 : 1 / 1.15);
  }

  function onPointerDown(e: PointerEvent) {
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
    zoomBase = zoom;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: PointerEvent) {
    if (!dragging) return;
    if (tool === 'pan') {
      offsetX += e.clientX - lastX;
      offsetY += e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      draw();
    } else if (tool === 'zoom') {
      zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoomBase - (e.clientY - lastY) * 0.01));
      draw();
    }
    // window/ruler diisi Tugas 5-6.
  }

  function onPointerUp() {
    dragging = false;
  }

  function cursor(): string {
    if (tool === 'pan') return dragging ? 'grabbing' : 'grab';
    if (tool === 'zoom') return 'zoom-in';
    return 'crosshair';
  }

  $effect(() => {
    // draw() membaca `image`, jadi efek jalan ulang tiap gambar berganti.
    // Seperti MicroDicom: fit-to-window saat gambar dibuka.
    if (image) fit();
    else draw();
  });
</script>

{#if image}
  <div class="flex flex-wrap items-center gap-1" role="toolbar" aria-label="Alat viewport">
    <div
      class="inline-flex rounded-[6px] border border-white/10 bg-white/[0.03] p-0.5"
      role="radiogroup"
      aria-label="Alat"
    >
      {#each tools as t (t.id)}
        <button
          type="button"
          role="radio"
          aria-checked={tool === t.id}
          title={t.label}
          class={`flex items-center gap-1.5 rounded-[5px] px-2.5 py-1 text-xs transition-colors ${tool === t.id ? 'bg-zinc-100 font-semibold text-black' : 'text-zinc-400 hover:text-zinc-100'}`}
          onclick={() => (tool = t.id)}
        >
          <ViewerIcon name={t.id} />
          <span class="hidden lg:inline">{t.label}</span>
        </button>
      {/each}
    </div>
    <span class="tnum w-14 text-center font-mono text-xs text-zinc-300"
      >{Math.round(zoom * 100)}%</span
    >
    <span class="mx-1 h-5 w-px bg-white/10" aria-hidden="true"></span>
    <button
      type="button"
      class={`rounded-[5px] p-1.5 transition-colors ${invertView ? 'bg-zinc-100 text-black' : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-100'}`}
      aria-pressed={invertView}
      title="Invert"
      onclick={() => (invertView = !invertView)}
    >
      <ViewerIcon name="invert" />
    </button>
    <button
      type="button"
      class="rounded-[5px] p-1.5 text-zinc-400 transition-colors hover:bg-white/5 hover:text-zinc-100"
      title="Fit"
      onclick={fit}
    >
      <ViewerIcon name="fit" />
    </button>
    <button
      type="button"
      class="rounded-[5px] p-1.5 text-zinc-400 transition-colors hover:bg-white/5 hover:text-zinc-100"
      title="Reset"
      onclick={resetView}
    >
      <ViewerIcon name="reset" />
    </button>
  </div>
{/if}
<div
  bind:this={frame}
  class="slim-scroll relative mt-2 flex items-center justify-center overflow-auto rounded-[12px] border border-[#EAEAEA] bg-black"
  style="min-height: 320px; max-height: calc(100dvh - 16rem);"
>
  {#if overlay}
    <div class="viewport-overlay pointer-events-none absolute inset-0 z-10 p-2">
      {@render overlay()}
    </div>
  {/if}
  {#if image}
    <figure class="m-0 p-3">
      <figcaption class="sr-only">{alt} — {image.width} × {image.height}</figcaption>
      <canvas
        bind:this={canvas}
        style={`cursor: ${cursor()};${invertView ? ' filter: invert(1);' : ''}`}
        onwheel={onWheel}
        onpointerdown={onPointerDown}
        onpointermove={onPointerMove}
        onpointerup={onPointerUp}
      ></canvas>
    </figure>
  {:else}
    <p class="p-6 text-center text-sm text-zinc-500">
      Belum ada gambar.<br />Buka file DICOM atau gambar dari panel Browser.
    </p>
  {/if}
</div>
