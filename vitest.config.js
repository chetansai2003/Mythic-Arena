import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'node',
          environment: 'node',
          include: [
            'packages/**/*.test.js',
            'apps/api/**/*.test.js',
            'apps/worker/**/*.test.js',
          ],
        },
      },
      {
        test: {
          name: 'web',
          environment: 'jsdom',
          include: ['apps/web/**/*.test.{js,jsx}'],
          setupFiles: ['./tests/setup-web.js'],
        },
        oxc: { jsx: { runtime: 'automatic' } },
      },
    ],
  },
});
