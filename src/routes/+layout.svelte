<script lang="ts">
  import { page } from '$app/state';
  import { resolve } from '$app/paths';
  import '../app.css';

  let { children } = $props();

  const links: { href: '/' | '/dosimetry' | '/history'; label: string }[] = [
    { href: '/', label: 'Viewer' },
    { href: '/dosimetry', label: 'Dosimetri' },
    { href: '/history', label: 'History' }
  ];
</script>

<header
  class="border-b border-slate-800 bg-gradient-to-b from-slate-900 to-slate-950 text-slate-100"
>
  <nav class="flex items-center gap-1 px-4 py-2" aria-label="Navigasi utama">
    <span class="mr-3 flex items-center gap-2 text-sm font-bold tracking-tight">
      <span
        class="inline-flex h-6 w-6 items-center justify-center rounded bg-cyan-700 text-sm font-bold text-white"
        aria-hidden="true">+</span
      >
      Radiology Reader
    </span>
    {#each links as l (l.href)}
      <a
        href={resolve(l.href)}
        aria-current={page.url.pathname === l.href ? 'page' : undefined}
        class={`rounded px-3 py-1.5 text-sm transition-colors ${page.url.pathname === l.href ? 'bg-cyan-700 font-semibold text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}
      >
        {l.label}
      </a>
    {/each}
  </nav>
</header>

<main class="min-h-[calc(100dvh-5.5rem)]">
  {@render children()}
</main>

<footer
  class="flex items-center gap-4 border-t border-slate-200 bg-white px-4 py-1.5 font-mono text-[11px] text-slate-500"
>
  <span>DRL nasional · 39 baris referensi</span>
  <span class="ml-auto">Gambar tidak pernah diunggah — parsing di browser</span>
</footer>
