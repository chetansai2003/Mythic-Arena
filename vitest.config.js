import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'node',
          environment: 'node',
          include: ['packages/**/*.test.js', 'backend/**/*.test.js'],
        },
      },
      {
        test: {
          name: 'web',
          environment: 'jsdom',
          include: [
            'frontend/**/*.test.{js,jsx}',
            'tests/visual/**/*.test.jsx',
          ],
          setupFiles: ['./tests/setup-web.js'],
        },
        oxc: { jsx: { runtime: 'automatic' } },
      },
    ],
  },
});
