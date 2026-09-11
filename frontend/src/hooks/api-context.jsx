import { createContext, useContext, useEffect, useMemo } from 'react';
import { useStore } from 'react-redux';
import { createApiClient } from '../services/api.js';

const ApiContext = createContext(null);
export function ApiProvider({ children }) {
  const store = useStore();
  const api = useMemo(() => createApiClient(store), [store]);
  useEffect(() => {
    void api.bootstrap();
  }, [api]);
  return <ApiContext.Provider value={api}>{children}</ApiContext.Provider>;
}
export function useApi() {
  return useContext(ApiContext);
}
