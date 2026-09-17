<script lang="ts">
  import { statusLabel } from '$lib/drl';

  let { status }: { status: string } = $props();

  const color = $derived(
    status === 'above'
      ? 'bg-red-950 text-red-300 border-red-800'
      : status === 'equal'
        ? 'bg-amber-950 text-amber-300 border-amber-800'
        : status === 'below'
          ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
          : 'bg-slate-800 text-slate-400 border-slate-700'
  );
</script>

<span class={`inline-block border px-2 py-0.5 text-xs font-bold ${color}`}>
  {status ? statusLabel(status) : '—'}
</span>
