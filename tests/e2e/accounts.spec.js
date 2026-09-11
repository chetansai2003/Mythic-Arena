import { randomUUID } from 'node:crypto';
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const password = 'my browser test passphrase 123';
async function register(page, displayName) {
  const email = `${randomUUID()}@arena.test`;
  await page.goto('/register');
  await page.getByLabel('Display name', { exact: true }).fill(displayName);
  await page.getByLabel('Email address', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page
    .getByRole('button', { name: 'Create account', exact: true })
    .click();
  await expect(page).toHaveURL(/\/lobby$/);
  return email;
}
async function createDeck(page, name) {
  await page.goto('/decks');
  await expect(page.getByLabel('DECK NAME', { exact: true })).toBeVisible();
  await page.getByLabel('DECK NAME', { exact: true }).fill(name);
  await page
    .getByRole('button', { name: 'Use starter list', exact: true })
    .click();
  await page.getByRole('button', { name: 'Save deck', exact: true }).click();
  await expect(
    page.getByText('All changes saved', { exact: true }),
  ).toBeVisible();
}
test('two independent accounts persist their own decks through refresh and login', async ({
  page,
  browser,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== 'desktop',
    'Two-account journey runs once; editor responsiveness runs on every viewport.',
  );
  const alphaEmail = await register(page, 'Alpha Explorer');
  await createDeck(page, 'Northern Lights');
  const other = await browser.newContext({ baseURL: 'http://127.0.0.1:4173' });
  try {
    const beta = await other.newPage();
    await register(beta, 'Beta Explorer');
    await createDeck(beta, 'Cedar Moon');
    await expect(
      beta.getByRole('button', { name: /Northern Lights/ }),
    ).toHaveCount(0);
    await page.reload();
    await expect(page.getByLabel('DECK NAME', { exact: true })).toHaveValue(
      'Northern Lights',
    );
    await expect(page.getByRole('button', { name: /Cedar Moon/ })).toHaveCount(
      0,
    );
    const cookies = await page.context().cookies();
    expect(
      cookies.find((cookie) => cookie.name === 'ma_refresh').httpOnly,
    ).toBe(true);
    const stored = await page.evaluate(() =>
      JSON.stringify({ ...localStorage, ...sessionStorage }),
    );
    expect(stored).not.toMatch(/accessToken|refreshToken|eyJhbGci/);
    await page.goto('/login');
    await page.getByRole('button', { name: 'Sign out', exact: true }).click();
    await expect(
      page.getByRole('button', { name: 'Sign in', exact: true }),
    ).toBeVisible();
    await page.getByLabel('Email address', { exact: true }).fill(alphaEmail);
    await page
      .getByLabel('Password', { exact: true })
      .fill('incorrect passphrase');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText(
      'Email or password is incorrect',
    );
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page).toHaveURL(/\/lobby$/);
    await expect(
      page.getByRole('combobox', { name: 'Choose your deck' }),
    ).toContainText('Northern Lights');
  } finally {
    await other.close();
  }
});
test('deck editing supports filters, inspection, failure recovery and confirmed deletion', async ({
  page,
}, testInfo) => {
  await register(page, `${testInfo.project.name} Builder`);
  await createDeck(page, 'First Light');
  await page
    .getByRole('combobox', { name: 'Filter by faction' })
    .selectOption('NORSE');
  await expect(page.locator('.catalog-card')).toHaveCount(4);
  await page.getByRole('textbox', { name: 'Search cards' }).fill('Frostwatch');
  await expect(page.locator('.catalog-card')).toHaveCount(1);
  await page
    .getByRole('button', { name: 'Inspect Frostwatch Sentinel', exact: true })
    .click();
  await expect(
    page.getByRole('dialog', { name: 'Frostwatch Sentinel' }),
  ).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('textbox', { name: 'Search cards' }).fill('');
  await page
    .getByRole('combobox', { name: 'Filter by faction' })
    .selectOption('ALL');
  await page
    .getByLabel('DECK NAME', { exact: true })
    .fill('Preserved strategy');
  await page.route('**/api/decks/*', (route) =>
    route.request().method() === 'PATCH'
      ? route.fulfill({
          status: 503,
          json: {
            error: {
              code: 'DEPENDENCY_UNAVAILABLE',
              message: 'Temporarily unavailable.',
            },
          },
        })
      : route.continue(),
  );
  await page.getByRole('button', { name: 'Save deck', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText(
    'Your draft is preserved',
  );
  await expect(page.getByLabel('DECK NAME', { exact: true })).toHaveValue(
    'Preserved strategy',
  );
  await page.getByRole('link', { name: 'Match history', exact: true }).click();
  await expect(
    page.getByRole('dialog', { name: 'Leave your unsaved deck?' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Keep editing', exact: true }).click();
  await page.unroute('**/api/decks/*');
  await page.getByRole('button', { name: 'Save deck', exact: true }).click();
  await expect(
    page.getByText('All changes saved', { exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Save a copy', exact: true }).click();
  await expect(page.getByLabel('DECK NAME', { exact: true })).toHaveValue(
    'Preserved strategy copy',
  );
  await page.screenshot({
    path: testInfo.outputPath('deck-builder.png'),
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const accessibility = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(accessibility.violations).toEqual([]);
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(
    page.getByRole('dialog', { name: 'Delete this deck?' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Keep editing', exact: true }).click();
  await expect(page.getByLabel('DECK NAME', { exact: true })).toHaveValue(
    'Preserved strategy copy',
  );
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await page.getByRole('button', { name: 'Delete deck', exact: true }).click();
  await expect(page.getByLabel('DECK NAME', { exact: true })).toHaveValue(
    'Preserved strategy',
  );
  await page.reload();
  await expect(page.getByLabel('DECK NAME', { exact: true })).toHaveValue(
    'Preserved strategy',
  );
});
