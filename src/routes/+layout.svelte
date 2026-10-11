<script lang="ts">
  import { page } from '$app/state';
  import { resolve } from '$app/paths';
  import '../app.css';

  let { children } = $props();

  const links: {
    href: '/' | '/dosimetry' | '/history';
    label: string;
  }[] = [
    { href: '/', label: 'Viewer' },
    { href: '/dosimetry', label: 'Dosimetri' },
    { href: '/history', label: 'History' }
  ];
</script>

<div class="flex min-h-dvh flex-col">
  <header
    class="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 border-b border-white/10 bg-[#0e0e11] px-4 py-2"
  >
    <span class="flex items-center gap-2">
      <span
        class="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-[6px] bg-blue-600 text-sm text-white"
        aria-hidden="true"><i class="fa-solid fa-x-ray"></i></span
      >
      <span>
        <span class="block text-sm leading-tight font-semibold tracking-tight text-zinc-100"
          >Radiologi Reader</span
        >
        <span class="block font-mono text-[10px] tracking-widest text-zinc-500 uppercase"
          >DICOM Workstation</span
        >
      </span>
    </span>
    <nav class="ml-auto flex items-center gap-1" aria-label="Halaman">
      {#each links as l (l.href)}
        <a
          href={resolve(l.href)}
          aria-current={page.url.pathname === l.href ? 'page' : undefined}
          class={`rounded-[6px] px-2.5 py-1.5 text-sm transition-colors ${page.url.pathname === l.href ? 'bg-blue-600 font-semibold text-white' : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-100'}`}
        >
          {l.label}
        </a>
      {/each}
    </nav>
  </header>

  <div class="flex min-w-0 flex-1 flex-col">
    <main class="min-w-0 flex-1">
      {@render children()}
    </main>

    <footer
      class="flex items-center gap-4 border-t border-white/10 px-4 py-2 font-mono text-[11px] text-zinc-600"
    >
      <span>DRL nasional · 39 baris referensi</span>
      <span class="ml-auto">Gambar tidak pernah diunggah — parsing di browser</span>
    </footer>
  </div>
</div>
