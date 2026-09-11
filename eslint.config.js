import js from '@eslint/js';
import globals from 'globals';
import hooks from 'eslint-plugin-react-hooks';

export default [
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      'test-results/**',
      'playwright-report/**',
      '.local/**',
    ],
  },
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.node },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      'no-unused-vars': [
        'error',
        { varsIgnorePattern: '^[A-Z_]', argsIgnorePattern: '^_' },
      ],
    },
  },
  {
    files: ['apps/web/src/**/*.{js,jsx}', 'tests/e2e/**/*.js'],
    languageOptions: { globals: globals.browser },
  },
  {
    files: ['apps/web/src/**/*.{js,jsx}'],
    plugins: { 'react-hooks': hooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            '@mythic/shared/server',
            '**/apps/api/**',
            '**/apps/worker/**',
            'node:*',
          ],
        },
      ],
    },
  },
  {
    files: ['packages/game-engine/src/**/*.js'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            'node:*',
            '@mythic/shared/server',
            '**/apps/**',
            'redis',
            'mongodb',
            'express',
            'socket.io',
          ],
        },
      ],
    },
  },
  {
    files: ['infra/mongo-init.js'],
    languageOptions: {
      globals: { rs: 'readonly', db: 'readonly', sleep: 'readonly' },
    },
  },
];
