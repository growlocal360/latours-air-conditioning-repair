import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://latoursac.com',
  output: 'static',
  build: {
    format: 'directory'
  },
  vite: {
    build: {
      rollupOptions: {
        output: {
          assetFileNames: 'assets/[name].[ext]'
        }
      }
    }
  }
});
