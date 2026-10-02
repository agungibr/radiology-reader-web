<script lang="ts">
  import { resolve } from '$app/paths';
  import HistoryTable, { type HistoryApiRow } from '$components/HistoryTable.svelte';

  let rows: HistoryApiRow[] = $state([]);
  let total = $state(0);
  let page = $state(1);
  const limit = 20;
  let loading = $state(false);
  let error = $state('');
  let busy = $state(false);

  async function load() {
    loading = true;
    error = '';
    try {
      const res = await fetch(`/api/history?page=${page}&limit=${limit}`);
      if (!res.ok) throw new Error('Gagal memuat history');
      const body = (await res.json()) as { rows: HistoryApiRow[]; total: number };
      rows = body.rows;
      total = body.total;
    } catch (e) {
      error = e instanceof Error ? e.message : 'Gagal memuat history';
    } finally {
      loading = false;
    }
  }

  async function hapus(id: number) {
    if (!confirm(`Hapus baris ini dari history?`)) return;
    busy = true;
    try {
      await fetch(`/api/history?id=${id}`, { method: 'DELETE' });
      await load();
    } finally {
      busy = false;
    }
  }

  async function hapusSemua() {
    if (!confirm('Yakin ingin menghapus semua data history?')) return;
    busy = true;
    try {
      await fetch('/api/history?all=true', { method: 'DELETE' });
      page = 1;
      await load();
    } finally {
      busy = false;
    }
  }

  const pages = $derived(Math.max(1, Math.ceil(total / limit)));

  $effect(() => {
    // load() membaca `page` → efek jalan ulang tiap halaman berganti.
    void load();
  });
</script>

<div class="mx-auto max-w-6xl px-6 py-8">
  <h1 class="text-xl font-semibold tracking-tight">History Perhitungan INAK / ESAK</h1>
  <p class="tnum text-sm text-zinc-500">{total} data</p>

  <div class="mt-4 flex flex-wrap gap-2 text-sm">
    <a class="btn-primary px-3 py-1.5" href={resolve('/api/history/export?format=xlsx')}>
      Simpan Excel (.xlsx)
    </a>
    <a class="toolbtn" href={resolve('/api/history/export?format=csv')}>Simpan CSV</a>
    <button
      type="button"
      class="toolbtn hover:bg-red-500/10 hover:text-red-300"
      disabled={busy || rows.length === 0}
      onclick={hapusSemua}
    >
      Hapus Semua
    </button>
  </div>

  {#if error}
    <p
      role="alert"
      class="mt-2 rounded-[6px] border border-red-500/20 bg-red-500/10 p-2 text-sm text-red-200"
    >
      {error}
    </p>
  {/if}

  <div class="mt-2">
    <HistoryTable {rows} onDelete={hapus} deleting={busy} />
  </div>

  <div class="mt-2 flex items-center gap-2 text-sm">
    <button
      type="button"
      class="border px-2 py-1 disabled:opacity-50"
      disabled={page <= 1}
      onclick={() => (page -= 1)}
    >
      ← Sebelumnya
    </button>
    <span>Halaman {page} / {pages}</span>
    <button
      type="button"
      class="border px-2 py-1 disabled:opacity-50"
      disabled={page >= pages}
      onclick={() => (page += 1)}
    >
      Berikutnya →
    </button>
  </div>

  {#if loading}
    <p class="mt-2 text-sm text-zinc-500">Memuat…</p>
  {/if}
</div>
