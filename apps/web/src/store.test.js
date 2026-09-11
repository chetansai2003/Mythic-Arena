import { expect, it } from 'vitest';
import {
  createAppStore,
  loadPreferences,
  setGraphics,
  setMuted,
} from './store.js';

it('recovers from corrupt or unavailable storage', () => {
  expect(loadPreferences({ getItem: () => 'invalid json' })).toEqual({
    graphics: 'high',
    reduceMotion: false,
    muted: true,
  });
  const store = createAppStore(undefined);
  store.dispatch(setGraphics('low'));
  expect(store.getState().preferences.graphics).toBe('low');
  store.dispatch(setGraphics('unsupported'));
  expect(store.getState().preferences.graphics).toBe('low');
});
it('persists only validated device preferences', () => {
  const storage = new Map();
  const adapter = {
    getItem: (key) => storage.get(key),
    setItem: (key, value) => storage.set(key, value),
  };
  const store = createAppStore(adapter);
  store.dispatch(setMuted(false));
  expect(createAppStore(adapter).getState().preferences.muted).toBe(false);
});
