# AGENTS.md — Radiology Reader Web

> Applies to all agents, all sessions. Source of truth: `spec.md`.

## Project

SvelteKit 2 + Svelte 5 (runes) + TS strict + Tailwind 4 + adapter-cloudflare.
DICOM in browser (`dicom-parser`), D1 via `drizzle-orm`, `zod`, `xlsx` server-only.
Live: https://radiologi.purwarupa.net. No OCR (intentional).

## Commands

- `npm run dev` — Vite dev (no D1)
- `npm run check` — svelte-check + tsc (run before commit)
- `npm run lint` — eslint + prettier check
- `npm run test` — vitest (unit, `tests/`)
- `npm run test:e2e` — playwright chromium (against `preview`)
- `npm run build` / `preview` / `deploy` — cloudflare pages deploy

## Conventions

- Svelte 5 runes (`$state`, `$derived`, `$props`), TS strict, no `any` (use `unknown` + narrow).
- Named exports only. Files `camelCase.ts`, components `PascalCase.svelte`.
- All math pure in `src/lib/` (no UI imports) so vitest can cover it. Units in names: `*_mgy`, `*_s`, `*_cm2`.
- Display formatting only in components (`toFixed`: 6dp INAK/ESAK, 4dp DAP/mAs).
- Indonesian UI labels (match desktop: "Hitung INAK dan ESAK"). Code + comments in English.
- Alias `$components` → `./src/components` (see `svelte.config.js`).

## Boundaries

- Always: `npm run check` + `npm run test` before commit; zod-validate all API input; never store image bytes; anonymize fixtures (no PHI).
- Ask first: D1 schema change, new npm dep, changing DRL numbers, adding auth, storing images in R2.
- Never: commit secrets/`.dev.vars`/tokens, real PHI DICOMs, OCR libs (easyocr/paddle/torch); hand-edit `drizzle/*.sql` except seed.

## Workflow — Karpathy Guidelines (mandatory)

1. **Think before coding**: state assumptions explicitly. If multiple interpretations exist, present them — don't pick silently. If unclear, stop and ask.
2. **Simplicity first**: minimum code that solves the problem. No speculative features, abstractions, configurability, or impossible-case handling. 50 lines beats 200.
3. **Surgical changes**: touch only what the task requires. Match existing style. Don't refactor adjacent code. Clean up only orphans your own change created. Every changed line must trace to the request.
4. **Goal-driven**: define verifiable success criteria first (e.g. "repro test fails → passes", "`check` + `test` green"), then loop until verified. For multi-step work, emit brief plan: `1. [step] → verify: [check]`.
