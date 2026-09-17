import { expect, test } from '@playwright/test';

const FIXTURE = new URL('./fixtures/sample-chest-pa.dcm', import.meta.url).pathname.replace(
  /^\//,
  ''
);

test('alur kritis: unggah DICOM → hitung INAK → badge DRL', async ({ page }) => {
  await page.goto('/');

  // 1. Unggah fixture
  await page.locator('input[type="file"]').setInputFiles(FIXTURE);
  await expect(
    page.getByRole('button', { name: 'sample-chest-pa.dcm', exact: true })
  ).toBeVisible();
  await expect(page.getByText('TEST001').first()).toBeVisible();
  await expect(page.locator('canvas')).toBeVisible();
  await expect(page.getByText(/Tag DICOM \(\d+\)/)).toBeVisible();

  // 2. Dosimetri terisi otomatis dari DICOM
  await page.getByRole('link', { name: 'Dosimetri' }).click();
  await expect(page.locator('#kvp')).toHaveValue('70');
  await expect(page.locator('#ma')).toHaveValue('200');

  // 3. Hitung → hasil + badge DRL (Chest PA dewasa: di atas DRL)
  await page.getByRole('button', { name: 'Hitung INAK dan ESAK' }).click();
  await expect(page.getByText('0.242103 mGy').first()).toBeVisible();
  await expect(page.getByText('Above DRL').first()).toBeVisible();
  // Preview tanpa D1: hasil tetap tampil + peringatan penyimpanan
  await expect(page.getByText(/tidak tersimpan/)).toBeVisible();

  // 4. Toggle DAP (hidden by default seperti desktop)
  await expect(page.getByRole('button', { name: 'Hitung DAP' })).not.toBeVisible();
  await page.getByRole('button', { name: 'Tampilkan DAP' }).click();
  await expect(page.getByRole('button', { name: 'Hitung DAP' })).toBeVisible();
  await page.getByRole('button', { name: 'Sembunyikan DAP' }).click();
  await expect(page.getByRole('button', { name: 'Hitung DAP' })).not.toBeVisible();
});

test('raster gagal dimuat menampilkan error dan dapat dipulihkan', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.goto('/');
  await page.locator('input[type="file"]').setInputFiles(FIXTURE);
  await expect(page.getByText('TEST001').first()).toBeVisible();

  await page.locator('input[type="file"]').setInputFiles({
    name: 'broken.png',
    mimeType: 'image/png',
    buffer: Buffer.from('not a valid image')
  });

  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByRole('alert')).not.toBeEmpty();
  await expect(page.locator('canvas')).toHaveCount(0);
  await expect(page.getByText('TEST001')).toHaveCount(0);
  await expect(page.getByText(/Tag DICOM \([1-9]\d*\)/)).toHaveCount(0);
  expect(pageErrors).toEqual([]);

  await page.getByRole('button', { name: 'sample-chest-pa.dcm', exact: true }).click();
  await expect(page.getByText('TEST001').first()).toBeVisible();
  await expect(page.locator('canvas')).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
});

test('toggle DAP mempertahankan nilai eksposur manual', async ({ page }) => {
  await page.goto('/dosimetry');
  const values = { kvp: '85', ma: '160', time: '0.125', bsf: '1.4' };
  for (const [id, value] of Object.entries(values)) {
    await page.locator(`#${id}`).fill(value);
  }

  for (const name of ['Tampilkan DAP', 'Sembunyikan DAP', 'Tampilkan DAP']) {
    await page.getByRole('button', { name, exact: true }).click();
    for (const [id, value] of Object.entries(values)) {
      await expect(page.locator(`#${id}`)).toHaveValue(value);
    }
    await expect(page.getByText('20.0000 mAs', { exact: true })).toBeVisible();
  }
});

for (const editedColumn of ['mGy', 'mAs']) {
  test(`rumus kalibrasi memakai ${editedColumn} terbaru setelah Hitung`, async ({ page }) => {
    await page.goto('/dosimetry');
    const calibration = page.getByRole('region', { name: 'Data kalibrasi', exact: true });
    await calibration.getByLabel('kVp baris 1', { exact: true }).fill('10');
    await calibration.getByLabel('kVp baris 2', { exact: true }).fill('20');
    await calibration.getByLabel('mGy baris 1', { exact: true }).fill('0.02');
    await calibration.getByLabel('mGy baris 2', { exact: true }).fill('0.08');
    await calibration.getByRole('button', { name: 'Hitung', exact: true }).click();
    await expect(calibration.locator('tbody tr').nth(0).locator('td').nth(4)).toHaveText('1.0000');
    await expect(calibration.locator('tbody tr').nth(1).locator('td').nth(4)).toHaveText('4.0000');

    await calibration
      .getByLabel(`${editedColumn} baris 1`, { exact: true })
      .fill(editedColumn === 'mGy' ? '0.04' : '10');
    await calibration
      .getByLabel(`${editedColumn} baris 2`, { exact: true })
      .fill(editedColumn === 'mGy' ? '0.16' : '10');
    await calibration.getByRole('button', { name: 'Tampilkan Rumus Y' }).click();

    await expect(calibration.getByText('y = 0.020000 × kVp^2.0000', { exact: true })).toBeVisible();
    await expect(calibration.locator('tbody tr').nth(0).locator('td').nth(4)).toHaveText('2.0000');
    await expect(calibration.locator('tbody tr').nth(1).locator('td').nth(4)).toHaveText('8.0000');
    expect(Number(await page.locator('#coefA').inputValue())).toBeCloseTo(0.02, 6);
    expect(Number(await page.locator('#coefB').inputValue())).toBeCloseTo(2, 6);
  });
}

test('halaman history tampil dengan tombol export', async ({ page }) => {
  await page.goto('/history');
  await expect(
    page.getByRole('heading', { name: 'History Perhitungan INAK / ESAK' })
  ).toBeVisible();
  await expect(page.getByRole('link', { name: /Simpan Excel/ })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Simpan CSV' })).toBeVisible();
});
