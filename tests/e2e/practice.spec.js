import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function keyboardActivate(page, locator) {
  await expect(locator).toBeVisible();
  await expect(locator).toBeEnabled();
  for (let n = 0; n < 150; n++) {
    if (
      await locator.evaluate((element) => element === document.activeElement)
    ) {
      await page.keyboard.press('Enter');
      return;
    }
    await page.keyboard.press('Tab');
  }
  throw new Error('Control is not reachable by keyboard');
}

test('completes a practice game using only keyboard controls', async ({
  page,
}, testInfo) => {
  test.setTimeout(150000);
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.clock.install();
  await page.goto('/practice');
  await keyboardActivate(
    page,
    page.getByRole('button', { name: 'Start practice', exact: true }),
  );
  await expect(
    page.getByRole('heading', { name: 'Battle arena', exact: true }),
  ).toBeVisible();
  let summoned = false;
  for (let n = 0; n < 110; n++) {
    if (await page.getByRole('dialog').isVisible()) break;
    const end = page.getByRole('button', { name: 'End turn', exact: true });
    if (await end.isEnabled()) {
      if (!summoned) {
        const cards = page.locator('.hand-card').filter({ hasText: 'ATK' });
        for (let c = 0; c < (await cards.count()); c++) {
          await keyboardActivate(page, cards.nth(c));
          const summon = page.getByRole('button', { name: /^Summon / });
          if (await summon.isEnabled()) {
            await keyboardActivate(page, summon);
            summoned = true;
            break;
          }
        }
      }
      if (await end.isEnabled()) await keyboardActivate(page, end);
    }
    await page.clock.runFor(8000);
  }
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('dialog')).toContainText('No leaderboard points');
  expect(summoned).toBe(true);
  expect(errors).toEqual([]);
  await page.screenshot({
    path: testInfo.outputPath('practice-result.png'),
    fullPage: true,
  });
  await keyboardActivate(
    page,
    page.getByRole('button', { name: 'Practice again', exact: true }),
  );
  await expect(page.getByRole('dialog')).not.toBeVisible();
});

test('practice recovers catalog failure, renders targets and confirms surrender', async ({
  page,
}, testInfo) => {
  await page.route('**/api/cards', (route) =>
    route.fulfill({
      status: 503,
      json: { error: { message: 'Catalog temporarily unavailable.' } },
    }),
  );
  await page.goto('/practice');
  await expect(page.getByRole('alert')).toContainText(
    'Catalog temporarily unavailable',
  );
  await page.unroute('**/api/cards');
  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  await page
    .getByRole('button', { name: 'Start practice', exact: true })
    .click();
  await expect(page.getByRole('region', { name: 'Your hand' })).toBeVisible();
  await page.locator('.hand-card').first().click();
  await expect(page.getByLabel('Selected card details')).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const accessibility = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(accessibility.violations).toEqual([]);
  await page.screenshot({
    path: testInfo.outputPath('practice-board.png'),
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Surrender', exact: true }).click();
  await page.getByRole('button', { name: 'Keep playing', exact: true }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.getByRole('button', { name: 'Surrender', exact: true }).click();
  await page
    .getByRole('button', { name: 'Confirm surrender', exact: true })
    .click();
  await expect(
    page.getByRole('dialog', { name: 'Defeat', exact: true }),
  ).toBeVisible();
});

test('maximum hand and both full boards fit with accessible horizontal scrolling', async ({
  page,
}, testInfo) => {
  await page.goto('/practice');
  await expect(
    page.getByRole('button', { name: 'Start practice' }),
  ).toBeVisible();
  const links = await page
    .locator('link[rel="stylesheet"]')
    .evaluateAll((nodes) => nodes.map((node) => node.href));
  const fixture = readFileSync('.local/battle-max.html', 'utf8');
  await page.setContent(
    `<!doctype html><html lang="en"><head><title>Maximum battle layout</title>${links.map((href) => `<link rel="stylesheet" href="${href}">`).join('')}</head><body><main>${fixture}</main></body></html>`,
  );
  await expect(page.locator('.hand-card')).toHaveCount(10);
  await expect(page.locator('.unit-slot:not(.empty-slot)')).toHaveCount(10);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.locator('.hand-card').last().focus();
  await expect(page.locator('.hand-card').last()).toBeInViewport();
  await expect(page.getByRole('button', { name: 'End turn' })).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath('practice-maximum.png'),
    fullPage: true,
  });
});
