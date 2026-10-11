/**
 * Skema validasi zod bersama client + server. Pesan error Bahasa Indonesia.
 */
import { z } from 'zod';

const nonNegativeNullable = z.number().nonnegative().nullable().default(null);

export const calculationInputSchema = z
  .object({
    patientId: z.string().default(''),
    patientName: z.string().default(''),
    gender: z.string().default(''),
    age: z.string().default(''),
    weightKg: nonNegativeNullable,
    examType: z.string().default(''),
    view: z.string().default(''),
    studyDescription: z.string().default(''),
    bodyPartExamined: z.string().default(''),
    kvp: z.number({ message: 'kVp harus berupa angka' }).positive('kVp harus lebih dari 0'),
    ma: z
      .number({ message: 'mA harus berupa angka' })
      .positive('mA harus lebih dari 0')
      .nullable()
      .default(null),
    timeS: z
      .number({ message: 'Waktu harus berupa angka' })
      .positive('Waktu harus lebih dari 0')
      .nullable()
      .default(null),
    /** mAs langsung (tag DICOM 0018,1152) — pengganti mA × waktu bila tak ada. */
    masOverride: nonNegativeNullable,
    bsf: z.number().positive().default(1.35),
    coeffA: z.number().positive().default(0.0004),
    coeffB: z.number().positive().default(2.5917),
    dapMgyCm2: nonNegativeNullable
  })
  .refine(
    (v) =>
      (v.ma !== null && v.ma > 0 && v.timeS !== null && v.timeS > 0) ||
      (v.masOverride !== null && v.masOverride > 0),
    { message: 'Isi mA dan waktu, atau mAs langsung' }
  );

export type CalculationInput = z.infer<typeof calculationInputSchema>;

export const drlAssessSchema = z
  .object({
    inak: z.number().nonnegative().nullable().default(null),
    esak: z.number().nonnegative().nullable().default(null),
    dap: z.number().nonnegative().nullable().default(null),
    studyDescription: z.string().default(''),
    bodyPartExamined: z.string().default(''),
    viewPosition: z.string().default(''),
    patientAge: z.string().default('')
  })
  .refine((v) => v.studyDescription.trim() !== '' || v.bodyPartExamined.trim() !== '', {
    message: 'Isi Study Description atau Body Part Examined untuk penilaian DRL'
  });

export type DrlAssessInput = z.infer<typeof drlAssessSchema>;

export const calibrationPointSchema = z.object({
  kvp: z.number().positive('kVp harus lebih dari 0'),
  mas: z.number().positive('mAs harus lebih dari 0'),
  mgy: z.number().positive('mGy harus lebih dari 0')
});

export const calibrationSetSchema = z.object({
  name: z.string().default(''),
  coeffA: z.number().positive(),
  coeffB: z.number().positive(),
  r2: z.number().min(0).max(1),
  points: z.array(calibrationPointSchema).min(2, 'Minimal 2 titik kalibrasi')
});

export const historyQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});
