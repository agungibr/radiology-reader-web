# Changelog

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
