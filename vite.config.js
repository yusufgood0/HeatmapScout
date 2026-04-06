import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
export default defineConfig({
    plugins: [
        VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['favicon.svg', 'robots.txt', 'icons/*'],
            manifest: {
                name: 'HeatmapScout',
                short_name: 'HeatmapScout',
                start_url: '/',
                display: 'standalone',
                background_color: '#ffffff',
                theme_color: '#007acc',
                icons: [
                    { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
                    { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
                ],
            },
        }),
    ],
});
//# sourceMappingURL=vite.config.js.map