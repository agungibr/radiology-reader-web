<script lang="ts">
  import { statusLabel } from '$lib/drl';

  let { status }: { status: string } = $props();

  const color = $derived(
    status === 'above'
      ? 'bg-red-500/10 text-red-300 border-red-500/20'
      : status === 'equal'
        ? 'bg-amber-500/10 text-amber-200 border-amber-500/20'
        : status === 'below'
          ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
          : 'bg-white/5 text-zinc-500 border-white/10'
  );
</script>

<span
  class={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-wide uppercase ${color}`}
>
  {status ? statusLabel(status) : '—'}
</span>
