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
    },
  }

});
