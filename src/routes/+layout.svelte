<script lang="ts">
  import ViewerIcon from '$components/ViewerIcon.svelte';
  import { page } from '$app/state';
  import { resolve } from '$app/paths';
  import '../app.css';

  let { children } = $props();

  let collapsed = $state(false);

  const links: {
    href: '/' | '/dosimetry' | '/history';
    label: string;
    icon: 'image' | 'calc' | 'history';
  }[] = [
    { href: '/', label: 'Viewer', icon: 'image' },
    { href: '/dosimetry', label: 'Dosimetri', icon: 'calc' },
    { href: '/history', label: 'History', icon: 'history' }
  ];
</script>

<div class="flex min-h-dvh flex-col md:flex-row">
  <aside
    class={`flex shrink-0 flex-row items-center gap-1 border-b border-white/10 bg-[#0e0e11] px-3 py-2 md:min-h-dvh md:flex-col md:items-stretch md:gap-1 md:border-r md:border-b-0 md:p-3 ${collapsed ? 'md:w-16' : 'md:w-56'}`}
    aria-label="Navigasi utama"
  >
    <div
      class={`flex items-center gap-1 md:mb-3 md:px-1 md:pt-1 ${collapsed ? 'md:justify-center' : ''}`}
    >
      <button
        type="button"
        class="shrink-0 rounded-[5px] p-1.5 text-zinc-500 transition-colors hover:bg-white/5 hover:text-zinc-100"
        aria-expanded={!collapsed}
        aria-label={collapsed ? 'Lebarkan sidebar' : 'Ciutkan sidebar'}
        title={collapsed ? 'Lebarkan sidebar' : 'Ciutkan sidebar'}
        onclick={() => (collapsed = !collapsed)}
      >
        <ViewerIcon name={collapsed ? 'chevR' : 'chevL'} class="h-4 w-4" />
      </button>
      {#if !collapsed}
        <span
          class="mr-2 flex items-center gap-2 text-sm font-semibold tracking-tight text-zinc-100 md:mr-0"
        >
          <span
            class="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-[6px] bg-blue-600 text-sm text-white"
            aria-hidden="true"><i class="fa-solid fa-x-ray"></i></span
          >
          <span class="hidden sm:inline">Radiology Reader</span>
        </span>
      {/if}
    </div>
    <nav class="flex flex-row items-center gap-1 md:flex-col md:items-stretch" aria-label="Halaman">
      {#each links as l (l.href)}
        <a
          href={resolve(l.href)}
          aria-current={page.url.pathname === l.href ? 'page' : undefined}
          title={l.label}
          class={`flex items-center gap-2.5 rounded-[6px] px-2.5 py-2 text-sm transition-colors ${collapsed ? 'md:justify-center md:px-2' : ''} ${page.url.pathname === l.href ? 'bg-blue-600 font-semibold text-white' : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-100'}`}
        >
          <ViewerIcon name={l.icon} class="h-4 w-4 shrink-0" />
          <span class={`hidden ${collapsed ? '' : 'md:inline'}`}>{l.label}</span>
        </a>
      {/each}
    </nav>
  </aside>

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
