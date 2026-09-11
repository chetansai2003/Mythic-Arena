import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { createAppStore } from './store.js';
import { routes } from './routes.jsx';
import './styles.css';
import './decks.css';
import { ApiProvider } from './api-context.jsx';

let storage;
try {
  storage = window.localStorage;
} catch {
  storage = undefined;
}
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider store={createAppStore(storage)}>
      <ApiProvider><RouterProvider router={createBrowserRouter(routes)} /></ApiProvider>
    </Provider>
  </StrictMode>,
);
