import { describe, expect, it } from 'vitest';
import { parseConfig } from './config.js';

export const validEnv = {
  REDIS_URL: 'redis://127.0.0.1:6379',
  MONGODB_URI:
    'mongodb://127.0.0.1:27017/?replicaSet=rs0&directConnection=true',
  MONGODB_DB: 'mythic_test',
  FRONTEND_ORIGINS: 'http://127.0.0.1:5173',
};
describe('environment validation', () => {
  it('validates configuration and explicit origins', () =>
    expect(parseConfig(validEnv).API_PORT).toBe(3001));
  it.each([
    { API_PORT: 'abc' },
    { MONGODB_URI: 'super-secret' },
    { REDIS_URL: 'https://invalid' },
    { FRONTEND_ORIGINS: '*' },
    { FRONTEND_ORIGINS: 'https://example.com/path' },
  ])('fails invalid configuration without echoing values', (changes) => {
    expect(() => parseConfig({ ...validEnv, ...changes })).toThrow(
      'Invalid environment fields:',
    );
    try {
      parseConfig({ ...validEnv, ...changes });
    } catch (error) {
      expect(error.message).not.toContain('super-secret');
    }
  });
});
