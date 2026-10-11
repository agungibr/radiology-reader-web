-- B-full: kalkulasi mAs langsung tanpa mA/waktu.
-- SQLite/D1 tidak mendukung ALTER COLUMN, jadi tabel dibangun ulang
-- (kolom, data, dan id AUTOINCREMENT dipertahankan; tanpa index tambahan).
-- Apply: wrangler d1 execute radiology-db --file=./drizzle/0002_nullable_exposure.sql

CREATE TABLE calculations_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL,
  patient_id TEXT NOT NULL DEFAULT '',
  patient_name TEXT NOT NULL DEFAULT '',
  gender TEXT NOT NULL DEFAULT '',
  age TEXT NOT NULL DEFAULT '',
  weight_kg REAL,
  exam_type TEXT NOT NULL DEFAULT '',
  view TEXT NOT NULL DEFAULT '',
  kvp REAL NOT NULL,
  ma REAL,
  time_s REAL,
  mas REAL NOT NULL,
  inak_mgy REAL NOT NULL,
  esak_mgy REAL NOT NULL,
  dap_mgy_cm2 REAL,
  drl_limit_text TEXT NOT NULL DEFAULT '',
  drl_status TEXT NOT NULL DEFAULT ''
);

INSERT INTO calculations_new
  (id, created_at, patient_id, patient_name, gender, age, weight_kg,
   exam_type, view, kvp, ma, time_s, mas, inak_mgy, esak_mgy,
   dap_mgy_cm2, drl_limit_text, drl_status)
SELECT
  id, created_at, patient_id, patient_name, gender, age, weight_kg,
  exam_type, view, kvp, ma, time_s, mas, inak_mgy, esak_mgy,
  dap_mgy_cm2, drl_limit_text, drl_status
FROM calculations;

DROP TABLE calculations;
ALTER TABLE calculations_new RENAME TO calculations;
