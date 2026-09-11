import { expect, it, vi } from 'vitest';
import { createApiClient } from './api.js';
import { createAppStore, sessionReceived } from '../store/index.js';

const user = {
  id: 'user_test',
  email: 'user@arena.test',
  displayName: 'Test User',
  createdAt: '2026-09-11T00:00:00.000Z',
};
const response = (status, data) => ({
  status,
  ok: status >= 200 && status < 300,
  json: async () => data,
});
const session = { user, accessToken: 'fresh-token', expiresAt: 2000000000000 };
it('coalesces simultaneous expired requests into one refresh', async () => {
  const store = createAppStore(undefined);
  store.dispatch(sessionReceived({ ...session, accessToken: 'old-token' }));
  let refreshes = 0;
  const fetcher = vi.fn(async (url, options) => {
    if (url.endsWith('/csrf')) return response(200, { csrfToken: 'csrf' });
    if (url.endsWith('/refresh')) {
      refreshes++;
      await new Promise((resolve) => setTimeout(resolve, 10));
      return response(200, session);
    }
    return options.headers.Authorization === 'Bearer fresh-token'
      ? response(200, { decks: [] })
      : response(401, { error: { code: 'UNAUTHENTICATED' } });
  });
  const api = createApiClient(store, fetcher);
  const results = await Promise.all([
    api.request('/decks'),
    api.request('/decks'),
  ]);
  expect(results).toEqual([{ decks: [] }, { decks: [] }]);
  expect(refreshes).toBe(1);
});
it('finishes initial restoration before sign-in so a late guest response cannot erase it', async () => {
  const store = createAppStore(undefined);
  let resolveRefresh;
  const pendingRefresh = new Promise((resolve) => {
    resolveRefresh = resolve;
  });
  const fetcher = vi.fn(async (url) =>
    url.endsWith('/csrf')
      ? response(200, { csrfToken: 'csrf' })
      : url.endsWith('/refresh')
        ? pendingRefresh
        : response(200, session),
  );
  const api = createApiClient(store, fetcher);
  const bootstrap = api.bootstrap();
  await vi.waitFor(() =>
    expect(fetcher.mock.calls.some(([url]) => url.endsWith('/refresh'))).toBe(
      true,
    ),
  );
  const login = api.signIn({
    email: user.email,
    password: 'passphrase for tests',
  });
  expect(fetcher.mock.calls.some(([url]) => url.endsWith('/login'))).toBe(
    false,
  );
  resolveRefresh(response(401, { error: { code: 'UNAUTHENTICATED' } }));
  await Promise.all([bootstrap, login]);
  expect(store.getState().session.user).toEqual(user);
});
it('keeps credentials in memory and retains session state after a failed logout', async () => {
  const storage = { getItem: () => null, setItem: vi.fn() };
  const store = createAppStore(storage);
  store.dispatch(sessionReceived(session));
  const api = createApiClient(store, async (url) =>
    url.endsWith('/csrf')
      ? response(200, { csrfToken: 'csrf' })
      : response(503, { error: { message: 'Try again later' } }),
  );
  await expect(api.logout()).rejects.toThrow('Try again later');
  expect(store.getState().session.user).toEqual(user);
  expect(JSON.stringify(storage.setItem.mock.calls)).not.toContain(
    'fresh-token',
  );
});
