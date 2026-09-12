import { createContext, useContext, useEffect, useState } from 'react';
import { useSelector, useStore } from 'react-redux';
import { useApi } from './api-context.jsx';

const OnlineContext = createContext(null);
export const useOnline = () => useContext(OnlineContext);

export function OnlineProvider({ children }) {
  const userId = useSelector((state) => state.session.user?.id);
  const store = useStore();
  const api = useApi();
  const [online, setOnline] = useState(null);
  useEffect(() => {
    if (!userId) return;
    let active = true;
    let client;
    let unsubscribe;
    void import('../services/socket.js').then(({ createOnlineClient }) => {
      if (!active) return;
      client = createOnlineClient({
        getSession: () => store.getState().session,
        refreshSession: () => api.bootstrap(),
      });
      unsubscribe = client.subscribe((feed) => {
        if (active) setOnline({ client, feed, userId });
      });
    }).catch(() => {
      if (active) setOnline({ userId, client: null, feed: { error: { message: 'Online play could not load. Reload to reconnect.' } } });
    });
    return () => {
      active = false;
      unsubscribe?.();
      client?.dispose();
    };
  }, [userId, api, store]);
  return (
    <OnlineContext.Provider value={online?.userId === userId ? online : null}>
      {children}
    </OnlineContext.Provider>
  );
}
