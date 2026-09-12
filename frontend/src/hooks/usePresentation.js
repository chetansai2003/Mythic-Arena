import { useContext, useSyncExternalStore } from 'react';
import { ReactReduxContext } from 'react-redux';

const defaults = { graphics: 'high', reduceMotion: false, muted: true };
const noop = () => () => {};
const media = () => globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');
const subscribeMotion = (listener) => {
  const query = media();
  query?.addEventListener('change', listener);
  return () => query?.removeEventListener('change', listener);
};
const subscribeVisibility = (listener) => {
  document.addEventListener('visibilitychange', listener);
  return () => document.removeEventListener('visibilitychange', listener);
};
export function usePresentation() {
  const context = useContext(ReactReduxContext);
  const preferences = useSyncExternalStore(
    context?.store.subscribe ?? noop,
    () => context?.store.getState().preferences ?? defaults,
    () => defaults,
  );
  const systemReduced = useSyncExternalStore(
    subscribeMotion,
    () => media()?.matches ?? false,
    () => false,
  );
  const hidden = useSyncExternalStore(
    subscribeVisibility,
    () => document.hidden,
    () => true,
  );
  const reduced = preferences.reduceMotion || systemReduced;
  return {
    ...preferences,
    reduced,
    hidden,
    animate: !reduced && !hidden && preferences.graphics === 'high',
  };
}
