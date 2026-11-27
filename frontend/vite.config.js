import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    // Never silently drift to 3001+ — CORS on the backend only allows
    // http://localhost:3000, so a moved port means a dead page / Network Error.
    strictPort: true,
    // Allow importing shared/imagePresets.js from outside the frontend root.
    fs: { allow: ['..'] },
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
});
