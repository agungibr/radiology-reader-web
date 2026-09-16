# Spec: Radiology Reader Web

> Status: DRAFT for human review (Phase 1: Specify).
> Do not implement until approved. Next: `tasks/plan.md` + `tasks/todo.md`.

## Assumptions

1. **No OCR at all** — removed: (a) EasyOCR scan of text burned into X-ray, (b) PaddleOCR scan of calibration table photo. Calibration is manual input only.
2. **Single-clinic use, no login for v1** — same as desktop app. Anyone with URL can use. Auth deferred to v2.
3. **SvelteKit + TypeScript strict**, deployed to Cloudflare Pages + Workers via `@sveltejs/adapter-cloudflare`.
4. **Cloudflare D1** is source of truth for history, calibration sets, DRL table.
5. **DICOM parsing in browser** — upload `.dcm`, parse tags + render pixels to `<canvas>`. No Python backend.
6. Modern browsers only (Chrome / Edge 120+).

---

## 1. Objective

Rebuild the desktop Radiology Reader as a zero-install web app with the same dosimetry workflow minus OCR.

**User:** Radiographer / medical physicist doing routine dose QC.

**What success looks like:**

- I open an X-ray (DICOM or JPG/PNG), I see the image and patient data automatically.
- I see exposure settings (kVp, mA, time, weight, DAP) auto-filled from DICOM, editable manually.
- I press "Hitung INAK / ESAK" and get INAK + ESAK values plus a safety verdict.
- I can calculate DAP separately from geometry (SID, field area).
- I can type my machine calibration table manually to get a machine-specific formula.
- Every calculation is saved to history and I can export to Excel.
- I can open it from any computer via Cloudflare URL.

**Non-goals (v1):**

- No OCR, no YOLO detection.
- No auto patient-CSV matching (manual patient fields only).
- No multi-user, roles, audit log.
- No PACS integration, no image storage in D1 (images stay in browser memory only).

---

## 2. Features (descriptive)

### F1. Open and view X-ray images

Upload one file via picker or drag-drop. Supported: `.dcm`, `.dicom` (with or without extension, detected by `DICM` magic), `.jpg`, `.jpeg`, `.png`, `.bmp`, `.tiff`. Show list of uploaded files in current session (in-memory, not persisted). Select file to view.

Viewer must support: fit-to-window on load, wheel zoom (0.15x–8x), +/- buttons, Reset (1x), Fit button, drag-to-pan, black background, size label (`W x H`), zoom label (`%`).

### F2. Patient data appears automatically

On DICOM load, extract and display: Patient ID, Name, Birth Date, Sex, Age (computed Birth→Study, fallback PatientAge tag), Study Date, Study Description, Series Description, Modality, Institution, Body Part Examined, View Position, Patient Weight.

For JPG/PNG: show "No DICOM metadata" empty state, allow manual typing of age / gender / exam for DRL.

### F3. Exposure settings auto-fill + manual edit

Auto-fill from DICOM tags: KVP `(0018,0060)`, mA `(0018,1151)`, ExposureTime ms→s `(0018,1150)`, mAs fallback `(0018,1152)`, DAP `(0018,115E)` converted `dGy·cm² × 100 → mGy·cm²`, Weight `(0010,1030)`.

Each field shows a small "DICOM" badge when auto-filled, "—" when missing. All fields editable. Live `mAs = mA × s` display with 4 decimals.

### F4. Calculate INAK / ESAK dose

Formula (must match desktop exactly):

```
y    = a × kVp^b
INAK = y × (mAs / 1000)
ESAK = INAK × BSF
```

Defaults: `a=0.0004, b=2.5917, BSF=1.35`. Show results with 6 decimals + formula trace (`y=... INAK=... ESAK=...`). Validation: kVp>0, mAs>0 else warning toast.

### F5. Machine calibration (manual only, no OCR)

Table with columns: `kVp | mAs | mGy | µGy | µGy/mAs`. Start with 6 empty rows, mAs default `20.0000` editable.

