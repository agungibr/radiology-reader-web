-- Radiology Reader Web — initial schema + DRL seed.
-- DRL rows generated from src/lib/drl-data.json (desktop drl_config.json).
-- Apply: wrangler d1 execute radiology-db --file=./drizzle/0001_init.sql

CREATE TABLE IF NOT EXISTS calculations (
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
  ma REAL NOT NULL,
  time_s REAL NOT NULL,
  mas REAL NOT NULL,
  inak_mgy REAL NOT NULL,
  esak_mgy REAL NOT NULL,
  dap_mgy_cm2 REAL,
  drl_limit_text TEXT NOT NULL DEFAULT '',
  drl_status TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS calibration_sets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL DEFAULT '',
  coeff_a REAL NOT NULL,
  coeff_b REAL NOT NULL,
  r2 REAL NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS calibration_points (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  set_id INTEGER NOT NULL REFERENCES calibration_sets(id),
  kvp REAL NOT NULL,
  mas REAL NOT NULL,
  mgy REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS drl_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  exam TEXT NOT NULL,
  view TEXT NOT NULL,
  age_group TEXT NOT NULL,
  metric TEXT NOT NULL,
  drl_inak REAL,
  drl_esak REAL,
  drl_dap REAL
);

DELETE FROM drl_entries;

INSERT INTO drl_entries (exam, view, age_group, metric, drl_inak, drl_esak, drl_dap) VALUES ('Panoramic', 'Standard', 'children', 'dap', NULL, NULL, 62.3);
INSERT INTO drl_entries (exam, view, age_group, metric, drl_inak, drl_esak, drl_dap) VALUES ('Panoramic', 'Standard', 'adult', 'dap', NULL, NULL, 120.0);
INSERT INTO drl_entries (exam, view, age_group, metric, drl_inak, drl_esak, drl_dap) VALUES ('Chest', 'AP', 'infant', 'dap', NULL, NULL, 3.4);
INSERT INTO drl_entries (exam, view, age_group, metric, drl_inak, drl_esak, drl_dap) VALUES ('Chest', 'AP', 'adult', 'inak_esak', 0.2, 0.3, NULL);
INSERT INTO drl_entries (exam, view, age_group, metric, drl_inak, drl_esak, drl_dap) VALUES ('Chest', 'PA', 'children', 'dap', NULL, NULL, 9.2);
INSERT INTO drl_entries (exam, view, age_group, metric, drl_inak, drl_esak, drl_dap) VALUES ('Chest', 'PA', 'adult', 'inak_esak', 0.2, 0.2, NULL);
INSERT INTO drl_entries (exam, view, age_group, metric, drl_inak, drl_esak, drl_dap) VALUES ('Abdomen', 'AP', 'adult', 'inak_esak', 0.9, 1.3, NULL);
INSERT INTO drl_entries (exam, view, age_group, metric, drl_inak, drl_esak, drl_dap) VALUES ('Ankle Joint', 'AP', 'adult', 'inak_esak', 0.2, 0.2, NULL);
INSERT INTO drl_entries (exam, view, age_group, metric, drl_inak, drl_esak, drl_dap) VALUES ('Ankle Joint', 'Lateral', 'adult', 'inak_esak', 0.2, 0.2, NULL);
INSERT INTO drl_entries (exam, view, age_group, metric, drl_inak, drl_esak, drl_dap) VALUES ('Antebrachi', 'AP', 'adult', 'inak_esak', 0.1, 0.2, NULL);
INSERT INTO drl_entries (exam, view, age_group, metric, drl_inak, drl_esak, drl_dap) VALUES ('Antebrachi', 'Lateral', 'adult', 'inak_esak', 0.1, 0.1, NULL);
INSERT INTO drl_entries (exam, view, age_group, metric, drl_inak, drl_esak, drl_dap) VALUES ('Cervical', 'AP', 'adult', 'inak_esak', 0.4, 0.6, NULL);
INSERT INTO drl_entries (exam, view, age_group, metric, drl_inak, drl_esak, drl_dap) VALUES ('Cervical', 'Lateral', 'adult', 'inak_esak', 0.6, 0.8, NULL);
INSERT INTO drl_entries (exam, view, age_group, metric, drl_inak, drl_esak, drl_dap) VALUES ('Clavicula', 'AP', 'adult', 'inak_esak', 0.2, 0.3, NULL);
INSERT INTO drl_entries (exam, view, age_group, metric, drl_inak, drl_esak, drl_dap) VALUES ('Cruris', 'AP', 'adult', 'inak_esak', 0.3, 0.3, NULL);
INSERT INTO drl_entries (exam, view, age_group, metric, drl_inak, drl_esak, drl_dap) VALUES ('Cruris', 'Lateral', 'adult', 'inak_esak', 0.2, 0.3, NULL);
INSERT INTO drl_entries (exam, view, age_group, metric, drl_inak, drl_esak, drl_dap) VALUES ('Elbow', 'AP', 'adult', 'inak_esak', 0.1, 0.1, NULL);
INSERT INTO drl_entries (exam, view, age_group, metric, drl_inak, drl_esak, drl_dap) VALUES ('Elbow', 'Lateral', 'adult', 'inak_esak', 0.1, 0.1, NULL);
INSERT INTO drl_entries (exam, view, age_group, metric, drl_inak, drl_esak, drl_dap) VALUES ('Femur', 'AP', 'adult', 'inak_esak', 0.4, 0.5, NULL);
INSERT INTO drl_entries (exam, view, age_group, metric, drl_inak, drl_esak, drl_dap) VALUES ('Femur', 'Lateral', 'adult', 'inak_esak', 0.3, 0.4, NULL);
INSERT INTO drl_entries (exam, view, age_group, metric, drl_inak, drl_esak, drl_dap) VALUES ('Humerus', 'AP', 'adult', 'inak_esak', 0.2, 0.3, NULL);
INSERT INTO drl_entries (exam, view, age_group, metric, drl_inak, drl_esak, drl_dap) VALUES ('Knee', 'AP', 'adult', 'inak_esak', 0.2, 0.3, NULL);
INSERT INTO drl_entries (exam, view, age_group, metric, drl_inak, drl_esak, drl_dap) VALUES ('Knee', 'Lateral', 'adult', 'inak_esak', 0.2, 0.3, NULL);
INSERT INTO drl_entries (exam, view, age_group, metric, drl_inak, drl_esak, drl_dap) VALUES ('Lumbar Spine', 'AP', 'adult', 'inak_esak', 1.3, 1.8, NULL);
INSERT INTO drl_entries (exam, view, age_group, metric, drl_inak, drl_esak, drl_dap) VALUES ('Lumbar Spine', 'Lateral', 'adult', 'inak_esak', 1.5, 2.0, NULL);
INSERT INTO drl_entries (exam, view, age_group, metric, drl_inak, drl_esak, drl_dap) VALUES ('Manus', 'AP', 'adult', 'inak_esak', 0.1, 0.1, NULL);
INSERT INTO drl_entries (exam, view, age_group, metric, drl_inak, drl_esak, drl_dap) VALUES ('Manus', 'Oblique', 'adult', 'inak_esak', 0.1, 0.1, NULL);
INSERT INTO drl_entries (exam, view, age_group, metric, drl_inak, drl_esak, drl_dap) VALUES ('Pedis', 'AP', 'adult', 'inak_esak', 0.1, 0.2, NULL);
INSERT INTO drl_entries (exam, view, age_group, metric, drl_inak, drl_esak, drl_dap) VALUES ('Pedis', 'Lateral', 'adult', 'inak_esak', 0.2, 0.3, NULL);
INSERT INTO drl_entries (exam, view, age_group, metric, drl_inak, drl_esak, drl_dap) VALUES ('Pedis', 'Oblique', 'adult', 'inak_esak', 0.1, 0.1, NULL);
INSERT INTO drl_entries (exam, view, age_group, metric, drl_inak, drl_esak, drl_dap) VALUES ('Pelvis', 'AP', 'adult', 'inak_esak', 0.8, 1.1, NULL);
INSERT INTO drl_entries (exam, view, age_group, metric, drl_inak, drl_esak, drl_dap) VALUES ('Shoulder', 'AP', 'adult', 'inak_esak', 0.4, 0.5, NULL);
INSERT INTO drl_entries (exam, view, age_group, metric, drl_inak, drl_esak, drl_dap) VALUES ('Sinus Paranasal', 'Waters', 'adult', 'inak_esak', 0.6, 0.8, NULL);
INSERT INTO drl_entries (exam, view, age_group, metric, drl_inak, drl_esak, drl_dap) VALUES ('Skull', 'AP', 'adult', 'inak_esak', 0.8, 1.0, NULL);
INSERT INTO drl_entries (exam, view, age_group, metric, drl_inak, drl_esak, drl_dap) VALUES ('Skull', 'Lateral', 'adult', 'inak_esak', 0.5, 0.7, NULL);
INSERT INTO drl_entries (exam, view, age_group, metric, drl_inak, drl_esak, drl_dap) VALUES ('Thoracolumbar', 'AP', 'adult', 'inak_esak', 0.7, 1.0, NULL);
INSERT INTO drl_entries (exam, view, age_group, metric, drl_inak, drl_esak, drl_dap) VALUES ('Thoracolumbar', 'Lateral', 'adult', 'inak_esak', 1.4, 1.9, NULL);
INSERT INTO drl_entries (exam, view, age_group, metric, drl_inak, drl_esak, drl_dap) VALUES ('Wrist Joint', 'AP', 'adult', 'inak_esak', 0.1, 0.1, NULL);
INSERT INTO drl_entries (exam, view, age_group, metric, drl_inak, drl_esak, drl_dap) VALUES ('Wrist Joint', 'Lateral', 'adult', 'inak_esak', 0.1, 0.1, NULL);
