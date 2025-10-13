import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, './shared'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
    watch: {
      usePolling: true,
      ignored: ['**/node_modules/**', '**/dist/**'],
    },
    hmr: {
      clientPort: 3000,
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
