# Implementation Plan: Viewer PACS Workstation

> Status: APPROVED 2026-10-02. Port the Figma "DICOM viewer (Community)"
> design language to the viewer route (`/`). Design language only — the
> example is React+MUI+Radix and cannot be reused as code.

## Overview

Rebuild `/` as a PACS-style workstation: slim mono header strip
(patient + study + tool buttons), file rail with thumbnails (left),
black reading-room viewport with 4-corner overlays (center), grouped
collapsible metadata panel (right). New tools: W/L drag windowing on
real pixels and ruler measurement. Dosimetry and history pages are
untouched. All math stays pure in `src/lib/` under TDD.

## Architecture Decisions

- **Dark reading-room island scoped to `/` only** (clinically correct —
  radiologists read in the dark). Rest of app keeps the light
  minimalist theme from `ui/minimalist-light`.
- **Hand-rolled SVG icons** (`ViewerIcon.svelte`, ~7 stroke icons), zero
  new deps (AGENTS.md: new deps need approval; `lucide-svelte` rejected).
- **Ruler falls back to px** when Pixel Spacing `(0028,0030)` is missing
  (common in CR/DX).
- **Cut CT-isms**: slice slider, CT window presets, ROI, multi-series,
  measurement persistence. Single-frame X-ray only.
- **Keep e2e selectors stable**: heading `Browser`, file button text =
  filename, `Tag DICOM (N)` heading text, `canvas` present.

## Task List

### Phase 1: Shell (no logic changes)

- [ ] Task 1: Dark island + slim header strip (S)
- [ ] Task 2: 4-corner dense overlays (S)
- [ ] Task 3 (TDD): Grouped collapsible metadata (S–M)

### Checkpoint: Shell

- [ ] `npm run check` + `npm run test` green
- [ ] Screenshots reviewed with human (empty + loaded fixture)
- [ ] e2e selectors intact (`Browser`, filename button, `Tag DICOM (N)`)

### Phase 2: Tools (behavior)

- [ ] Task 4: Toolbar tool model + icons (M)
- [ ] Task 5 (TDD): W/L drag windowing (M)
- [ ] Task 6 (TDD): Ruler measurement (S)

### Checkpoint: Tools

- [ ] `check` + `test` + e2e (`preview` build) green
- [ ] Screenshots: W/L contrast change, ruler overlay

### Phase 3: Rail

- [ ] Task 7: File-rail thumbnails (S, parallel with 4–6 after Task 1)

### Checkpoint: Complete

- [ ] All acceptance criteria met, branch pushed, human review → merge

## Task details

### Task 1: Dark island + slim header strip

**Description:** Scope a dark reading-room theme to the viewer route and
add a 44px header strip: file/patient mono text + study text + tool
slot. Global light theme untouched.

**Acceptance criteria:**
- [ ] `/` renders dark island (near-black panels, hairline borders);
  `/dosimetry` and `/history` still light
- [ ] Heading `Browser` still present (e2e smoke)
- [ ] No new npm dependencies

**Verification:**
- [ ] `npm run check` green
- [ ] Screenshots: `/` dark, `/dosimetry` light

**Dependencies:** None

**Files likely touched:**
- `src/routes/+page.svelte`

**Estimated scope:** Small (1–2 files)

### Task 2: 4-corner dense overlays

**Description:** Extend the viewport overlay snippet to PACS density:
TL patient/study, TR modality/view, BL dims/zoom, BR kVp/mA/mAs/DAP.
Mono 11px, cyan-tinted like the example.

**Acceptance criteria:**
- [ ] All four corners show correct values from active file metadata
- [ ] Empty state keeps current "Belum ada gambar" text
- [ ] Overlay stays pointer-events-none (pan/drag unaffected)

**Verification:**
- [ ] Screenshot with Panoramic fixture: corners legible over image

**Dependencies:** Task 1

**Files likely touched:**
- `src/routes/+page.svelte`

**Estimated scope:** Small (1 file)

### Task 3 (TDD): Grouped collapsible metadata

**Description:** Group flat DICOM tags into modules (Patient, Study,
Image, Lainnya) via pure `groupDicomTags()` + small tag-name map for
~15 known tags; `TagsTable` becomes collapsible groups. Heading keeps
`Tag DICOM (N)` text (e2e flow).

**Acceptance criteria:**
- [ ] RED: `tests/dicomGroups.test.ts` fails (module missing)
- [ ] GREEN: grouping correct, unknown tags → `Lainnya`, known tag
  `(0010,0010)` displays `Patient Name`
- [ ] Groups collapse/expand; dark styling

**Verification:**
- [ ] `npm run test -- tests/dicomGroups.test.ts` green
- [ ] e2e flow `Tag DICOM (\d+)` assertion still passes

**Dependencies:** Task 1

**Files likely touched:**
- `src/lib/dicomGroups.ts` (new)
- `tests/dicomGroups.test.ts` (new)
- `src/components/TagsTable.svelte`

**Estimated scope:** Small–Medium (3 files)

