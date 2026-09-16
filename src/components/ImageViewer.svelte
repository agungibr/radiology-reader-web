<script lang="ts">
  let {
    image,
    alt = 'Citra radiologi'
  }: {
    image: { data: Uint8ClampedArray; width: number; height: number } | null;
    alt?: string;
  } = $props();

  let canvas: HTMLCanvasElement | null = $state(null);
  let zoom = $state(1);
  let offsetX = $state(0);
  let offsetY = $state(0);
  let dragging = $state(false);
  let lastX = 0;
  let lastY = 0;

  const MIN_ZOOM = 0.15;
  const MAX_ZOOM = 8;

  function draw() {
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

<div>
  <div class="mb-2 flex items-center gap-2 text-sm">
    <span class="text-gray-500">Zoom:</span>
    <button type="button" class="border px-2 py-0.5" onclick={() => zoomBy(1 / 1.15)}>−</button>
    <span class="w-12 text-center font-mono">{Math.round(zoom * 100)}%</span>
    <button type="button" class="border px-2 py-0.5" onclick={() => zoomBy(1.15)}>+</button>
    <button type="button" class="border px-2 py-0.5" onclick={resetView}>Reset</button>
    {#if image}
      <span class="ml-auto font-mono text-gray-600">
        {image.width} × {image.height}
      </span>
    {/if}
  </div>
  <div
    class="flex items-center justify-center overflow-hidden border bg-black"
    style="min-height: 320px"
  >
    {#if image}
      <figure class="m-0">
        <figcaption class="sr-only">{alt} — {image.width} × {image.height}</figcaption>
        <canvas
          bind:this={canvas}
          class="max-h-[60vh] cursor-grab"
          onwheel={onWheel}
          onpointerdown={onPointerDown}
          onpointermove={onPointerMove}
          onpointerup={onPointerUp}
        ></canvas>
      </figure>
    {:else}
      <p class="text-sm text-gray-400">Belum ada gambar. Unggah file DICOM atau gambar.</p>
    {/if}
  </div>
</div>
