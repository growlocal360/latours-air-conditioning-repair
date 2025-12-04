import { defineConfig } from 'vite';
import { resolve } from 'path';
import { readdirSync, statSync } from 'fs';

function getHtmlEntries(dir = '.', entries = {}) {
  const items = readdirSync(dir);

  for (const item of items) {
    const fullPath = resolve(dir, item);

    if (item === 'node_modules' || item === 'dist' || item === '.git') {
      continue;
    }

    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      getHtmlEntries(fullPath, entries);
    } else if (item === 'index.html') {
      const key = dir === '.' ? 'index' : dir.replace(/\.\//g, '').replace(/\//g, '-');
      entries[key] = fullPath;
    }
  }

  return entries;
}

export default defineConfig({
  root: '.',
  publicDir: 'images',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: getHtmlEntries(),
      output: {
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === 'styles.css') {
            return 'assets/[name]-[hash][extname]';
          }
          return '[name][extname]';
        }
      }
    },
    copyPublicDir: true
  },
  server: {
    port: 5173,
    strictPort: false,
    open: false
  }
});
