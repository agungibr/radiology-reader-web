<script lang="ts">
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

  const MIN_ZOOM = 0.15;
  const MAX_ZOOM = 8;

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
    zoom = 1;
    offsetX = 0;
    offsetY = 0;
    draw();
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

  function oneToOne() {
    zoom = 1;
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
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: PointerEvent) {
    if (!dragging) return;
    offsetX += e.clientX - lastX;
    offsetY += e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;
    draw();
  }

  function onPointerUp() {
    dragging = false;
  }

  $effect(() => {
    // draw() membaca `image`, jadi efek jalan ulang tiap gambar berganti.
    zoom = 1;
    offsetX = 0;
    offsetY = 0;
    draw();
  });
</script>

<div class="flex flex-wrap items-center gap-1.5" role="toolbar" aria-label="Alat viewport">
  <button type="button" class="toolbtn" onclick={() => zoomBy(1 / 1.15)} aria-label="Perkecil">
    −
  </button>
  <span class="tnum w-14 text-center font-mono text-xs text-slate-200"
    >{Math.round(zoom * 100)}%</span
  >
  <button type="button" class="toolbtn" onclick={() => zoomBy(1.15)} aria-label="Perbesar">+</button
  >
  <span class="mx-1 h-5 w-px bg-slate-700" aria-hidden="true"></span>
  <button type="button" class="toolbtn" onclick={fit}>Fit</button>
  <button type="button" class="toolbtn" onclick={oneToOne}>1:1</button>
  <button type="button" class="toolbtn" onclick={resetView}>Reset</button>
  {#if image}
    <span class="tnum ml-auto font-mono text-xs text-slate-400">
      {image.width} × {image.height}
    </span>
  {/if}
</div>
<div
  bind:this={frame}
  class="slim-scroll relative mt-2 flex items-center justify-center overflow-auto rounded border border-slate-800 bg-black"
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
        class="cursor-grab"
        onwheel={onWheel}
        onpointerdown={onPointerDown}
        onpointermove={onPointerMove}
        onpointerup={onPointerUp}
      ></canvas>
    </figure>
  {:else}
    <p class="p-6 text-center text-sm text-slate-500">
      Belum ada gambar.<br />Buka file DICOM atau gambar dari panel Browser.
    </p>
  {/if}
</div>