Buttons: `+ Baris`, `- Baris`, `Hitung` (µGy = mGy×1000, µGy/mAs = µGy/mAs), `Tampilkan Rumus Y` (power regression `y = a×kVp^b` from kVp vs µGy/mAs columns via log-linear OLS, min 2 rows). Result shows `y = a × kVp^b` + `R²`. On success, update coeff `a,b` inputs automatically. `Reset Default` restores `a,b`. `Fit Regresi` legacy button (kVp vs mGy) kept for parity.

### F6. Calculate DAP

Formula (must match desktop):

```
y_kVp   = c1·kVp² + c2·kVp + c3
IAK_SDD = (y_kVp × mAs) / 1000        (at 100cm ref)
IAK_SID = (IAK_SDD × 100²) / SID²
DAP     = IAK_SID × field_area
```

Defaults: `c1=0.0067, c2=-0.0359, c3=-5.4286, SID=100cm, area=625cm²`. Show y, IAK_SDD, IAK_SID (6 decimals), DAP (4 decimals) + formula trace.

### F7. Automatic safety check (DRL)

After each INAK/ESAK or DAP calculation, run DRL assessment using ported `drl_config.json`:

- Match exam: case-insensitive substring on StudyDescription then BodyPartExamined, longest keyword first (so `thoracolumbar` beats `lumbar`). 20+ exams: Panoramic, Chest, Abdomen, Ankle Joint, Antebrachi, Cervical, Clavicula, Cruris, Elbow, Femur, Humerus, Knee, Lumbar Spine, Manus, Pedis, Pelvis, Shoulder, Sinus Paranasal, Skull, Thoracolumbar, Wrist Joint.
- Normalize view via aliases (`ap→AP, pa→PA, lat/ll/rl→Lateral, obl→Oblique`), special: Sinus Paranasal always `Waters`, Panoramic empty→`Standard`.
- Age group: `infant 0–4, children 5–14, adult ≥15` (unknown → adult).
- Lookup: exact `exam/view/age`, fallback `adult`, fallback first view. Metric per entry: `inak_esak` or `dap`.
- Compare with 0.01% tolerance → `below / equal / above`.

UI: card showing `Exam | metric`, `Exam | View | Age group`, rows INAK `/ DRL x.xx mGy` + badge, ESAK same, DAP row when metric=dap. Colors: green `#22c55e` Below, amber `#f59e0b` Equal, red `#ef4444` Above. When no match: show "Tidak ada referensi DRL yang cocok" + reason.

### F8. History + Excel export

Every successful INAK/ESAK calculation appends one row (persisted to D1): No, Patient ID, Nama, Gender, Umur, BB, Jenis Pemeriksaan (`Exam View`), kVp, mA, s, mAs, INAK, ESAK, DAP (from DICOM tag, may be empty), DRL Batas (`INAK≤x, ESAK≤y` or `DAP≤z`), Hasil DRL (worst of INAK/ESAK, or DAP status).

History page: paginated table (20/page), delete row (confirm), clear all (confirm), counter, empty state. Export button generates `.xlsx` (sheet `History INAK ESAK`, auto-width, max 40) or `.csv`. Filename `history_inak_esak_YYYYMMDD_HHMMSS.xlsx`.

### F9. DICOM tags inspector

Read-only table of all DICOM tags (`Description | Value`, values truncated 300 chars) for the loaded file. Scan-text tab from desktop is removed.

---

## 3. Tech Stack

- **App:** SvelteKit 2, Svelte 5 (runes), TypeScript `strict`, Vite 5, Tailwind CSS 3, adapter-cloudflare
- **DICOM browser:** `dicom-parser@1.8.x` for tags; pixel rendering hand-rolled (windowing WindowCenter/Width, MONOCHROME1 invert, normalize to uint8, put to canvas). No cornerstone for v1 to keep bundle small.
- **Server:** SvelteKit `+server.ts` endpoints running on Workers (nodejs_compat on).
- **DB:** Cloudflare D1 (SQLite) via `drizzle-orm@0.3x` + `drizzle-kit`, schema in `src/lib/db/schema.ts`.
- **Excel:** `xlsx@0.18.x` (SheetJS) server-side.
- **Validation:** `zod@3.x` shared for API + forms.

