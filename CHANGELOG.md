# Changelog

## [Unreleased]

### Added

- Viewer workstation (ganti sidebar): top bar + nav, panel Studies (tree
  Study → Series dari UID, scroll iris CT dengan indikator Slice i/N,
  lazy decode + cache LRU), kartu Study info (Patient ID mask), expander
  DICOM Tags (ringkasan + inspector full-width: Tag ID/Nama/VR/Nilai,
  paginasi + pilihan 15/25/50/100), panel Studies resizable (160–400px,
  tersimpan) + collapsible, refit otomatis kecuali zoom manual
- Kalkulasi mAs langsung: file tanpa mA/waktu tetapi punya mAs (0018,1152)
  tetap bisa dihitung (divergensi desktop yang disetujui); mA/waktu
  nullable di D1 (`drizzle/0002`), tampil/export kosong (bukan 0)
- Kamus tag 36 → 62 entri; tag tak dikenal berlabel `Unknown/Private tag`
- E2E: series multi-slice, resize/collapse panel, preservasi zoom manual,
  salin study info, batas payload history (16 field skalar, tanpa byte citra)

### Changed

- Live: https://radiologi.purwarupa.net (domain kustom)
- Favicon biru + logo x-ray; toggle sidebar pindah ke atas (lalu sidebar
  dihapus saat workstation); "Tentang Aplikasi" dihapus

### Fixed

- Fit viewport memakai batas maksimum kotak (citra tinggi tak lagi dibuka
  kekecilan); DAP dinilai dari hasil hitung (bukan tag DICOM); impor folder
  menerima file tanpa ekstensi; dialog file default All Files

## [0.1.1] - 2026-09-16

### Fixed

- `npm ci` Pages ERESOLVE: pin `@cloudflare/workers-types` ke v4 (wrangler 3 menolak v5)
- `lint`: abaikan artefak lokal `.wrangler/`, `test-results/`, `playwright-report/`; `endOfLine: auto` untuk checkout Windows

### Changed

- Produksi pindah ke akun `agungmalik050@gmail.com`: live di https://radiology-reader-web-bkw.pages.dev (D1 dibuat ulang + seed 39 baris DRL, tanpa migrasi — history lama kosong)

## [0.1.0] - 2026-09-16

Port awal desktop Radiology Reader ke web (SvelteKit + Cloudflare D1).

### Added

- Viewer DICOM/gambar di browser: zoom/pan, metadata pasien otomatis, tabel tag
- Hitung INAK/ESAK (auto-fill DICOM) + penilaian DRL otomatis (badge Below/Equal/Above)
- Tabel kalibrasi manual + Rumus Y (regresi power, update koefisien otomatis)
- Hitung DAP (panel hidden by default, toggle Tampilkan DAP) + DRL DAP
- Estimasi dosis mSv + perbandingan chest X-ray (parity desktop)
- History D1: paginasi, hapus baris/semua, export `.xlsx` + `.csv` (16 kolom)
- API: `/api/history`, `/api/history/export`, `/api/drl`, `/api/calibration`
- Deploy perdana: https://radiology-reader-web.pages.dev (D1 `radiology-db`, 39 baris DRL)

### Removed

- Seluruh fitur OCR desktop (scan teks EasyOCR, impor tabel kalibrasi PaddleOCR)
