# Radiology Reader Web

Aplikasi web dosimetri radiologi: workstation DICOM (studies tree, scroll iris
CT, inspector tag), buka citra DICOM/gambar, hitung dosis INAK/ESAK dan DAP
(termasuk kalkulasi mAs langsung untuk file tanpa tag mA/waktu), nilai otomatis
terhadap batas DRL nasional, simpan history, export Excel/CSV.

Port dari aplikasi desktop `text-recognition` (PySide6) — **tanpa fitur OCR**.
Sumber kebenaran: `spec.md`. Rencana: `tasks/plan.md`, `tasks/todo.md`,
`tasks/plan-viewer-wireframe.md`.

Live: https://radiologi.purwarupa.net

## Quick Start

```bash
npm install
npm run dev          # http://localhost:5173 (tanpa D1 — API history mengembalikan 500)
```

Dev dengan D1 lokal:

```bash
npx wrangler d1 execute radiology-db --local --file=./drizzle/0001_init.sql
npx wrangler d1 execute radiology-db --local --file=./drizzle/0002_nullable_exposure.sql
npm run build
npx wrangler pages dev .svelte-kit/cloudflare --d1 DB=radiology-db
```

## Commands

| Command            | Description                                |
| ------------------ | ------------------------------------------ |
| `npm run dev`      | Dev server (Vite, tanpa D1)                |
| `npm run check`    | svelte-check + tsc                         |
| `npm run lint`     | eslint + prettier check                    |
| `npm run test`     | Unit tests (vitest, 194 tests)             |
| `npm run test:e2e` | E2E tests (playwright, chromium, 17 tests) |
| `npm run build`    | Production build (adapter-cloudflare)      |
| `npm run preview`  | Preview production build (tanpa D1)        |
| `npm run deploy`   | Deploy ke Cloudflare Pages                 |

## Database (Cloudflare D1)

```bash
npx wrangler d1 create radiology-db                    # sekali saja
npx wrangler d1 execute radiology-db --remote --file=./drizzle/0001_init.sql
npx wrangler d1 execute radiology-db --remote --file=./drizzle/0002_nullable_exposure.sql  # mAs-langsung (B-full)
```

Skema + seed DRL (39 baris dari `drl_config.json` desktop): `drizzle/0001_init.sql`.
Skema drizzle: `src/lib/db/schema.ts`. (Drizzle-kit sengaja tidak dipakai.)

## Deploy

```bash
npm run build
npx wrangler pages deploy .svelte-kit/cloudflare --project-name=radiology-reader-web --branch=main
# → https://radiologi.purwarupa.net
```

Pastikan migrasi remote sudah diterapkan sebelum deploy versi berkode
`0002` (lihat Database di atas) — history mAs-langsung gagal tersimpan
tanpa kolom nullable tersebut.

Deploy Git Pages tidak dipakai: kolom Deploy/Version di dashboard harus netral (`true`) —
perintah Workers (`wrangler deploy`) ditolak di proyek Pages.

Binding D1 `DB` terbaca dari `wrangler.toml` (`pages_build_output_dir` wajib ada
agar Pages memakai config tersebut).

## Architecture

- `src/routes/` — Viewer workstation (`/`), Dosimetri (`/dosimetry`), History (`/history`), API (`/api/*`)
- `src/lib/` — pure logic + unit tests: `dicom.ts`, `dose.ts`, `drl.ts`,
  `calibration.ts`, `history.ts`, `validation.ts`, `session.ts`, `study.ts`
- `src/components/` — ImageViewer, StudiesPanel, StudyInfoCard, ExposureForm,
  CalibrationTable, DapForm, DrlBadge, DoseEstimateCard, PatientCard,
  TagsTable (ringkasan + inspector penuh), HistoryTable
- `e2e/fixtures/` — DICOM sintetis anonim + generator (`generate_fixture.py`); `series/` multi-series untuk scroll iris

Angka dijamin cocok dengan desktop (golden tests dari Python):
INAK/ESAK, rantai DAP, regresi kalibrasi, DRL, estimasi mSv — toleransi 1e-9..1e-4.

## Deviasi dari desktop (disengaja)

- Tanpa OCR (EasyOCR scan teks + PaddleOCR tabel kalibrasi dihapus).
- Kolom Tags: Tag ID + Nama (kamus 62 entri) + VR + nilai; tag tak dikenal
  berlabel jujur `Unknown tag` / `Private tag`.
- Kalkulasi mAs langsung: file tanpa mA/waktu tetapi punya mAs (0018,1152)
  tetap bisa dihitung (desktop butuh mA+waktu); mA/waktu kosong tersimpan
  NULL dan diekspor kosong.
- Patient ID dimask di kartu Study info (nilai asli tetap dipakai
  dosimetri/history).
- Toggle DAP murni `$state` (tanpa `?tab=` agar input form tidak ter-reset).
- Format angka batas DAP memakai `String()` JS (`120`, bukan `120.0` ala Python).
