import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: 'all',
    host: true,  // or use 0.0.0.0
    proxy: {
      '/live': {
        target: 'ws://localhost:9000',
        ws: true,
      },
      '/api': {
        target: 'http://localhost:9000',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, '')
      },
      '/models': {
        target: 'http://localhost:9000',
        changeOrigin: true,
        secure: false
      }
    },
  }

});
