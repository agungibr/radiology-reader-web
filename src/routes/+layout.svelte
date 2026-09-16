<script lang="ts">
  import '../app.css';

  let { children } = $props();
</script>

<header class="border-b border-gray-300 bg-white">
  <nav class="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3" aria-label="Navigasi utama">
    <span class="text-sm font-bold">Radiology Reader</span>
    <a href="/" class="text-sm hover:underline">Viewer</a>
    <a href="/dosimetry" class="text-sm hover:underline">Dosimetri</a>
    <a href="/history" class="text-sm hover:underline">History</a>
  </nav>
</header>

<main class="mx-auto max-w-6xl px-4 py-6">
  {@render children()}
</main>
