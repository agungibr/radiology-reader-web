/**
 * Geometri pengukuran viewer: jarak garis dalam piksel citra.
 * Fungsi murni — teruji di `tests/measure.test.ts`.
 */

export interface MeasuredLength {
  value: number;
  unit: 'mm' | 'px';
}

/** Batas zoom viewer (sinkron dengan ImageViewer). */
export const MIN_ZOOM = 0.15;
export const MAX_ZOOM = 8;
/** Padding figure di sekitar kanvas (p-3 dua sisi). */
const FRAME_PADDING = 24;

/**
 * Zoom fit-to-window: citra muat dalam kotak tanpa crop.
 * Tinggi memakai batas maksimum kotak (bukan tinggi terukur saat
 * bingkai masih kosong) agar citra tinggi tidak dibuka terlalu kecil.
 */
export function fitZoom(frameW: number, maxBoxH: number, imgW: number, imgH: number): number {
  return Math.min(
    MAX_ZOOM,
    Math.max(MIN_ZOOM, Math.min((frameW - FRAME_PADDING) / imgW, (maxBoxH - FRAME_PADDING) / imgH))
  );
}

/**
 * Panjang dari delta piksel citra. Tanpa pixel spacing
 * `(0028,0030)` hasilnya piksel; jika ada dikali spacing (mm).
 * Nilai dibulatkan 1 desimal. Spacing diasumsikan isotropik
 * (nilai pertama tag dipakai).
 */
export function measureDistance(
  dxPx: number,
  dyPx: number,
  spacingMm: number | null
): MeasuredLength {
  const px = Math.hypot(dxPx, dyPx);
  if (spacingMm === null || !(spacingMm > 0)) {
    return { value: Math.round(px * 10) / 10, unit: 'px' };
  }
  return { value: Math.round(px * spacingMm * 10) / 10, unit: 'mm' };
}
