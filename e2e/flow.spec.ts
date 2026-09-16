import { expect, test } from '@playwright/test';

const FIXTURE = new URL('./fixtures/sample-chest-pa.dcm', import.meta.url).pathname.replace(
  /^\//,
  ''
);

test('alur kritis: unggah DICOM → hitung INAK → badge DRL', async ({ page }) => {
  await page.goto('/');

  // 1. Unggah fixture
  await page.locator('input[type="file"]').setInputFiles(FIXTURE);
  await expect(page.getByText('sample-chest-pa.dcm')).toBeVisible();
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

test('halaman history tampil dengan tombol export', async ({ page }) => {
  await page.goto('/history');
  await expect(page.getByRole('heading', { name: 'History Perhitungan INAK / ESAK' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Simpan Excel/ })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Simpan CSV' })).toBeVisible();
});
