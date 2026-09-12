import { randomUUID } from 'node:crypto';
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function prepare(page, name) {
  await page.goto('/register');
  await page.getByLabel('Display name', { exact: true }).fill(name);
  await page
    .getByLabel('Email address', { exact: true })
    .fill(`${randomUUID()}@arena.test`);
  await page
    .getByLabel('Password', { exact: true })
    .fill('online browser test passphrase 123');
  await page
    .getByRole('button', { name: 'Create account', exact: true })
    .click();
  await expect(page).toHaveURL(/\/lobby$/);
  await page.goto('/decks');
  await page.getByLabel('DECK NAME', { exact: true }).fill('Online starter');
  await page
    .getByRole('button', { name: 'Use starter list', exact: true })
    .click();
  await page.getByRole('button', { name: 'Save deck', exact: true }).click();
  await expect(
    page.getByText('All changes saved', { exact: true }),
  ).toBeVisible();
  await page.goto('/lobby');
  await expect(
    page.getByRole('button', { name: 'Find an opponent', exact: true }),
  ).toBeEnabled();
}

test('two browsers match, move, reconnect, finish, and see persisted results', async ({
  page,
  browser,
}, testInfo) => {
  const other = await browser.newContext({
    baseURL: 'http://127.0.0.1:4173',
    viewport: testInfo.project.use.viewport,
  });
  try {
    const beta = await other.newPage();
    await Promise.all([
      prepare(page, 'Online Alpha'),
      prepare(beta, 'Online Beta'),
    ]);
    await page
      .getByRole('button', { name: 'Find an opponent', exact: true })
      .click();
    await expect(
      page.getByRole('button', { name: 'Cancel search', exact: true }),
    ).toBeVisible();
    await beta
      .getByRole('button', { name: 'Find an opponent', exact: true })
      .click();
    await Promise.all(
      [page, beta].map(async (player) => {
        await expect(player).toHaveURL(/\/match\//);
        await player
          .getByRole('button', { name: 'Ready to battle', exact: true })
          .click();
        await expect(
          player.getByRole('button', { name: 'End turn', exact: true }),
        ).toBeVisible();
      }),
    );
    expect(new URL(page.url()).pathname).toBe(new URL(beta.url()).pathname);
    const active = (await page
      .getByRole('button', { name: 'End turn', exact: true })
      .isEnabled())
      ? page
      : beta;
    await active.getByRole('button', { name: 'End turn', exact: true }).click();
    const next = active === page ? beta : page;
    await expect(
      next.getByRole('button', { name: 'End turn', exact: true }),
    ).toBeEnabled();
    await page.reload();
    await expect(
      page.getByRole('button', { name: 'Surrender', exact: true }),
    ).toBeEnabled();
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.screenshot({
      path: `docs/evidence/part-4-${testInfo.project.name}.png`,
      fullPage: true,
    });
    await page.getByRole('button', { name: 'Surrender', exact: true }).click();
    await page
      .getByRole('button', { name: 'Confirm surrender', exact: true })
      .click();
    await expect(page.getByText(/Result saved\./)).toBeVisible();
    await expect(beta.getByText(/Result saved\./)).toBeVisible();
    await page.goto('/history');
    await expect(
      page.getByRole('heading', { name: 'Defeat', exact: true }),
    ).toBeVisible();
    await beta.goto('/history');
    await expect(
      beta.getByRole('heading', { name: 'Victory', exact: true }),
    ).toBeVisible();
    await beta.goto('/leaderboard');
    await expect(
      beta.getByText('1 win', { exact: true }).first(),
    ).toBeVisible();
  } finally {
    await other.close();
  }
});
