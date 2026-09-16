# Todo: Radiology Reader Web

> Sumber kebenaran: `spec.md`. Urutan mengikuti `plan.md`. Centang hanya jika acceptance + verification lolos.

## Task 1: Scaffold SvelteKit + Cloudflare + Tailwind + tooling

**Description:** Inisialisasi proyek kosong `radiologi-web` menjadi SvelteKit+TS strict+Tailwind+adapter-cloudflare, dengan script check/lint/test/e2e dan `wrangler.toml` binding D1 `DB`.

**Acceptance criteria:**
- [ ] `npm run dev` jalan, 3 route placeholder render tanpa error console
- [ ] `npm run check` dan `npm run build` hijau
- [ ] `wrangler.toml` berisi `compatibility_date`, `nodejs_compat`, binding `[[d1_databases]]`

**Verification:**
- [ ] `npm run check`, `npm run build`
- [ ] Manual: buka `/`, `/dosimetry`, `/history` di dev

**Dependencies:** None

**Files likely touched:**
- `package.json`, `svelte.config.js`, `wrangler.toml`, `src/routes/+layout.svelte`
- `src/routes/+page.svelte`, `src/routes/dosimetry/+page.svelte`, `src/routes/history/+page.svelte`

**Estimated scope:** Medium (5 files)

---

## Task 2: Port dose + calibration math + unit tests

**Description:** Port `INAKESAKCalculator` + `DAPCalculator` + konversi µGy + regresi power ke `src/lib/dose.ts` dan `src/lib/calibration.ts` murni (tanpa UI), plus `format.ts`. Rumus harus identik desktop.

**Acceptance criteria:**
- [ ] `calculateAll({kvp,ma,timeS,bsf,coeffA,coeffB})` cocok desktop s.d. 4 desimal pada 3 fixture
- [ ] `calculateDap(...)` cocok desktop s.d. 4 desimal
- [ ] `fitPowerRegression` kembalikan `a,b,r2` benar pada fixture log-linear

**Verification:**
- [ ] `npm run test -- tests/dose.test.ts tests/calibration.test.ts`

**Dependencies:** Task 1

**Files likely touched:**
- `src/lib/dose.ts`, `src/lib/calibration.ts`, `src/lib/format.ts`, `src/lib/validation.ts`
- `tests/dose.test.ts`, `tests/calibration.test.ts`

**Estimated scope:** Medium (4-5 files)

---

## Task 3: Port DRL engine + data + unit tests

**Description:** Port `drl_engine.py` + `drl_config.json` ke `src/lib/drl.ts` + `src/lib/drl-data.json`: match exam (longest-keyword-first), alias view + kasus khusus Waters/Standard, bucket usia, fallback adult/view-pertama, compare toleransi 0.01%.

**Acceptance criteria:**
- [ ] `thoracolumbar` tidak salah match `lumbar`; `Sinus→Waters`; `Panoramic kosong→Standard`
- [ ] Usia `4→infant, 10→children, 30→adult, kosong→adult`
- [ ] Fallback adult + first-view bekerja; `below/equal/above` benar

**Verification:**
- [ ] `npm run test -- tests/drl.test.ts`

**Dependencies:** Task 1 (paralel dengan Task 2)

**Files likely touched:**
- `src/lib/drl.ts`, `src/lib/drl-data.json`
- `tests/drl.test.ts`

**Estimated scope:** Small (3 files)

---

## Task 4: D1 schema + seed DRL + drizzle client

**Description:** Buat schema drizzle + migrasi SQL + seed `drl_entries` dari `drl-data.json`. Tabel: `calculations`, `calibration_sets`, `calibration_points`, `drl_entries`.

**Acceptance criteria:**
- [ ] `wrangler d1 execute --local --file=./drizzle/0001_init.sql` sukses
- [ ] Jumlah `drl_entries` = jumlah kombinasi exam/view/age di JSON; query sample Chest PA adult kembalikan `inak 0.2 esak 0.2`
- [ ] `getDb()` dipakai server routes, tanpa import client-side