## 4. Commands

```bash
npm install
npm run dev              # vite dev + local D1 (wrangler)
npm run check            # svelte-check + tsc --noEmit
npm run lint             # eslint . --fix + prettier --check .
npm run test             # vitest run (unit)
npm run test:e2e         # playwright test

npx wrangler d1 create radiology-db
npx wrangler d1 execute radiology-db --local --file=./drizzle/0001_init.sql
npx wrangler d1 execute radiology-db --file=./drizzle/0001_init.sql   # remote seed incl. DRL
npm run build
npm run preview
npm run deploy           # wrangler pages deploy .svelte-kit/cloudflare
```

Node 20+, npm 10+. No Python required.

## 5. Project Structure

```
radiologi-web/
  spec.md                 # this file (source of truth)
  wrangler.toml           # pages + d1 binding DB
  drizzle.config.ts
  drizzle/
    0001_init.sql         # tables + DRL seed (generated from old drl_config.json)
  src/
    routes/
      +layout.svelte      # header, nav: Viewer | Dosimetry | History
      +page.svelte        # F1+F2: upload, file list, ImageViewer, patient card
      dosimetry/+page.svelte  # F4+F5+F6+F7 tabs
      history/+page.svelte    # F8
      api/history/+server.ts  # GET (paginated) POST DELETE
      api/history/export/+server.ts  # GET ?format=xlsx|csv
      api/calibration/+server.ts     # GET POST (sets + points)
      api/drl/+server.ts      # POST assess {inak,esak,dap,study,...} -> DRLResult
    lib/
      dicom.ts            # parse arrayBuffer -> {metadata, imageData, width, height}
      dose.ts             # calculateY/INAK/ESAK, calculateDAP chain
      drl.ts              # DRLEngine port (match/normalize/age/compare)
      drl-data.json       # ported config (also seeded to D1)
      calibration.ts      # fitPowerRegression, toMicroGy
      db/schema.ts        # drizzle D1 schema
      db/client.ts        # getDb(platform.env.DB)
      format.ts           # number/decimal helpers (6dp INAK, 4dp DAP/mAs)
      validation.ts       # zod schemas
    components/
      ImageViewer.svelte
      PatientCard.svelte
      ExposureForm.svelte
      CalibrationTable.svelte
      DapForm.svelte
      DrlBadge.svelte
      HistoryTable.svelte
      TagsTable.svelte
  tests/
    dose.test.ts
    drl.test.ts           # must include thoracolumbar-vs-lumbar priority case
    calibration.test.ts
  e2e/
    flow.spec.ts          # upload fixture -> fill -> calculate -> history -> export
  static/
  fixtures/               # anonymized .dcm sample (no PHI)
```

**D1 schema (v1):**

```sql
calculations(id INTEGER PK, created_at TEXT, patient_id TEXT, patient_name TEXT,
  gender TEXT, age TEXT, weight_kg REAL, exam_type TEXT, view TEXT,
  kvp REAL, ma REAL, time_s REAL, mas REAL,
  inak_mgy REAL, esak_mgy REAL, dap_mgy_cm2 REAL,
  drl_limit_text TEXT, drl_status TEXT); -- below|equal|above|''
calibration_sets(id INTEGER PK, name TEXT, coeff_a REAL, coeff_b REAL, r2 REAL, created_at TEXT);
calibration_points(id INTEGER PK, set_id INTEGER FK, kvp REAL, mas REAL, mgy REAL);
drl_entries(id INTEGER PK, exam TEXT, view TEXT, age_group TEXT, metric TEXT,
  drl_inak REAL, drl_esak REAL, drl_dap REAL);
```

Images are never stored — only numbers + metadata.

## 6. Code Style

