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

for (const width of [768, 1280]) {
  test(`tidak ada scroll horizontal @${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    for (const { path } of pages) {
      await page.goto(path);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth
      );
      expect(overflow).toBeLessThanOrEqual(1);
    }
  });
}

test('tidak ada scroll horizontal dengan file termuat', async ({ page }) => {
  const fixture = new URL('./fixtures/sample-chest-pa.dcm', import.meta.url).pathname.replace(
    /^\//,
    ''
  );
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  await page.locator('input[type="file"]').setInputFiles(fixture);
  await page.locator('canvas').first().waitFor({ timeout: 15000 });
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  );
  expect(overflow).toBeLessThanOrEqual(1);
});