**Verification:**
- [ ] `npx wrangler d1 execute radiology-db --local --command="SELECT COUNT(*) FROM drl_entries"`
- [ ] `npm run check`

**Dependencies:** Task 2, Task 3

**Files likely touched:**
- `drizzle.config.ts`, `drizzle/0001_init.sql`
- `src/lib/db/schema.ts`, `src/lib/db/client.ts`, `src/lib/db/seed.ts`

**Estimated scope:** Medium (4 files)

---

## Task 5: API history + export (xlsx+csv) + DRL assess + kalibrasi

**Description:** Endpoints Workers: `GET/POST/DELETE /api/history`, `GET /api/history/export?format=xlsx|csv`, `POST /api/drl/assess`, `GET/POST /api/calibration`. Validasi zod, pesan error Indonesia.

**Acceptance criteria:**
- [ ] POST history tersimpan + GET paginasi 20/page + DELETE row + DELETE all
- [ ] Export `xlsx` (sheet `History INAK ESAK`, 16 kolom, auto-width) dan `csv` terdownload, filename `history_inak_esak_*.xlsx/csv`
- [ ] POST drl assess cocok dengan `lib/drl.ts` untuk kasus inak_esak dan dap

**Verification:**
- [ ] `npm run test -- tests/api.test.ts` + curl manual ke dev server + buka xlsx di Excel

**Dependencies:** Task 4

**Files likely touched:**
- `src/routes/api/history/+server.ts`, `src/routes/api/history/export/+server.ts`
- `src/routes/api/drl/+server.ts`, `src/routes/api/calibration/+server.ts`
- `src/lib/validation.ts`, `tests/api.test.ts`

**Estimated scope:** Medium (5 files)

---

## Task 6: Layout + upload + viewer canvas + patient card + tags

**Description:** Shell Indonesia (nav: Viewer | Dosimetri | History) + upload drag-drop + parser DICOM browser (`dicom.ts`: tags + windowing + MONOCHROME1 + normalize) + canvas viewer (fit/zoom/pan/reset) + kartu pasien + tabel Tags.

**Acceptance criteria:**
- [ ] Upload `.dcm`/JPG tampil di list sesi; pilih file render <2s untuk 5MB
- [ ] Pasien (ID/Nama/Umur/Gender/Tgl/Study/Modality/BodyPart/View/BB) tampil; JPG tampilkan empty-state "Tidak ada metadata DICOM"
- [ ] Zoom 0.15–8x, Fit, Reset, pan-drag, label `Ukuran` + `Zoom %`; tabel Tags tampil semua tag (truncate 300 char)

**Verification:**
- [ ] Manual 3 file (Chest PA DICOM, Skull DICOM, 1 JPG) + `npm run check`

**Dependencies:** Task 5

**Files likely touched:**
- `src/lib/dicom.ts`, `src/components/ImageViewer.svelte`, `src/components/PatientCard.svelte`
- `src/components/TagsTable.svelte`, `src/routes/+page.svelte`, `src/routes/+layout.svelte`

**Estimated scope:** Medium (5 files)

---

## Task 7: Form INAK/ESAK + tabel kalibrasi + Rumus Y + DAP hidden-toggle

**Description:** Tab Dosimetri default INAK full-width + tombol "Tampilkan DAP" (parity desktop `hide()`). Form eksposur auto-fill + badge DICOM + live mAs; tabel kalibrasi 6 baris + Hitung µGy + Tampilkan Rumus Y (update a,b + R²); tombol Hitung INAK dan ESAK simpan ke history + jalankan DRL.

