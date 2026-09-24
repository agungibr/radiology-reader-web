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

<header class="border-b border-[#EAEAEA] bg-[#FFFFFF]/90 backdrop-blur">
  <nav class="mx-auto flex max-w-6xl items-center gap-1 px-6 py-3" aria-label="Navigasi utama">
    <span class="mr-4 flex items-center gap-2 text-[15px] font-semibold tracking-tight">
      <span
        class="inline-flex h-6 w-6 items-center justify-center rounded-[6px] bg-[#111111] text-sm font-bold text-white"
        aria-hidden="true">+</span
      >
      Radiology Reader
    </span>
    {#each links as l (l.href)}
      <a
        href={resolve(l.href)}
        aria-current={page.url.pathname === l.href ? 'page' : undefined}
        class={`rounded-[6px] px-3 py-1.5 text-sm transition-colors ${page.url.pathname === l.href ? 'bg-[#111111] font-semibold text-white' : 'text-[#787774] hover:bg-[#F7F6F3] hover:text-[#111111]'}`}
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
  class="mx-auto flex max-w-6xl items-center gap-4 border-t border-[#EAEAEA] px-6 py-3 font-mono text-[11px] text-[#787774]"
>
  <span>DRL nasional · 39 baris referensi</span>
  <span class="ml-auto">Gambar tidak pernah diunggah — parsing di browser</span>
</footer>
