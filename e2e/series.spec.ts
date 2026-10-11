import { expect, test } from '@playwright/test';

const file = (name: string) =>
  new URL(`./fixtures/series/${name}`, import.meta.url).pathname.replace(/^\//, '');

const SERIES = ['ax-a.dcm', 'ax-b.dcm', 'ax-c.dcm', 'sc-1.dcm', 'sc-2.dcm', 'sc-3.dcm'].map(file);

test('study 2 series: tree, pilih series, gulir slice', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  await page.locator('input[type="file"]').setInputFiles(SERIES);
  await page.locator('canvas').first().waitFor({ timeout: 20000 });

  // Tree: 1 study, 2 series, 6 images
  await expect(page.getByText('Study 001').first()).toBeVisible();
  await expect(page.getByText('2 series · 6 images').first()).toBeVisible();

  // Series AXIAL (instance acak 3,1,2 di file) dibuka dari slice 1 = urutan numerik
  await page.getByRole('button', { name: /AXIAL/ }).click();
  await expect(page.getByText('Slice 1/3').first()).toBeVisible();

  // Wheel ke bawah = slice berikut
  const box = await page.locator('canvas').boundingBox();
  if (!box) throw new Error('canvas tanpa ukuran');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.wheel(0, 240);
  await expect(page.getByText('Slice 2/3').first()).toBeVisible();

  // Keyboard + tombol toolbar
  await page.keyboard.press('ArrowDown');
  await expect(page.getByText('Slice 3/3').first()).toBeVisible();
  await page.getByRole('button', { name: 'Iris sebelumnya' }).click();
  await expect(page.getByText('Slice 2/3').first()).toBeVisible();

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  );
  expect(overflow).toBeLessThanOrEqual(1);
});

test('resize me-refit saat fit, mempertahankan zoom manual', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  const chest = new URL('./fixtures/sample-chest-pa.dcm', import.meta.url).pathname.replace(
    /^\//,
    ''
  );
  await page.locator('input[type="file"]').setInputFiles(chest);
  await page.locator('canvas').first().waitFor({ timeout: 20000 });

  const zoomLabel = () => page.locator('.tnum.w-14').first().textContent();
  const contained = () =>
    page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      const frame = document.querySelector('.slim-scroll.relative');
      if (!canvas || !frame) return false;
      const c = canvas.getBoundingClientRect();
      const f = frame.getBoundingClientRect();
      return c.left >= f.left - 2 && c.right <= f.right + 2;
    });

  // Mode fit: resize menyusun ulang agar citra tetap muat
  await page.setViewportSize({ width: 1000, height: 800 });
  await expect.poll(() => contained(), { timeout: 5000 }).toBe(true);

  // Mode manual: resize tidak me-reset zoom pengguna
  const box = await page.locator('canvas').boundingBox();
  if (!box) throw new Error('canvas tanpa ukuran');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.wheel(0, 240);
  const manual = await zoomLabel();
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.waitForTimeout(500);
  expect(await zoomLabel()).toBe(manual);

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  );
  expect(overflow).toBeLessThanOrEqual(1);
});

test('study info menyalin nilai penuh', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  const long = new URL('./fixtures/sample-long-strings.dcm', import.meta.url).pathname.replace(
    /^\//,
    ''
  );
  await page.locator('input[type="file"]').setInputFiles(long);
  await page.locator('canvas').first().waitFor({ timeout: 20000 });

  await page.getByRole('button', { name: /Salin Series/ }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain('SANGAT PANJANG');
});
