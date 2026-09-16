# Implementation Plan: Radiology Reader Web

## Overview

Rebuild desktop Radiology Reader as SvelteKit + TypeScript web app on Cloudflare Pages + D1, **tanpa OCR**. Satu alur vertikal dipertahankan: upload DICOM/JPG → metadata + gambar tampil → input eksposur auto-fill → Hitung INAK/ESAK (+ kalibrasi manual) → Hitung DAP → penilaian DRL otomatis → history tersimpan di D1 → export xlsx/csv. Panel DAP tetap **hidden by default** seperti desktop (INAK full-width, toggle untuk tampilkan DAP). Estimasi dosis sederhana mSv ala desktop tetap dipertahankan. UI full Bahasa Indonesia. Deploy v1 ke `*.pages.dev`.

Keputusan user (2026-09-16): export **xlsx + csv**, DAP hidden, ikuti desktop untuk mSv estimator, UI full Indonesia, tanpa migrasi DB lama, `pages.dev` cukup.

## Architecture Decisions

- **SvelteKit 2 + adapter-cloudflare + nodejs_compat**: satu codebase untuk UI + API (`+server.ts`) di Workers. Rationale: deploy tunggal ke Pages, tanpa backend terpisah.
- **DICOM di browser** (`dicom-parser`, render manual ke canvas): privasi (byte gambar tak pernah upload), hindari limit Worker 10MB. Server hanya terima angka + metadata.
- **Logika murni di `src/lib/`** (`dose.ts`, `drl.ts`, `calibration.ts`, `dicom.ts`): tanpa import Svelte, bisa di-unit-test dengan golden numbers dari Python desktop.
- **D1 via drizzle-orm**: schema typed, migrasi `drizzle/*.sql`, seed DRL dari `drl_config.json` desktop. Tabel: `calculations`, `calibration_sets`, `calibration_points`, `drl_entries`.
- **DAP hidden by default**: tab Dosimetri render INAK full-width + tombol "Tampilkan DAP" (meniru `splitter.setSizes([1,0])` + `hide()` di desktop). State toggle di URL `?tab=dap` agar bisa di-link.
- **Validasi zod bersama** client + server untuk semua form/API berbahasa Indonesia.

## Task List

### Phase 1: Foundation

- [ ] Task 1: Scaffold SvelteKit + Cloudflare + Tailwind + tooling
- [ ] Task 2: Port dose + calibration math + unit tests
- [ ] Task 3: Port DRL engine + data + unit tests

### Checkpoint: Foundation
- [ ] `npm run check` hijau, `npm run test` hijau (dose, calibration, DRL incl. kasus thoracolumbar-vs-lumbar)
- [ ] Review dengan human sebelum lanjut ke DB/API

### Phase 2: Data + API

- [ ] Task 4: D1 schema + seed DRL + drizzle client
- [ ] Task 5: API history + export (xlsx+csv) + DRL assess + kalibrasi

### Checkpoint: Data + API
- [ ] CRUD history via `curl`/vitest endpoint, export xlsx+csv terdownload dan terbuka di Excel, DRL endpoint cocok dengan unit
- [ ] Review dengan human

### Phase 3: UI slices

- [ ] Task 6: Layout + upload + viewer canvas + patient card + tags (Indonesia)
- [ ] Task 7: Form INAK/ESAK + tabel kalibrasi + Rumus Y + DAP hidden-toggle
- [ ] Task 8: Form DAP + kartu DRL + History page + kartu estimasi mSv desktop-parity

### Checkpoint: UI slices
- [ ] Alur manual end-to-end jalan: upload fixture → auto-fill → hitung → badge DRL → history → export
- [ ] Review dengan human

### Phase 4: Quality + Deploy

- [ ] Task 9: E2E playwright + fixture anonim + parity check vs desktop
- [ ] Task 10: Build/preview/deploy pages.dev + rapikan docs

### Checkpoint: Complete
- [ ] Semua success criteria spec.md terpenuhi, siap review akhir

## Dependency Graph

```
T1 scaffold
 └─ T2 dose/calibration ─┐
 └─ T3 DRL ──────────────┤
     └─ T4 D1 schema/seed
         └─ T5 API ──────┐
             ├─ T6 viewer (butuh dicom.ts dari T1/T2, API history read)
             ├─ T7 INAK/kalibrasi (butuh T2+T5)
             └─ T8 DAP/DRL UI + history + mSv (butuh T2+T3+T5)
                 └─ T9 e2e (butuh T6-T8)
                     └─ T10 deploy (butuh semua)
```

Paralel aman setelah T5: T6, T7, T8 bisa dikerjakan paralel oleh agen berbeda (kontrak API sudah beku di T5). T2 dan T3 bisa paralel setelah T1.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Parse DICOM di browser beda hasil vs pydicom (windowing, MONOCHROME1, multi-frame) | High | Golden fixture: bandingkan metadata + screenshot vs desktop untuk 3 file (Chest PA, Skull Lateral, Panoramic); batasi v1 ke single-frame |
| File DICOM > limit memori browser / Worker | Med | Validasi ukuran client (tolak >50MB dengan pesan Indonesia), gambar tak dikirim ke server |
| Regresi power presisi float beda Python vs JS | Med | Toleransi 1e-4 di test, tampil 6 desimal seperti desktop |
| D1 local vs remote drift / seed DRL salah angka | Med | Seed SQL di-generate dari JSON + test hitung jumlah rows (21 exam, ~40 view/age combos); `wrangler d1 execute --local` dulu |
| Bundle client membengkak (dicom-parser + xlsx) | Low | xlsx hanya di server endpoint, bukan client; dynamic import viewer |

## Open Questions

Tidak ada yang blocking. Sisa konfirmasi kecil saat implementasi (teks Indonesia exact untuk badge, lebar kolom Excel) diputuskan mengikuti desktop.
