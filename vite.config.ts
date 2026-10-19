import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// base './' permite publicar o build em qualquer subcaminho (GitHub Pages, itch.io, Netlify, Vercel).
export default defineConfig({
  base: './',
  plugins: [react()],
  build: { target: 'es2022', assetsInlineLimit: 0 },
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
});
