import { defineConfig } from 'vite';

// Relative asset URLs work both at the domain root and in /<repository>/ on GitHub Pages.
export default defineConfig({
  base: './',
  server: { allowedHosts: true },
  preview: { allowedHosts: true },
});
