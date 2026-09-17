import { expect, test } from '@playwright/test';

const pages = [
  { path: '/', heading: 'Browser' },
  { path: '/dosimetry', heading: 'Dosimetri' },
  { path: '/history', heading: 'History' }
];

for (const { path, heading } of pages) {
  test(`halaman ${path} tampil dengan navigasi`, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByRole('heading', { name: heading })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Viewer' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Dosimetri' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'History' })).toBeVisible();
  });
}
