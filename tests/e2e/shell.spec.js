import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.beforeEach(async ({ page }) => {
  await page.route('**/api/auth/**', (route) =>
    route.request().url().endsWith('/csrf')
      ? route.fulfill({ json: { csrfToken: 'test-csrf' } })
      : route.fulfill({
          status: 401,
          json: {
            error: { code: 'UNAUTHENTICATED', message: 'Sign in to continue' },
          },
        }),
  );
  await page.route('**/api/health/ready', (route) =>
    route.fulfill({
      json: { status: 'ready', dependencies: { redis: true, mongo: true } },
    }),
  );
});
test('lobby renders honestly, navigation and direct refresh work', async ({
  page,
}, testInfo) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/lobby');
  await expect(
    page.getByRole('heading', { name: 'Enter the arena', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: /Matchmaking coming soon/ }),
  ).toBeDisabled();
  await expect(
    page.getByText('Services connected · online play coming later'),
  ).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath('lobby.png'),
    fullPage: true,
  });
  await page.getByRole('link', { name: 'Explore your decks' }).click();
  await page.reload();
  await expect(
    page.getByRole('heading', { level: 1, name: 'My decks' }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Make room for your legends.' }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});
test('unknown routes recover to the lobby', async ({ page }) => {
  await page.goto('/not-a-page');
  await expect(
    page.getByRole('heading', { name: 'A path yet undiscovered' }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Back to the arena' }).click();
  await expect(page).toHaveURL(/\/lobby$/);
});
test('keyboard opens and dismisses the dialog with focus restoration', async ({
  page,
}) => {
  await page.goto('/lobby');
  await page.keyboard.press('Tab');
  await expect(
    page.getByRole('link', { name: 'Skip to content' }),
  ).toBeFocused();
  await expect(page.getByRole('link', { name: 'Skip to content' })).toHaveCSS(
    'outline-style',
    'solid',
  );
  const trigger = page.getByRole('button', { name: 'How to play' });
  await trigger.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
  for (let i = 0; i < 5; i++) {
    await page.keyboard.press('Tab');
    expect(
      await page.evaluate(() => !!document.activeElement.closest('dialog')),
    ).toBe(true);
  }
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(trigger).toBeFocused();
});
test('settings persist, respect reduced motion and fit the viewport', async ({
  page,
}, testInfo) => {
  await page.goto('/settings');
  await page
    .getByRole('combobox', { name: 'Graphics quality' })
    .selectOption('low');
  await page.getByRole('switch', { name: 'Reduce motion' }).check();
  await expect(page.getByRole('status')).toContainText('Preference updated');
  await page.reload();
  await expect(
    page.getByRole('combobox', { name: 'Graphics quality' }),
  ).toHaveValue('low');
  await expect(
    page.getByRole('switch', { name: 'Reduce motion' }),
  ).toBeChecked();
  await expect(page.getByRole('switch', { name: 'Mute sound' })).toBeChecked();
  await page.screenshot({
    path: testInfo.outputPath('settings.png'),
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.goto('/lobby');
  await expect(page.locator('.floating-arena')).toHaveCSS(
    'animation-name',
    'none',
  );
  await page.evaluate(() => localStorage.clear());
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.reload();
  await expect(page.locator('.floating-arena')).toHaveCSS(
    'animation-name',
    'none',
  );
});
test('connection failure has an actionable recovery', async ({ page }) => {
  await page.unroute('**/api/health/ready');
  await page.route('**/api/health/ready', (route) =>
    route.fulfill({ status: 503, json: { status: 'not_ready' } }),
  );
  await page.goto('/lobby');
  await expect(
    page.getByText('Services unavailable · you can still explore'),
  ).toBeVisible();
  await page.unroute('**/api/health/ready');
  await page.route('**/api/health/ready', (route) =>
    route.fulfill({ json: { status: 'ready' } }),
  );
  await page.getByRole('button', { name: 'Check again' }).click();
  await expect(
    page.getByText('Services connected · online play coming later'),
  ).toBeVisible();
});
test('all screen shells are reachable without overflow', async ({ page }) => {
  for (const path of [
    '/',
    '/login',
    '/register',
    '/decks',
    '/match/preview',
    '/history',
    '/leaderboard',
  ]) {
    await page.goto(path);
    await expect(page.locator('h1')).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
});

test('core pages have no automated WCAG AA violations', async ({ page }) => {
  for (const path of ['/lobby', '/decks', '/settings', '/login']) {
    await page.goto(path);
    const result = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(
      result.violations,
      `${path}: ${JSON.stringify(result.violations.map((v) => ({ id: v.id, targets: v.nodes.map((n) => n.target) })))}`,
    ).toEqual([]);
  }
});
