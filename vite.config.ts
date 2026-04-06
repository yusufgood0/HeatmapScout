import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: "/HeatmapScout/",

  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'robots.txt', 'icons/*'],
      manifest: {
        name: 'HeatmapScout',
        short_name: 'HeatmapScout',
        start_url: '/HeatmapScout/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#007acc',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        // Cache everything inside dist
        globPatterns: ['**/*.{js,css,html,png,json,svg}'],

        runtimeCaching: [
          {
            urlPattern: /^https:\/\/example\.com\/api\//,
            handler: 'NetworkFirst',
            options: { cacheName: 'api-cache' },
          },
        ],
      },
    })
  ],
});