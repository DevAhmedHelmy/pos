import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  // Prevent Vite from serving files outside of the src directory
  server: {
    port: 1420,
    strictPort: true,
    watch: {
      // Ignore src-tauri changes to avoid unnecessary reloads
      ignored: ['**/src-tauri/**'],
    },
  },
  build: {
    // Tauri uses a Chromium-based webview — targeting a modern baseline is safe
    target: ['es2022', 'chrome105'],
    outDir: 'dist',
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
});
