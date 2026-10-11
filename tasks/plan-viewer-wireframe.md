# Implementation Plan: Viewer Workstation Rebuild (wireframe)

> Status: PROPOSED 2026-10-11. Awaiting human approval — no implementation started.
> Supersedes direction of `plan-viewer-pacs.md` for the `/` route (that plan's
> PACS tools — toolbar, W/L, ruler, thumbnails, dark island — are kept and reused).
> `plan.md` / `todo.md` stay untouched (historical record v1).

## Overview

Rebuild `/` as the wireframe's DICOM workstation: top bar (`Radiologi Reader /
DICOM Workstation` + `Viewer · Dosimetri · History` nav), toolbar row (`Open
study`, `Window/Level`, `Pan`, `Zoom`, `Measure`, `Reset`), three columns
(Studies tree | viewport + slice status | Study info + DICOM Tags expander).
Series-aware browsing (Study → Series → slice scroll, e.g. `Slice 120 / 240`)
over the existing single-file engine. Dosimetry, History, API, D1 schema are
**untouched** — zero backend changes; images still never leave the browser.

## Architecture Decisions

- **Series = ordered file stack, not multi-frame parsing.** CT series arrive as
  many single-frame files (one slice each). Stack them by `InstanceNumber`;
  `extractPixels` stays single-frame. Rationale: matches real PACS exports and
  our current parser; multi-frame pixel data explicitly out of scope.
- **Metadata eagerly, pixels lazily.** All files parsed for tags on import
  (cheap, needed for grouping); pixel decode + render only for the visible
  slice with a small neighbor cache. Rationale: 240-slice series must not
  decode 240 images up front (memory + import time).
- **Pure grouping in new `src/lib/study.ts`.** `groupIntoStudies(files)` from
  parsed metadata; no Svelte imports (TDD like `drl.ts`, `measure.ts`).
- **UIDs parsed in `dicom.ts` (additive fields only).** `StudyInstanceUID`
  `(0020,000D)`, `SeriesInstanceUID` `(0020,000E)`, `SeriesNumber`,
  `InstanceNumber`, `SOPInstanceUID`, `NumberOfFrames`. Missing UIDs (plain
  X-ray, JPG) fall back to today's flat behavior: one pseudo-study per file.
  Rationale: no regression for the X-ray dosimetry path.
- **Wheel = slice scroll when the active series has >1 slice, else zoom**
  (today's behavior). Rationale: PACS convention; single-image case unchanged,
  so existing muscle memory and e2e hold.
- **Top bar replaces the sidebar globally** (approved: sidebar deleted, incl.
  its collapse toggle). Dosimetry/History keep their page content, new chrome only.
- **Patient ID masked** (`•••••••` + last digits? wireframe shows full mask;
  default full mask) in Study info; full values stay in tags table + dosimetry
  flow (needed for history/DRL).
- **No new npm deps** (AGENTS.md boundary); icons hand-rolled in
  `ViewerIcon.svelte` as before.

## Task List

### Phase 1: Shell (no behavior change)

- [ ] Task 1: Top bar + toolbar row + 3-column grid (S–M)
- [ ] Task 2: Single-file behavior preserved in new shell (S)

### Checkpoint: Shell

- [ ] `npm run check` + `npm run test` green
- [ ] Screenshots (empty + loaded fixture, 1280 + 390) reviewed with human
- [ ] Existing e2e selectors updated, suite green on `preview` build

### Phase 2: Studies model + panel

- [ ] Task 3 (TDD): UID parsing in `dicom.ts` (S–M)
- [ ] Task 4 (TDD): `study.ts` grouping/sorting (M)
- [ ] Task 5: Studies tree UI + selection model (M)

### Checkpoint: Studies

- [ ] `check` + `test` green; folder with 2 series browsable, selection drives viewer
- [ ] X-ray single file still opens as one pseudo-study (no regression)

### Phase 3: Slice scroll

- [ ] Task 6 (TDD): slice stack model + lazy decode (M)
- [ ] Task 7: Scroll UI (wheel/keys/buttons) + slice indicator (M)

### Checkpoint: Slices

- [ ] 240-slice synthetic series scrolls smoothly; indicator `Slice N / 240` correct
- [ ] Single-slice wheel still zooms; e2e green

### Phase 4: Info + polish + docs

- [ ] Task 8: Study info card (masked ID) + DICOM Tags expander (S)
- [ ] Task 9: E2E series fixtures + specs + docs (S–M)

### Checkpoint: Complete

- [ ] All acceptance criteria met, branch pushed, human review → merge
- [ ] `spec.md` § + README updated for workstation behavior

## Task details

### Task 1: Top bar + toolbar row + 3-column grid

**Description:** Replace sidebar chrome in `+layout.svelte` with the wireframe's
top bar (brand left, `Viewer · Dosimetri · History` links right). Rebuild `/`
grid as Studies (280px) | viewport (1fr) | info (300px). Move the existing
`ImageViewer` toolbar into the toolbar row; Studies panel temporarily lists
files flat (today's filmstrip content); right column keeps `PatientCard`.

**Acceptance criteria:**

- [ ] No sidebar on any route; top nav reaches all 3 pages with active state
- [ ] Viewer tools (W/L, Pan, Zoom, Measure, Reset, Invert, 1:1, rotate) all
      present and working as today
- [ ] Mobile (<xl) stacks: viewport → studies → info

**Verification:**

- [ ] `npm run check` green + screenshots 1280/390 (empty + loaded)
- [ ] E2E suite updated for new nav selectors, green on `preview`

**Dependencies:** None

**Files likely touched:**

- `src/routes/+layout.svelte`
- `src/routes/+page.svelte`
- `src/components/ImageViewer.svelte` (toolbar slot only)

**Estimated scope:** Medium (3 files)

### Task 2: Single-file behavior preserved in new shell

**Description:** Guard task: today's flows (upload file/folder, film-equivalent
list, overlays, tags table, dosimetry auto-fill via shared `activeFile`) work
identically in the new shell before series logic lands.

**Acceptance criteria:**

- [ ] Upload → render → metadata → dosimetry auto-fill unchanged
- [ ] No page-level horizontal overflow with chest + long-strings fixtures

**Verification:**

- [ ] `npm run test:e2e` (updated specs) green; overflow probe `0` both fixtures

**Dependencies:** Task 1

**Files likely touched:**

- `e2e/*.spec.ts` (selectors only)

**Estimated scope:** Small (1–2 files)

### Task 3 (TDD): UID parsing in `dicom.ts`

**Description:** Additive metadata fields: `studyUid`, `seriesUid`,
`seriesNumber` (nullable), `instanceNumber` (nullable), `sopUid`,
`numberOfFrames`. Missing tags → `null`/empty (never throw).

**Acceptance criteria:**

- [ ] RED: UID/instance-number tests fail before implementation
- [ ] GREEN: parsed correctly from synthetic dataset; absent tags → null
- [ ] All 84 existing `dicom.test.ts` tests still pass unchanged

**Verification:**

- [ ] `npm run test -- tests/dicom.test.ts` green

**Dependencies:** Task 1 (parallel safe)

**Files likely touched:**

- `src/lib/dicom.ts`
- `tests/dicom.test.ts`

**Estimated scope:** Small–Medium (2 files)

### Task 4 (TDD): `study.ts` grouping/sorting

**Description:** Pure `groupIntoStudies(metas)` → Study (`studyUid` fallback:
file index) → Series (`seriesUid` fallback: description/body-part) → slices
sorted by `instanceNumber` (fallback: filename). Labels: `Study 001`,
`N series · M images`, `Series 01 + SeriesDescription`.

**Acceptance criteria:**

- [ ] RED: grouping/sort/fallback tests fail before implementation
- [ ] GREEN: 2-series fixture groups correctly; UID-less files each become
      one single-slice pseudo-study; slices sorted numerically not lexically
      (`2` before `10`)

**Verification:**

- [ ] `npm run test -- tests/study.test.ts` green

**Dependencies:** Task 3

**Files likely touched:**

- `src/lib/study.ts` (new)
- `tests/study.test.ts` (new)

**Estimated scope:** Medium (2 files)

### Task 5: Studies tree UI + selection model

**Description:** New `StudiesPanel.svelte`: Study → Series tree (counts,
active highlight), selection in `session.ts` (`studyUid → seriesUid`, slice
reset to 0). Viewer/patient/tags follow selection via existing `activeFile`
 updates. Folder import stays the primary multi-file path.

**Acceptance criteria:**

- [ ] Tree shows studies/series with counts; click selects (viewer + info update)
- [ ] Single X-ray file → one entry, identical UX to today

**Verification:**

- [ ] Screenshot: 2-study tree with active highlight + e2e green

**Dependencies:** Tasks 1, 4

**Files likely touched:**

- `src/components/StudiesPanel.svelte` (new)
- `src/lib/session.ts`
- `src/routes/+page.svelte`

**Estimated scope:** Medium (3 files)

### Task 6 (TDD): Slice stack model + lazy decode

**Description:** Stack model for the active series: metadata list eager, pixel
decode on demand with neighbor cache (current ±2, evict rest). Pure helpers
(clamp index, cache window) unit-tested; component keeps today's render path
for single-slice.

**Acceptance criteria:**

- [ ] RED: index-clamp + cache-window tests fail before implementation
- [ ] GREEN: out-of-range indices clamp; import of 240 files decodes ≤5 up front

**Verification:**

- [ ] `npm run test` green; import-time assertion in test (decode counter)

**Dependencies:** Task 5

**Files likely touched:**

- `src/lib/study.ts` (stack helpers)
- `tests/study.test.ts`
- `src/routes/+page.svelte` (decode orchestration)

**Estimated scope:** Medium (3 files)

### Task 7: Scroll UI + slice indicator

**Description:** Wheel over viewport scrolls slices when stack >1 (else zoom,
unchanged); keyboard ↑/↓ + prev/next buttons; overlay status `Zoom N% · Slice
i / N`; dosimetry auto-fill follows the active slice's file.

**Acceptance criteria:**

- [ ] Multi-slice: wheel/keys/buttons move slices, indicator exact at both ends
- [ ] Single-slice: wheel zooms exactly as today (no regression)

**Verification:**

- [ ] E2E: synthetic 12-slice series scrolls end-to-end; indicator asserted
- [ ] Screenshot: mid-stack viewport with indicator

**Dependencies:** Task 6

**Files likely touched:**

- `src/components/ImageViewer.svelte`
- `src/routes/+page.svelte`

**Estimated scope:** Medium (2 files)

### Task 8: Study info card + DICOM Tags expander

**Description:** Right column becomes wireframe's Study info (Patient ID masked,
Modality, Series) + `DICOM Tags →` collapsible reusing `TagsTable` (internal
scroll, wrap-safe pagination as today).

**Acceptance criteria:**

- [ ] Info matches active slice's series; ID masked, modality/series correct
- [ ] Tags expand/collapse without layout shift or page overflow

**Verification:**

- [ ] Screenshots (collapsed + expanded) + e2e green

**Dependencies:** Tasks 1, 5 (parallel safe after Task 5)

**Files likely touched:**

- `src/components/StudyInfoCard.svelte` (new, or extend `PatientCard` — decide in task)
- `src/components/TagsTable.svelte`
- `src/routes/+page.svelte`

**Estimated scope:** Small (2–3 files)

### Task 9: E2E series fixtures + specs + docs

**Description:** Python generator for a synthetic multi-series study (shared
StudyUID, 2 SeriesUIDs, InstanceNumbers, no PHI) following
`e2e/fixtures/generate_long_strings.py`; specs for tree selection + slice
scroll + overflow; `spec.md` + README updated.

**Acceptance criteria:**

- [ ] `npm run test:e2e` green incl. new series/slice specs on `preview`
- [ ] Docs describe workstation behavior, wheel convention, masked ID

**Verification:**

- [ ] Full gates: `check` + `test` + `test:e2e` green on fresh build

**Dependencies:** Tasks 7, 8

**Files likely touched:**

- `e2e/fixtures/generate_series.py` (new) + generated `.dcm` files
- `e2e/*.spec.ts`, `spec.md`, `README.md`

**Estimated scope:** Small–Medium (4+ files, generated DICOMs)

## Dependency Graph

```
T1 shell ─┬─ T2 behavior-guard ─┬─ (checkpoint: shell)
          │                     └─ T7 e2e-selectors (folded into T2/T9)
          ├─ T3 UIDs (∥ T1) ── T4 grouping ── T5 tree ── T6 stack ── T7 scroll
          └─ T8 info/tags (after T5)
T9 fixtures/specs/docs (after T7+T8)
```

Parallel safe: T3 ∥ T1; T8 after T5 only. Everything else sequential
(shared `session.ts` + viewer state — needs coordination, not parallel work).

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| 240-slice import too slow / memory blowup | High | Lazy pixels (T6) + decode-counter test; folder import stays chunked with existing per-file error path |
| Wheel-scroll vs zoom confusion | Med | Convention fixed: stack>1 scrolls, else zooms; e2e locks both; noted in docs |
| Multi-frame DICOMs (real CT sometimes) | Med | Out of scope v1: first-frame render + slice count from files; clear error if a file has frames but no siblings (do not silently misrender) |
| UID-less / mixed folders group badly | Med | Fallback rules in T4 + tests (pseudo-studies); folder error message unchanged when nothing importable |
| Sidebar removal orphans e2e selectors | Low | T2 updates specs first; nav links keep accessible names |
| Scope creep (MPR, ROI, C-STORE, print) | High | Explicitly out; any such request becomes a new plan, not a task edit |

## Open Questions

1. Masked ID format: full `•••••••` (wireframe) vs last-3-digits visible? — default full mask unless told otherwise.
2. Scout/second series: display-only in tree (no special handling)? — default yes.
3. "Open study" = folder picker as today, plus file picker kept for single files? — default yes.
4. Series with mixed modalities / inconsistent slices: trust InstanceNumber order, no validation beyond count? — default yes, note in docs.

## Verification (plan-level, before implementation)

- [ ] Every task has acceptance criteria (≤3 bullets) — done above
- [ ] Every task has a verification step — done above
- [ ] Dependencies ordered; no task touches >5 files — done above
- [ ] Checkpoints between phases — done above
- [ ] Human has reviewed and approved this plan — PENDING
