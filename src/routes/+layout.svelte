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

<header class="border-b border-white/10 bg-[#0b0b0d]/90 backdrop-blur">
  <nav class="mx-auto flex h-11 max-w-6xl items-center gap-1 px-6" aria-label="Navigasi utama">
    <span
      class="mr-4 flex items-center gap-2 text-[13px] font-semibold tracking-tight text-zinc-100"
    >
      <span
        class="inline-flex h-5 w-5 items-center justify-center rounded-[5px] bg-zinc-100 text-xs font-bold text-black"
        aria-hidden="true">+</span
      >
      Radiology Reader
    </span>
    {#each links as l (l.href)}
      <a
        href={resolve(l.href)}
        aria-current={page.url.pathname === l.href ? 'page' : undefined}
        class={`rounded-[5px] px-2.5 py-1 text-[13px] transition-colors ${page.url.pathname === l.href ? 'bg-zinc-100 font-semibold text-black' : 'text-zinc-500 hover:bg-white/5 hover:text-zinc-100'}`}
      >
        {l.label}
      </a>
    {/each}
  </nav>
</header>

<main class="mx-auto min-h-[calc(100dvh-7rem)] max-w-6xl">
  {@render children()}
</main>

<footer
  class="mx-auto flex max-w-6xl items-center gap-4 border-t border-white/10 px-6 py-3 font-mono text-[11px] text-zinc-600"
>
  <span>DRL nasional · 39 baris referensi</span>
  <span class="ml-auto">Gambar tidak pernah diunggah — parsing di browser</span>
</footer>
