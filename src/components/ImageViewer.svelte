<script lang="ts">
  import ViewerIcon from '$components/ViewerIcon.svelte';
  import { applyWindow, defaultWindow, renderGrayscale } from '$lib/dicom';
  import { measureDistance } from '$lib/measure';

  /** Alat aktif tunggal ala PACS. */
  export type ViewerTool = 'window' | 'pan' | 'zoom' | 'ruler';

  interface RulerMark {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    label: string;
  }

  let {
    image,
    rawPixels = null,
    invertPixels = false,
    pixelSpacingMm = null,
    alt = 'Citra radiologi',
    onZoom,
    onWindow,
    overlay,
    fileActions
  }: {
    image: { data: Uint8ClampedArray; width: number; height: number } | null;
    rawPixels?: Float64Array | null;
    invertPixels?: boolean;
    pixelSpacingMm?: number | null;
    alt?: string;
    onZoom?: (percent: number) => void;
    onWindow?: (ww: number, wl: number) => void;
    overlay?: import('svelte').Snippet;
    fileActions?: import('svelte').Snippet;
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
  let wc = $state(0);
  let ww = $state(1);
  let winRange = 255;
  let winBaseW = 1;
  let winBaseL = 0;
  let prevImage: typeof image = null;
  let prevRaw: Float64Array | null = null;
  let rulers: RulerMark[] = $state([]);
  let rulerStart: { x: number; y: number } | null = $state(null);
  let mousePx: { x: number; y: number } | null = $state(null);
  let downPx: { x: number; y: number } | null = null;
  let viewW = $state(0);
  let viewH = $state(0);

  const MIN_ZOOM = 0.15;
  const MAX_ZOOM = 8;

  const tools: { id: ViewerTool; label: string }[] = [
    { id: 'window', label: 'Window/Level' },
    { id: 'pan', label: 'Pan' },
    { id: 'zoom', label: 'Zoom' },
    { id: 'ruler', label: 'Measure' }
  ];
  let rotation = $state(0);

  function draw() {
    onZoom?.(Math.round(zoom * 100));
    if (!canvas || !image) return;
    const base = currentRgba();
    const rot = ((rotation % 360) + 360) % 360;
    const swap = rot === 90 || rot === 270;
    const putW = Math.max(1, Math.round((swap ? base.height : base.width) * zoom));
    const putH = Math.max(1, Math.round((swap ? base.width : base.height) * zoom));
    canvas.width = putW;
    canvas.height = putH;
    viewW = putW;
    viewH = putH;
    const off = document.createElement('canvas');
    off.width = base.width;
    off.height = base.height;
    const offCtx = off.getContext('2d');
    if (!offCtx) return;
    offCtx.putImageData(new ImageData(base.data, base.width, base.height), 0, 0);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = true;
    ctx.save();
    ctx.translate(putW / 2 + offsetX, putH / 2 + offsetY);
    ctx.rotate((rot * Math.PI) / 180);
    ctx.drawImage(
      off,
      (-base.width * zoom) / 2,
      (-base.height * zoom) / 2,
      base.width * zoom,
      base.height * zoom
    );
    ctx.restore();
  }

  /** RGBA aktif: windowing ulang saat piksel mentah tersedia. */
  function currentRgba(): { data: Uint8ClampedArray; width: number; height: number } {
    if (!image) throw new Error('Tidak ada gambar');
    if (rawPixels && rawPixels.length === image.width * image.height) {
      const gray = applyWindow(rawPixels, wc, ww);
      return {
        data: renderGrayscale(gray, image.width, image.height, invertPixels),
        width: image.width,
        height: image.height
      };
    }
    return image;
  }

  function resetWindow() {
    if (rawPixels && rawPixels.length > 0) {
      const d = defaultWindow(rawPixels);
      wc = d.center;
      ww = d.width;
      winRange = d.width > 0 ? d.width : 1;
      onWindow?.(ww, wc);
    }
  }

  function resetView() {
    resetWindow();
    fit();
    invertView = false;
    rotation = 0;
    rulers = [];
    rulerStart = null;
    mousePx = null;
  }

  function oneToOne() {
    zoom = 1;
    offsetX = 0;
    offsetY = 0;
    draw();
  }

  function rotate() {
    rotation = (rotation + 90) % 360;
    offsetX = 0;
    offsetY = 0;
    rulers = [];
    rulerStart = null;
    mousePx = null;
    draw();
  }

  function toggleFullscreen() {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void frame?.requestFullscreen();
  }

  function zoomBy(factor: number) {
    zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom * factor));
    draw();
  }

  function fit() {
    if (!frame || !image) return;
    const swap = rotation === 90 || rotation === 270;
    const effW = swap ? image.height : image.width;
    const effH = swap ? image.width : image.height;
    const r = frame.getBoundingClientRect();
    zoom = Math.min(
      MAX_ZOOM,
      Math.max(MIN_ZOOM, Math.min((r.width - 24) / effW, (r.height - 24) / effH))
    );
    offsetX = 0;
    offsetY = 0;
    draw();
  }

  function onWheel(e: WheelEvent) {
    e.preventDefault();
    zoomBy(e.deltaY < 0 ? 1.15 : 1 / 1.15);
  }

  /** Titik dalam piksel kanvas (CSS == piksel atribut, tanpa skala CSS). */
  function canvasPoint(e: PointerEvent): { x: number; y: number } {
    return { x: e.offsetX, y: e.offsetY };
  }

  function onPointerDown(e: PointerEvent) {
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
    zoomBase = zoom;
    winBaseW = ww;
    winBaseL = wc;
    downPx = tool === 'ruler' ? canvasPoint(e) : null;
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
    } else if (tool === 'window' && rawPixels) {
      const step = winRange / 300;
      ww = Math.max(1e-6, winBaseW + (e.clientX - lastX) * step);
      wc = winBaseL - (e.clientY - lastY) * step;
      onWindow?.(ww, wc);
      draw();
    } else if (tool === 'ruler') {
      mousePx = canvasPoint(e);
    }
  }

  function onPointerUp(e: PointerEvent) {
    if (tool === 'ruler' && downPx) {
      const up = canvasPoint(e);
      if (Math.hypot(up.x - downPx.x, up.y - downPx.y) < 5) rulerClick(up);
    }
    downPx = null;
    dragging = false;
  }

  /** Klik-klik: mulai garis, klik kedua menyimpan + memberi label. */
  function rulerClick(p: { x: number; y: number }) {
    if (!rulerStart) {
      rulerStart = p;
      return;
    }
    const dx = (p.x - rulerStart.x) / zoom;
    const dy = (p.y - rulerStart.y) / zoom;
    const m = measureDistance(dx, dy, pixelSpacingMm);
    rulers = [
      ...rulers,
      { x1: rulerStart.x, y1: rulerStart.y, x2: p.x, y2: p.y, label: `${m.value} ${m.unit}` }
    ];
    rulerStart = null;
  }

  function cursor(): string {
    if (tool === 'pan') return dragging ? 'grabbing' : 'grab';
    if (tool === 'zoom') return 'zoom-in';
    return 'crosshair';
  }

  $effect(() => {
    // draw() membaca `image`, jadi efek jalan ulang tiap gambar berganti.
    // Seperti MicroDicom: fit-to-window saat gambar dibuka.
    // Jendela di-reset ke min-max agar render awal identik.
    if (image !== prevImage || rawPixels !== prevRaw) {
      prevImage = image;
      prevRaw = rawPixels;
      resetWindow();
      rotation = 0;
      rulers = [];
      rulerStart = null;
      mousePx = null;
      if (image) fit();
      else draw();
    }
  });
