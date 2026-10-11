/**
 * Skema Drizzle untuk Cloudflare D1. Harus selaras dengan `drizzle/0001_init.sql`.
 * (Drizzle-kit sengaja tidak dipakai — skema kecil, SQL ditulis tangan.)
 */
import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const calculations = sqliteTable('calculations', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  createdAt: text('created_at').notNull(),
  patientId: text('patient_id').notNull().default(''),
  patientName: text('patient_name').notNull().default(''),
  gender: text('gender').notNull().default(''),
  age: text('age').notNull().default(''),
  weightKg: real('weight_kg'),
  examType: text('exam_type').notNull().default(''),
  view: text('view').notNull().default(''),
  kvp: real('kvp').notNull(),
  ma: real('ma'),
  timeS: real('time_s'),
  mas: real('mas').notNull(),
  inakMgy: real('inak_mgy').notNull(),
  esakMgy: real('esak_mgy').notNull(),
  dapMgyCm2: real('dap_mgy_cm2'),
  drlLimitText: text('drl_limit_text').notNull().default(''),
  drlStatus: text('drl_status').notNull().default('')
});

export const calibrationSets = sqliteTable('calibration_sets', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().default(''),
  coeffA: real('coeff_a').notNull(),
  coeffB: real('coeff_b').notNull(),
  r2: real('r2').notNull(),
  createdAt: text('created_at').notNull()
});

export const calibrationPoints = sqliteTable('calibration_points', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  setId: integer('set_id')
    .notNull()
    .references(() => calibrationSets.id),
  kvp: real('kvp').notNull(),
  mas: real('mas').notNull(),
  mgy: real('mgy').notNull()
});

export const drlEntries = sqliteTable('drl_entries', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  exam: text('exam').notNull(),
  view: text('view').notNull(),
  ageGroup: text('age_group').notNull(),
  metric: text('metric').notNull(),
  drlInak: real('drl_inak'),
  drlEsak: real('drl_esak'),
  drlDap: real('drl_dap')
});
