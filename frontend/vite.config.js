import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const proxy = {
  '/socket.io': {
    target: process.env.API_PROXY_TARGET || 'http://127.0.0.1:3001',
    ws: true,
    changeOrigin: true,
  },
  '/api': {
    target: process.env.API_PROXY_TARGET || 'http://127.0.0.1:3001',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/api/, ''),
  },
};
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5173, strictPort: true, proxy },
  preview: { port: 4173, strictPort: true, proxy },
});