- Svelte 5 runes (`$state`, `$derived`, `$props`), TypeScript strict, no `any` (use `unknown` + narrow).
- Named exports only. Files `camelCase.ts`, components `PascalCase.svelte`.
- All math in `src/lib/` pure functions (no UI imports) so vitest can cover them.
- Units in names: `*_mgy`, `*_s`, `*_cm2`. Display formatting only in components via `format.ts`.
- Indonesian UI labels (match desktop: "Hitung INAK dan ESAK", "Berat Badan", "Hasil DRL"). Code + comments in English.

Example:

```svelte
<script lang="ts">
  import { calculateAll } from '$lib/dose';
  let { kvp = $bindable(0), ma = $bindable(0), timeS = $bindable(0) } = $props();
  let result = $derived(
    kvp > 0 && ma > 0 && timeS > 0
      ? calculateAll({ kvp, ma, timeS, bsf: 1.35, coeffA: 0.0004, coeffB: 2.5917 })
      : null
  );
</script>

<button onclick={() => result && onSave(result)} disabled={!result}> Hitung INAK dan ESAK </button>
```

## 7. Testing Strategy

- **Unit (vitest, `tests/`):** `dose.ts` (y/INAK/ESAK + DAP chain vs desktop golden numbers), `drl.ts` (exam match incl. thoracolumbar priority, view alias, age buckets, fallback adult/first-view, tolerance compare), `calibration.ts` (µGy conversion + regression R²≈1 on linear-log fixture). Target ≥80% on `lib/`.
- **E2E (playwright, `e2e/`):** one critical path with anonymized DICOM fixture: upload → metadata visible → auto-filled kVp → Hitung → DRL badge visible → history row → export xlsx downloads (check content-type). Run against `preview` build.
- **Manual:** test 3 real DICOMs (Chest PA adult, Skull Lateral, Panoramic) + 1 JPG (empty-state path). Verify numbers match desktop app to 4 decimals.

## 8. Boundaries

- **Always:** run `npm run check` + `npm run test` before commit; validate all API input with zod; never store uploaded image bytes; anonymize fixtures (no real patient names).
- **Ask first:** D1 schema change, new npm dependency, changing DRL reference numbers, adding auth, storing images in R2.
- **Never:** commit `wrangler.toml` secrets / API tokens / `.dev.vars`; commit real PHI DICOMs; re-add OCR libs (easyocr/paddle/torch); edit `drizzle/` SQL by hand without regenerating via drizzle-kit (except seed).

## 9. Success Criteria (testable)

1. `npm run dev` loads 3 nav pages with no console errors.
2. Upload anonymized Chest PA DICOM → patient + kVp/mA/time auto-filled, image renders, tags table non-empty.
3. INAK/ESAK result matches desktop Python `INAKESAKCalculator` to 4 decimals on 3 fixtures.
4. DAP result matches desktop `DAPCalculator` to 4 decimals.
5. DRL: Chest PA adult INAK 0.25 → Above; Panoramic with DAP tag → DAP verdict; unknown exam → "Tidak ada referensi" message.
6. Calibration: enter 3 rows kVp/mGy → Hitung → Rumus Y shows `y = …` + R², coeffs update, next INAK uses new coeffs.
7. History persists across reload (D1), delete/clear work with confirm, export xlsx opens in Excel with 16 columns.
8. `npm run build` + `preview` + deploy to `*.pages.dev` works; D1 bound, no Node-only imports in client bundle.

## 10. Open Questions (need answers before Plan)

1. Excel export: xlsx only, or must also keep CSV? (desktop history had both)
2. DAP panel previously hidden (`hide()` in center_panel) — in web show both INAK and DAP side-by-side?
3. Keep simplified mSv dose estimator (`DoseCalculator`, chest-X-ray comparison) or drop it? Desktop had it half-wired.
4. Language: full Indonesian UI, or Indonesian + English toggle?
5. Do we need to import old desktop history (SQLite `radiology_reader.db`) into D1 once?
6. Custom domain or `*.pages.dev` enough for v1?
