import { configureStore, createSlice } from '@reduxjs/toolkit';

const defaults = { graphics: 'high', reduceMotion: false, muted: true };
export function loadPreferences(storage) {
  try {
    const value = JSON.parse(storage.getItem('mythic.preferences.v1'));
    return {
      graphics: ['high', 'low'].includes(value?.graphics)
        ? value.graphics
        : defaults.graphics,
      reduceMotion:
        typeof value?.reduceMotion === 'boolean'
          ? value.reduceMotion
          : defaults.reduceMotion,
      muted: typeof value?.muted === 'boolean' ? value.muted : defaults.muted,
    };
  } catch {
    return { ...defaults };
  }
}
const slice = createSlice({
  name: 'preferences',
  initialState: defaults,
  reducers: {
    setGraphics: (state, action) => {
      if (['high', 'low'].includes(action.payload))
        state.graphics = action.payload;
    },
    setReducedMotion: (state, action) => {
      state.reduceMotion = Boolean(action.payload);
    },
    setMuted: (state, action) => {
      state.muted = Boolean(action.payload);
    },
  },
});
export const { setGraphics, setReducedMotion, setMuted } = slice.actions;
const sessionSlice = createSlice({
  name: 'session', initialState: { status: 'loading', user: null, accessToken: null, expiresAt: null }, reducers: {
    sessionReceived: (_state, action) => ({ status: 'authenticated', ...action.payload }),
    sessionEnded: () => ({ status: 'guest', user: null, accessToken: null, expiresAt: null }),
    sessionUnavailable: (state) => { state.status = state.user ? 'authenticated' : 'unavailable'; },
  },
});
export const { sessionReceived, sessionEnded, sessionUnavailable } = sessionSlice.actions;
export function createAppStore(storage) {
  const store = configureStore({
    reducer: { preferences: slice.reducer, session: sessionSlice.reducer },
    preloadedState: { preferences: loadPreferences(storage) },
  });
  store.subscribe(() => {
    try {
      storage.setItem(
        'mythic.preferences.v1',
        JSON.stringify(store.getState().preferences),
      );
    } catch {
      /* Preferences still work for this session when storage is unavailable. */
    }
  });
  return store;
}
