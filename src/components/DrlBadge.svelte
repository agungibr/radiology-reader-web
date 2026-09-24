<script lang="ts">
  import { statusLabel } from '$lib/drl';

  let { status }: { status: string } = $props();

  const color = $derived(
    status === 'above'
      ? 'bg-[#FDEBEC] text-[#9F2F2D] border-[#FDEBEC]'
      : status === 'equal'
        ? 'bg-[#FBF3DB] text-[#956400] border-[#FBF3DB]'
        : status === 'below'
          ? 'bg-[#EDF3EC] text-[#346538] border-[#EDF3EC]'
          : 'bg-[#F7F6F3] text-[#787774] border-[#EAEAEA]'
  );
</script>

<span
  class={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-wide uppercase ${color}`}
>
  {status ? statusLabel(status) : '—'}
</span>
