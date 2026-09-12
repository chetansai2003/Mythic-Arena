import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdir, writeFile } from 'node:fs/promises';
test.use({ trace: 'off' }); // Keep trace capture overhead out of frame samples.

test('3D arena renders, handles context loss, and honors graphics preferences', async ({
  page,
}, testInfo) => {
  page.on('console', (message) => {
    if (message.text().includes('arena unavailable'))
      console.log(message.text());
  });
  await page.goto('/lobby');
  await expect(page.locator('[data-scene="ready"]')).toBeVisible({
    timeout: 20000,
  });
  await expect(page.locator('.lobby-canvas canvas')).toBeVisible();
  const performanceSample = await page
    .locator('.lobby-canvas canvas')
    .evaluate(async (canvas) => {
      const gl = canvas.getContext('webgl2');
      const extension = gl.getExtension('WEBGL_debug_renderer_info');
      await new Promise((resolve) => setTimeout(resolve, 2000));
      const start = performance.now();
      const frames = Number(canvas.dataset.frames ?? 0);
      await new Promise((resolve) => setTimeout(resolve, 3000));
      return {
        seconds: (performance.now() - start) / 1000,
        renderedFrames: Number(canvas.dataset.frames ?? 0) - frames,
        renderer: extension
          ? gl.getParameter(extension.UNMASKED_RENDERER_WEBGL)
          : 'not exposed',
        userAgent: navigator.userAgent,
        viewport: [innerWidth, innerHeight],
        devicePixelRatio,
        renderPixelRatio: canvas.width / canvas.clientWidth,
      };
    });
  await mkdir('docs/evidence', { recursive: true });
  await writeFile(
    `docs/evidence/part-5-performance-${testInfo.project.name}.json`,
    JSON.stringify(performanceSample, null, 2) + '\n',
  );
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  const paused = await page.locator('canvas').getAttribute('data-frames');
  await page.waitForTimeout(500);
  expect(await page.locator('canvas').getAttribute('data-frames')).toBe(paused);
  await page.evaluate(() => {
    delete document.hidden;
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.screenshot({
    path: `docs/evidence/part-5-lobby-${testInfo.project.name}.png`,
    fullPage: true,
  });
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page
    .locator('.lobby-canvas canvas')
    .evaluate((canvas) =>
      canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true })),
    );
  await expect(page.locator('[data-scene="static"]')).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Explore your decks' }),
  ).toBeEnabled();
  await page.goto('/settings');
  await page
    .getByLabel('Graphics quality', { exact: true })
    .selectOption('low');
  await page.goto('/lobby');
  await expect(page.locator('[data-scene="static"]')).toBeVisible();
  await expect(page.locator('.lobby-canvas canvas')).toHaveCount(0);
  await page.goto('/settings');
  await page
    .getByLabel('Graphics quality', { exact: true })
    .selectOption('high');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/lobby');
  await expect(page.locator('[data-scene="static"]')).toBeVisible();
  await expect(page.locator('.lobby-canvas canvas')).toHaveCount(0);
});

test('battle tips and full card sheet work with keyboard and reduced motion', async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/practice');
  await page
    .getByRole('button', { name: 'Start practice', exact: true })
    .click();
  await expect(
    page.getByRole('complementary', { name: 'First match guidance' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Dismiss tips', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'End turn', exact: true }),
  ).toBeVisible();
  const card = page.locator('.hand-card').first();
  await card.focus();
  await page.keyboard.press('Enter');
  const inspect = page.getByRole('button', {
    name: 'Inspect selected card',
    exact: true,
  });
  await inspect.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('dialog[open] .full-card-sheet')).toBeVisible();
  await page.screenshot({
    path: `docs/evidence/part-5-card-${testInfo.project.name}.png`,
    fullPage: true,
  });
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.keyboard.press('Escape');
  await expect(inspect).toBeFocused();
  await expect(page.locator('[data-effect="none"]')).toBeVisible();
  await page.reload();
  await page
    .getByRole('button', { name: 'Start practice', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: 'Show battle tips', exact: true }),
  ).toBeVisible();
});
