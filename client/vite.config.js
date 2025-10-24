import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env vars (e.g., VITE_API_ORIGIN=http://localhost:5000)
  const env = loadEnv(mode, process.cwd(), '');
  const target = env.VITE_API_ORIGIN || 'http://localhost:5000';

  return {
    plugins: [react()],
    server: {
      proxy: {
        // Proxy API calls to the backend
        '/api': {
          target,
          changeOrigin: true,
        },
        // Proxy static uploads (PDFs) to the backend
        '/uploads': {
          target,
          changeOrigin: true,
        },
      },
    },
    // Optional: make "vite preview" behave like dev with the same proxies
    preview: {
      proxy: {
        '/api': {
          target,
          changeOrigin: true,
        },
        '/uploads': {
          target,
          changeOrigin: true,
        },
      },
    },
  };
});
