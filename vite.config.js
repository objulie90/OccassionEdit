import { cpSync } from 'node:fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Images and documents live in /public and are referenced at runtime as "public/assets/...",
// so the folder is copied into the build as-is instead of being served from the site root.
let outDir = 'dist';
const copyPublicFolder = {
  name: 'copy-public-folder',
  configResolved(config) {
    outDir = config.build.outDir;
  },
  closeBundle() {
    cpSync('public', `${outDir}/public`, { recursive: true });
  }
};

export default defineConfig({
  base: './',
  publicDir: false,
  plugins: [react(), copyPublicFolder],
  build: {
    assetsDir: 'build'
  },
  server: {
    port: 5173,
    host: true,
    // The Python studio server (server.py) answers /api during local development
    proxy: {
      '/api': 'http://localhost:8787'
    }
  }
});