### Task 4: Toolbar tool model + icons

**Description:** Single-active-tool segmented control (Window, Pan,
Zoom, Ruler) + Invert + Reset in the viewport toolbar, backed by a
hand-rolled `ViewerIcon.svelte`. Wire pan/zoom/invert/reset to existing
`ImageViewer` logic; window/ruler select state only (wired in Tasks 5–6).

**Acceptance criteria:**
- [ ] Exactly one active tool; switching updates cursor affordance
- [ ] Existing zoom/pan/reset/invert behavior unchanged
- [ ] No icon library dependency; Edge-safe inline SVG

**Verification:**
- [ ] `npm run check` green + screenshot of toolbar states

**Dependencies:** Task 1

**Files likely touched:**
- `src/components/ViewerIcon.svelte` (new)
- `src/components/ImageViewer.svelte`

**Estimated scope:** Medium (2 files)

### Task 5 (TDD): W/L drag windowing

**Description:** Keep raw rescaled pixels from `extractPixels`
(backward-compatible `raw` field), add pure `applyWindow(raw, wc, ww)`,
drag-H=WW / drag-V=WL in Window tool, reset restores. Default WC/WW =
data min-max so initial render is pixel-identical to today.

**Acceptance criteria:**
- [ ] RED: `applyWindow` ramp test fails before implementation
- [ ] GREEN: known WC/WW maps black/gray/white exactly; `ww<=0`
  guarded; default view unchanged vs current render
- [ ] Drag updates contrast live; Reset restores; overlay BR shows
  live WW/WL values

**Verification:**
- [ ] `npm run test -- tests/dicom.test.ts` green (incl. new cases)
- [ ] Screenshot: dragged vs default contrast visibly differs

**Dependencies:** Task 4

**Files likely touched:**
- `src/lib/dicom.ts`
- `tests/dicom.test.ts`
- `src/components/ImageViewer.svelte`

**Estimated scope:** Medium (3 files)

### Task 6 (TDD): Ruler measurement

**Description:** Ruler tool: click-click places a dashed cyan line with
mm/px label (pure `measureDistance()` in new `src/lib/measure.ts`),
list of measurements + clear, SVG overlay. Pixel spacing parsed from
`(0028,0030)` into metadata (nullable).

**Acceptance criteria:**
- [ ] RED: 3-4-5 triangle + spacing tests fail first
- [ ] GREEN: `0.5mm` spacing → `2.5 mm`; missing spacing → `5 px`
- [ ] Overlay lines + labels render; Clear removes all

**Verification:**
- [ ] `npm run test -- tests/measure.test.ts tests/dicom.test.ts` green
- [ ] Screenshot: ruler line + label on fixture image

**Dependencies:** Task 4 (Task 5 independent — parallel safe)

**Files likely touched:**
- `src/lib/measure.ts` (new)
- `tests/measure.test.ts` (new)
- `src/lib/dicom.ts` (`pixelSpacingMm`)
- `src/components/ImageViewer.svelte`

**Estimated scope:** Small–Medium (3–4 files)

### Task 7: File-rail thumbnails

**Description:** Render parsed-image thumbnails in the left file rail
(small canvas per file), active highlight, keep search + filename
button text (e2e flow). Raster (JPG/PNG) files reuse their bitmap.

**Acceptance criteria:**
- [ ] Each file shows a recognizable thumbnail; active file highlighted
- [ ] Filename button text unchanged; search filter still works
- [ ] No `canvas` count regression for e2e (thumbnails are extra
  canvases — flow.spec uses `toHaveCount(0)` only in broken-file state
  with no valid image, so safe)

**Verification:**
- [ ] Screenshot with 2 loaded files
- [ ] e2e flow suite green on `preview` build

**Dependencies:** Task 1 (parallel safe with Tasks 4–6)

**Files likely touched:**
- `src/routes/+page.svelte`

**Estimated scope:** Small (1 file)

## Dependency Graph

```
T1 shell ─┬─ T2 overlays
          ├─ T3 metadata (TDD)
          ├─ T4 toolbar ─┬─ T5 W/L (TDD)
          │              └─ T6 ruler (TDD, ∥ T5)
          └─ T7 thumbnails (∥ T4–T6)
```

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| W/L changes default render | High | Default WC/WW = data min-max → pixel-identical; golden tests stay |
| `extractPixels` return-shape change breaks callers | Med | Additive `raw` field only; existing tests untouched |
| Thumbnail canvases break e2e `canvas` assertions | Med | Flow suite asserts `canvas` visible (still true) and count-0 only with no valid image |
| Dark island leaks to global theme | Low | Scoped classes on viewer route wrapper only, no `app.css` body changes |
| Ruler pixel-spacing missing | Low | Approved px fallback with unit label |

## Open Questions (resolved 2026-10-02)

1. Dark island vs full light → dark island, viewer only.
2. Icons → hand-rolled SVG, no new dep.
3. Ruler fallback → px with unit label.
4. Drive-by `vite dev` script fix → approved (`"dev": "vite"`).
