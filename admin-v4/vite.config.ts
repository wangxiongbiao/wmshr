import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      port: 3004,
      host: "0.0.0.0",
      proxy: {
        "/api/v4": {
          target: "http://127.0.0.1:8789",
          changeOrigin: true,
        },
        "/api/cron": {
          target: "http://127.0.0.1:8789",
          changeOrigin: true,
        },
        "/api": {
          target: "http://127.0.0.1:8788",
          changeOrigin: true,
        }
      },
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
