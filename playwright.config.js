import { defineConfig, devices } from '@playwright/test';
import { randomUUID } from 'node:crypto';

process.env.MYTHIC_E2E_RUN_ID ||= randomUUID().replaceAll('-', '');

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60000,
  globalTeardown: './tests/e2e/cleanup.js',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : 3,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: 'laptop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
      },
    },
    {
      name: 'phone',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
  webServer: [
    {
      command: 'node scripts/test-api.js',
      url: 'http://127.0.0.1:3101/health/ready',
      reuseExistingServer: false,
      timeout: 60000,
    },
    {
      command: 'npm run preview -w @mythic/web',
      url: 'http://127.0.0.1:4173',
      env: { API_PROXY_TARGET: 'http://127.0.0.1:3101' },
      reuseExistingServer: false,
      timeout: 30000,
    },
  ],
});