</script>

{#if image}
  <div
    class="flex flex-wrap items-center gap-1 rounded-[8px] border border-white/10 bg-white/[0.02] px-2 py-1.5"
    role="toolbar"
    aria-label="Alat viewport"
  >
    {#if fileActions}
      {@render fileActions()}
      <span class="mx-1 h-5 w-px shrink-0 bg-white/10" aria-hidden="true"></span>
    {/if}
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
          title={t.id === 'window' && !rawPixels ? 'Windowing (khusus DICOM)' : t.label}
          disabled={t.id === 'window' && !rawPixels}
          class={`flex items-center gap-1.5 rounded-[5px] px-2.5 py-1 text-xs transition-colors disabled:opacity-40 ${tool === t.id ? 'bg-blue-600 font-semibold text-white' : 'text-zinc-400 hover:text-zinc-100'}`}
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
      class={`rounded-[5px] p-1.5 transition-colors ${invertView ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-100'}`}
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
    <button
      type="button"
      class="rounded-[5px] px-2 py-1 font-mono text-xs text-zinc-400 transition-colors hover:bg-white/5 hover:text-zinc-100"
      title="Rasio 1:1"
      onclick={oneToOne}
    >
      1:1
    </button>
    <button
      type="button"
      class="rounded-[5px] p-1.5 text-zinc-400 transition-colors hover:bg-white/5 hover:text-zinc-100"
      title="Putar 90°"
      onclick={rotate}
    >
      <ViewerIcon name="rotate" />
    </button>
    <span class="ml-auto"></span>
    <button
      type="button"
      class="rounded-[5px] p-1.5 text-zinc-400 transition-colors hover:bg-white/5 hover:text-zinc-100"
      title="Layar penuh"
      onclick={toggleFullscreen}
    >
      <ViewerIcon name="expand" />
    </button>
  </div>
  {#if rulers.length > 0}
    <div class="mt-1 flex items-center gap-2 font-mono text-[11px] text-blue-300/80">
      <span>{rulers.length} pengukuran: {rulers.map((r) => r.label).join(' · ')}</span>
      <button
        type="button"
        class="text-zinc-500 underline-offset-2 hover:text-zinc-300 hover:underline"
        onclick={() => {
          rulers = [];
          rulerStart = null;
        }}
      >
        Hapus
      </button>
    </div>
  {/if}
{/if}
<div
  bind:this={frame}
  class="slim-scroll relative mt-2 flex items-center justify-center overflow-auto rounded-[12px] border border-white/10 bg-black"
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
      <div class="relative inline-block">
        <canvas
          bind:this={canvas}
          style={`cursor: ${cursor()};${invertView ? ' filter: invert(1);' : ''}`}
          onwheel={onWheel}
          onpointerdown={onPointerDown}
          onpointermove={onPointerMove}
          onpointerup={onPointerUp}
        ></canvas>
        {#if (rulers.length > 0 || (rulerStart && mousePx)) && viewW > 0}
          <svg
            class="pointer-events-none absolute inset-0 h-full w-full"
            viewBox={`0 0 ${viewW} ${viewH}`}
            aria-hidden="true"
          >
            {#each rulers as r (`${r.x1},${r.y1},${r.x2},${r.y2}`)}
              <line
                x1={r.x1}
                y1={r.y1}
                x2={r.x2}
                y2={r.y2}
                stroke="#60a5fa"
                stroke-width="1.5"
                stroke-dasharray="5 3"
              />
              <circle cx={r.x1} cy={r.y1} r="3" fill="#60a5fa" />
              <circle cx={r.x2} cy={r.y2} r="3" fill="#60a5fa" />
              <text
                x={(r.x1 + r.x2) / 2 + 6}
                y={(r.y1 + r.y2) / 2 - 6}
                fill="#60a5fa"
                font-size="11"
                font-family="monospace">{r.label}</text
              >
            {/each}
            {#if rulerStart && mousePx}
              <line
                x1={rulerStart.x}
                y1={rulerStart.y}
                x2={mousePx.x}
                y2={mousePx.y}
                stroke="#60a5fa"
                stroke-width="1.5"
                stroke-dasharray="5 3"
                opacity="0.6"
              />
              <circle cx={rulerStart.x} cy={rulerStart.y} r="3" fill="#60a5fa" />
            {/if}
          </svg>
        {/if}
      </div>
    </figure>
  {:else}
    <p class="p-6 text-center text-sm text-zinc-500">
      Belum ada gambar.<br />Buka file DICOM atau gambar dari panel Browser.
    </p>
  {/if}
</div>
