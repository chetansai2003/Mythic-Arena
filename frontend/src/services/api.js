import { authResponseSchema } from '@mythic/shared';
import {
  sessionReceived,
  sessionEnded,
  sessionUnavailable,
} from '../store/index.js';

export class ApiError extends Error {
  constructor(status, data) {
    super(
      data?.error?.message ||
        'The request could not be completed. Please try again.',
    );
    this.status = status;
    this.code = data?.error?.code;
    this.details = data?.error?.details;
  }
}
export function createApiClient(store, fetcher = (...args) => fetch(...args)) {
  let csrfToken;
  let csrfPromise;
  let refreshPromise;
  const sessionLock = (work) =>
    globalThis.navigator?.locks
      ? navigator.locks.request('mythic-session-refresh', work)
      : work();
  async function getCsrf(force = false) {
    if (csrfToken && !force) return csrfToken;
    if (csrfPromise) return csrfPromise;
    csrfPromise = (async () => {
      const response = await fetcher('/api/auth/csrf', {
        credentials: 'include',
        signal: AbortSignal.timeout(10000),
      });
      const body = await response.json();
      if (!response.ok || typeof body.csrfToken !== 'string')
        throw new ApiError(response.status, body);
      csrfToken = body.csrfToken;
      return csrfToken;
    })().finally(() => {
      csrfPromise = null;
    });
    return csrfPromise;
  }
  async function send(
    path,
    { method = 'GET', body, auth = true } = {},
    retry = true,
  ) {
    const headers = { Accept: 'application/json' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (method !== 'GET') headers['x-csrf-token'] = await getCsrf();
    const token = store.getState().session.accessToken;
    if (auth && token) headers.Authorization = `Bearer ${token}`;
    let response;
    try {
      response = await fetcher(`/api${path}`, {
        method,
        headers,
        credentials: 'include',
        signal: AbortSignal.timeout(10000),
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      });
    } catch {
      throw new ApiError(0, {
        error: {
          message:
            'Connection lost. Your changes have not been discarded. Please try again.',
        },
      });
    }
    const data =
      response.status === 204 ? null : await response.json().catch(() => null);
    if (
      retry &&
      response.status === 403 &&
      data?.error?.code === 'CSRF_INVALID'
    ) {
      await getCsrf(true);
      return send(path, { method, body, auth }, false);
    }
    if (retry && response.status === 401 && auth) {
      await refresh();
      return send(path, { method, body, auth }, false);
    }
    if (!response.ok) throw new ApiError(response.status, data);
    return data;
  }
  async function refresh() {
    if (refreshPromise) return refreshPromise;
    const run = async () => {
      try {
        const data = authResponseSchema.parse(
          await send('/auth/refresh', { method: 'POST', auth: false }),
        );
        store.dispatch(sessionReceived(data));
        return data;
      } catch (error) {
        if (error.status === 401) {
          csrfToken = null;
          store.dispatch(sessionEnded());
        } else store.dispatch(sessionUnavailable());
        throw error;
      }
    };
    refreshPromise = sessionLock(run).finally(() => {
      refreshPromise = null;
    });
    return refreshPromise;
  }
  return {
    request: send,
    async bootstrap() {
      try {
        await refresh();
      } catch {
        /* The session state distinguishes guest from unavailable. */
      }
    },
    async signIn(input, register = false) {
      if (refreshPromise) await refreshPromise.catch(() => {});
      return sessionLock(async () => {
        const data = authResponseSchema.parse(
          await send(register ? '/auth/register' : '/auth/login', {
            method: 'POST',
            body: input,
            auth: false,
          }),
        );
        store.dispatch(sessionReceived(data));
        return data.user;
      });
    },
    async logout() {
      if (refreshPromise) await refreshPromise.catch(() => {});
      return sessionLock(async () => {
        await send('/auth/logout', { method: 'POST', auth: true });
        csrfToken = null;
        store.dispatch(sessionEnded());
      });
    },
  };
}
