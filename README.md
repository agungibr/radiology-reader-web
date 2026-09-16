# Radiology Reader Web

Rebuild desktop Radiology Reader (DICOM viewer + dosimetri INAK/ESAK, DAP, DRL) sebagai web app.
**Tanpa OCR.** Sumber kebenaran: `spec.md`.

## Quick Start

```bash
npm install
npm run dev
```

## Commands

| Command            | Description                           |
| ------------------ | ------------------------------------- |
| `npm run dev`      | Dev server                            |
| `npm run check`    | svelte-check + tsc                    |
| `npm run lint`     | eslint + prettier check               |
| `npm run test`     | Unit tests (vitest)                   |
| `npm run test:e2e` | E2E tests (playwright, chromium)      |
| `npm run build`    | Production build (adapter-cloudflare) |
| `npm run preview`  | Preview production build              |
| `npm run deploy`   | Deploy ke Cloudflare Pages            |

## Architecture

- `src/routes/` — Viewer (`/`), Dosimetri (`/dosimetry`), History (`/history`), API (`/api/*`)
- `src/lib/` — pure logic: `dicom.ts`, `dose.ts`, `drl.ts`, `calibration.ts` (+ unit tests di `tests/`)
- `src/components/` — komponen Svelte
- D1 via drizzle (`drizzle/`, `src/lib/db/`). Lihat `spec.md` §5 dan `tasks/plan.md`.
