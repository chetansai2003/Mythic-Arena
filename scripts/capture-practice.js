import { chromium } from '@playwright/test';
import { mkdir, readFile } from 'node:fs/promises';

const browser = await chromium.launch();
await mkdir('docs/evidence', { recursive: true });
try {
  for (const [name, viewport] of [
    ['desktop', { width: 1440, height: 900 }],
    ['phone', { width: 390, height: 844 }],
  ]) {
    const page = await browser.newPage({ viewport });
    await page.goto('http://127.0.0.1:5173/practice');
    await page
      .getByRole('button', { name: 'Start practice', exact: true })
      .click();
    await page.getByRole('region', { name: 'Your hand' }).waitFor();
    await page.evaluate(() => {
      document.activeElement?.blur();
      window.scrollTo(0, 0);
    });
    await page.screenshot({
      path: `docs/evidence/part-3-${name}.png`,
      fullPage: true,
      animations: 'disabled',
    });
    const styles = await page
      .locator('link[rel="stylesheet"]')
      .evaluateAll((nodes) => nodes.map((node) => node.href));
    const fixture = await readFile('.local/battle-max.html', 'utf8');
    await page.setContent(
      `<!doctype html><html lang="en"><head><title>Maximum practice layout</title>${styles.map((href) => `<link rel="stylesheet" href="${href}">`).join('')}</head><body>${fixture}</body></html>`,
    );
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: `docs/evidence/part-3-maximum-${name}.png`,
      fullPage: true,
      animations: 'disabled',
    });
    await page.close();
  }
} finally {
  await browser.close();
}
console.log('Captured live practice and maximum-capacity component layouts.');
/* global document, window */
