<script lang="ts">
  /** Ikon toolbar viewer digambar tangan (tanpa dependensi ikon). */
  let {
    name,
    class: cls = 'h-3.5 w-3.5'
  }: {
    name: 'window' | 'pan' | 'zoom' | 'ruler' | 'invert' | 'fit' | 'reset';
    class?: string;
  } = $props();
</script>

<svg
  class={cls}
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
  aria-hidden="true"
>
  {#if name === 'window'}
    <line x1="4" y1="7" x2="20" y2="7" /><circle
      cx="15"
      cy="7"
      r="2.2"
      fill="currentColor"
      stroke="none"
    />
    <line x1="4" y1="12" x2="20" y2="12" /><circle
      cx="9"
      cy="12"
      r="2.2"
      fill="currentColor"
      stroke="none"
    />
    <line x1="4" y1="17" x2="20" y2="17" /><circle
      cx="14"
      cy="17"
      r="2.2"
      fill="currentColor"
      stroke="none"
    />
  {:else if name === 'pan'}
    <polyline points="12 3 12 21" /><polyline points="9 6 12 3 15 6" /><polyline
      points="9 18 12 21 15 18"
    />
    <polyline points="3 12 21 12" /><polyline points="6 9 3 12 6 15" /><polyline
      points="18 9 21 12 18 15"
    />
  {:else if name === 'zoom'}
    <circle cx="11" cy="11" r="7" /><line x1="16.5" y1="16.5" x2="21" y2="21" />
    <line x1="11" y1="8.5" x2="11" y2="13.5" /><line x1="8.5" y1="11" x2="13.5" y2="11" />
  {:else if name === 'ruler'}
    <line x1="4" y1="20" x2="20" y2="4" /><line x1="7.5" y1="16.5" x2="9.5" y2="18.5" />
    <line x1="11" y1="13" x2="13" y2="15" /><line x1="14.5" y1="9.5" x2="16.5" y2="11.5" />
  {:else if name === 'invert'}
    <circle cx="12" cy="12" r="8" /><path
      d="M12 4a8 8 0 0 1 0 16z"
      fill="currentColor"
      stroke="none"
    />
  {:else if name === 'fit'}
    <polyline points="4 9 4 4 9 4" /><polyline points="15 4 20 4 20 9" />
    <polyline points="20 15 20 20 15 20" /><polyline points="9 20 4 20 4 15" />
  {:else if name === 'reset'}
    <polyline points="3 12 3 7 8 7" /><path d="M3 12a9 9 0 1 0 3-6.7" />
  {/if}
</svg>
