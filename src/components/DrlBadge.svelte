<script lang="ts">
  import { statusLabel } from '$lib/drl';

  let { status }: { status: string } = $props();

  const color = $derived(
    status === 'above'
      ? 'bg-red-100 text-red-700 border-red-300'
      : status === 'equal'
        ? 'bg-amber-100 text-amber-800 border-amber-300'
        : status === 'below'
          ? 'bg-green-100 text-green-700 border-green-300'
          : 'bg-gray-100 text-gray-500 border-gray-300'
  );
</script>

<span class={`inline-block border px-2 py-0.5 text-xs font-bold ${color}`}>
  {status ? statusLabel(status) : '—'}
</span>
