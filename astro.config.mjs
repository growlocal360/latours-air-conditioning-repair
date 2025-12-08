import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://latourshvac.com',
  output: 'static',
  integrations: [
    sitemap({
      changefreq: 'weekly',
      priority: 0.7,
      lastmod: new Date(),
      // Customize priority for important pages
      serialize(item) {
        // Homepage gets highest priority
        if (item.url === 'https://latourshvac.com/') {
          item.priority = 1.0;
          item.changefreq = 'daily';
        }
        // Category pages get high priority
        else if (item.url.match(/\/(ac-contractor|furnace-repair|heating-contractor|hvac-contractor)\/$/)) {
          item.priority = 0.9;
          item.changefreq = 'weekly';
        }
        // Service subpages
        else if (item.url.match(/\/(ac-contractor|heating-contractor|hvac-contractor)\/[^/]+\/$/)) {
          item.priority = 0.8;
          item.changefreq = 'weekly';
        }
        // Service areas
        else if (item.url.includes('/service-areas/')) {
          item.priority = 0.7;
          item.changefreq = 'monthly';
        }
        // Neighborhoods
        else if (item.url.includes('/neighborhoods/')) {
          item.priority = 0.6;
          item.changefreq = 'monthly';
        }
        // Legal pages
        else if (item.url.match(/\/(privacy-policy|terms-of-service|sitemap)\/$/)) {
          item.priority = 0.3;
          item.changefreq = 'yearly';
        }
        return item;
      }
    })
  ],
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
