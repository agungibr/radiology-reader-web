/**
 * Geometri pengukuran viewer: jarak garis dalam piksel citra.
 * Fungsi murni — teruji di `tests/measure.test.ts`.
 */

export interface MeasuredLength {
  value: number;
  unit: 'mm' | 'px';
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