**Acceptance criteria:**
- [ ] DAP hidden saat load, toggle tampil/sembunyi + persist `?tab=`; kVp/mA/s/BB/DAP auto-fill + editable, mAs live 4 desimal
- [ ] Kalibrasi: Hitung isi µGy/µGy-mAs; Rumus Y butuh ≥2 baris, tampil `y = a × kVp^b` + R², koef terupdate
- [ ] Hitung validasi kVp>0,mAs>0 (toast Indonesia), hasil 6 desimal + formula trace, auto-append history

**Verification:**
- [ ] Manual: isi 3 baris kalibrasi → Rumus Y → Hitung → history bertambah; `npm run check`

**Dependencies:** Task 5 (paralel aman dengan Task 6, 8)

**Files likely touched:**
- `src/components/ExposureForm.svelte`, `src/components/CalibrationTable.svelte`
- `src/routes/dosimetry/+page.svelte`

**Estimated scope:** Medium (3 files)

---

## Task 8: Form DAP + kartu DRL + History page + kartu estimasi mSv

**Description:** Form DAP (SID, luas, c1/c2/c3 + reset) + kartu DRL (badge hijau/kuning/merah + pesan tidak-cocok) + halaman History (tabel 16 kolom, hapus/hapus-semua + konfirmasi, counter, export xlsx+csv) + kartu "Estimasi Dosis (mSv)" parity desktop (weight input, base per exam, faktor usia/bb/gender, perbandingan chest X-ray).

**Acceptance criteria:**
- [ ] DAP tampil y/IAK_SDD/IAK_SID 6 desimal + DAP 4 desimal + trace; DRL badge benar untuk metric inak_esak dan dap
- [ ] History: paginasi, hapus 1/all konfirmasi, export dua format; estimasi mSv cocok `DoseCalculator` desktop pada 2 contoh

**Verification:**
- [ ] Manual: hitung DAP → badge; hapus baris; download xlsx+csv; `npm run check`

**Dependencies:** Task 5 (paralel aman dengan Task 6, 7)

**Files likely touched:**
- `src/components/DapForm.svelte`, `src/components/DrlBadge.svelte`
- `src/components/HistoryTable.svelte`, `src/components/DoseEstimateCard.svelte`
- `src/routes/history/+page.svelte`

**Estimated scope:** Medium (5 files)

---

## Task 9: E2E playwright + fixture anonim + parity check vs desktop

**Description:** Satu alur kritis: upload fixture DICOM anonim → auto-fill terlihat → isi kalibrasi minimal → Hitung → badge DRL → history → export xlsx+csv. Plus cek parity angka vs desktop.

**Acceptance criteria:**
- [ ] `npm run test:e2e` hijau di Chromium terhadap `preview` build
- [ ] Fixture tanpa PHI (nama/ID dummy); tidak ada gambar asli pasien di repo
- [ ] Parity 3 angka (INAK, ESAK, DAP) vs desktop ≤1e-4 terdokumentasi

**Verification:**
- [ ] `npm run build; npm run preview & npm run test:e2e`

**Dependencies:** Task 6, Task 7, Task 8

**Files likely touched:**
- `e2e/flow.spec.ts`, `fixtures/sample-chest-pa.dcm`, `playwright.config.ts`

**Estimated scope:** Small (3 files)

---

## Task 10: Build/preview/deploy pages.dev + rapikan docs

**Description:** Finalisasi `README.md` (cara dev/deploy/D1), pastikan `npm run build` + `preview` bersih, deploy ke `*.pages.dev` + seed DRL remote, verifikasi 8 success criteria spec.

**Acceptance criteria:**
- [ ] URL `*.pages.dev` live: 3 halaman tanpa console error, D1 bound
- [ ] Seed remote DRL terverifikasi via `/api/drl/assess` sample
- [ ] README berisi perintah dev/test/D1/deploy + catatan tanpa-OCR

**Verification:**
- [ ] `npm run build`, `npm run preview`, `npm run deploy`, curl endpoint remote

**Dependencies:** Task 9

**Files likely touched:**
- `README.md`, `wrangler.toml`, `drizzle/0001_init.sql`

**Estimated scope:** Small (3 files)
