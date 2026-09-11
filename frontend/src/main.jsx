import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { createAppStore } from './store/index.js';
import { routes } from './routes.jsx';
import './styles/styles.css';
import './styles/decks.css';
import { ApiProvider } from './hooks/api-context.jsx';

let storage;
try {
  storage = window.localStorage;
} catch {
  storage = undefined;
}
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider store={createAppStore(storage)}>
      <ApiProvider>
        <RouterProvider router={createBrowserRouter(routes)} />
      </ApiProvider>
    </Provider>
  </StrictMode>,
);
