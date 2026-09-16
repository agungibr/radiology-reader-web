# Radiology Reader Web

Aplikasi web dosimetri radiologi: buka citra DICOM/gambar, hitung dosis INAK/ESAK dan DAP,
nilai otomatis terhadap batas DRL nasional, simpan history, export Excel/CSV.

Port dari aplikasi desktop `text-recognition` (PySide6) — **tanpa fitur OCR**.
Sumber kebenaran: `spec.md`. Rencana: `tasks/plan.md`, `tasks/todo.md`.

Live: https://radiology-reader-web-bkw.pages.dev (akun `agungmalik050@gmail.com`)

## Quick Start

```bash
npm install
npm run dev          # http://localhost:5173 (tanpa D1 — API history mengembalikan 500)
```

Dev dengan D1 lokal:

```bash
npx wrangler d1 execute radiology-db --local --file=./drizzle/0001_init.sql
npm run build
npx wrangler pages dev .svelte-kit/cloudflare --d1 DB=radiology-db
```

## Commands

| Command            | Description                           |
| ------------------ | ------------------------------------- |
| `npm run dev`      | Dev server (Vite, tanpa D1)           |
| `npm run check`    | svelte-check + tsc                    |
| `npm run lint`     | eslint + prettier check               |
| `npm run test`     | Unit tests (vitest, 52 tests)         |
| `npm run test:e2e` | E2E tests (playwright, chromium)      |
| `npm run build`    | Production build (adapter-cloudflare) |
| `npm run preview`  | Preview production build (tanpa D1)   |
| `npm run deploy`   | Deploy ke Cloudflare Pages            |

## Database (Cloudflare D1)

```bash
npx wrangler d1 create radiology-db                    # sekali saja
npx wrangler d1 execute radiology-db --remote --file=./drizzle/0001_init.sql
```

Skema + seed DRL (39 baris dari `drl_config.json` desktop): `drizzle/0001_init.sql`.
Skema drizzle: `src/lib/db/schema.ts`. (Drizzle-kit sengaja tidak dipakai.)

## Deploy

```bash
npm run build
npx wrangler pages deploy .svelte-kit/cloudflare --project-name=radiology-reader-web --branch=main
# → https://radiology-reader-web-bkw.pages.dev
```

Deploy Git Pages tidak dipakai: kolom Deploy/Version di dashboard harus netral (`true`) —
perintah Workers (`wrangler deploy`) ditolak di proyek Pages.

Binding D1 `DB` terbaca dari `wrangler.toml` (`pages_build_output_dir` wajib ada
agar Pages memakai config tersebut).

## Architecture

- `src/routes/` — Viewer (`/`), Dosimetri (`/dosimetry`), History (`/history`), API (`/api/*`)
- `src/lib/` — pure logic + unit tests: `dicom.ts`, `dose.ts`, `drl.ts`,
  `calibration.ts`, `history.ts`, `validation.ts`, `session.ts`
- `src/components/` — ImageViewer, ExposureForm, CalibrationTable, DapForm,
  DrlBadge, DoseEstimateCard, PatientCard, TagsTable, HistoryTable
- `e2e/fixtures/` — DICOM sintetis anonim + generator (`generate_fixture.py`)

Angka dijamin cocok dengan desktop (golden tests dari Python):
INAK/ESAK, rantai DAP, regresi kalibrasi, DRL, estimasi mSv — toleransi 1e-9..1e-4.

## Deviasi dari desktop (disengaja)

- Tanpa OCR (EasyOCR scan teks + PaddleOCR tabel kalibrasi dihapus).
- Kolom Tags: Tag hex + VR + nilai (dicom-parser tidak punya kamus deskripsi).
- Toggle DAP murni `$state` (tanpa `?tab=` agar input form tidak ter-reset).
- Format angka batas DAP memakai `String()` JS (`120`, bukan `120.0` ala Python).
