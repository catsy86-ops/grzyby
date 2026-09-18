import path from 'node:path'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  // Domyślnie Vite/Node na tej maszynie wiąże "localhost" tylko z ::1 (IPv6), nie 127.0.0.1 -
  // przeglądarka Playwrighta rozwiązuje "localhost" na 127.0.0.1 i wisi do timeoutu zamiast
  // dostać ECONNREFUSED. `host: true` wiąże serwer deweloperski na wszystkich interfejsach
  // (IPv4 i IPv6), więc oba adresy działają. Dotyczy tylko `vite dev`/`vite preview`, nie builda.
  server: {
    host: true,
  },
  preview: {
    host: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      // Rejestracja ręczna (src/registerServiceWorker.ts) zamiast domyślnego wstrzykiwanego
      // skryptu - ten drugi rejestrował SW bez obsługi aktualizacji, więc karta otwarta podczas
      // nowego wdrożenia nigdy się nie odświeżała i kończyła na "error loading dynamically
      // imported module" przy leniwie ładowanym widoku (patrz uzasadnienie w tamtym pliku).
      injectRegister: false,
      includeAssets: ['icons/*.png'],
      manifest: {
        name: 'Grzybobranie - dziennik grzybiarza',
        short_name: 'Grzybobranie',
        description: 'Mapa, rozpoznawanie i dziennik zbiorów grzybów - działa offline',
        theme_color: '#166534',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,json,ico,png,svg,webp,bin,jpg}'],
        maximumFileSizeToCacheInBytes: 20 * 1024 * 1024,
        runtimeCaching: [
          {
            // Obejmuje oba warianty podkładu mapy (patrz src/data/mapLayers.ts) - standardowy OSM
            // i terenowy OpenTopoMap - tym samym cache'em, żeby OfflineAreaDownload i Service
            // Worker traktowały je spójnie niezależnie od wybranej warstwy.
            urlPattern: /^https:\/\/[abc]\.tile\.(openstreetmap|opentopomap)\.org\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'map-tiles',
              expiration: {
                maxEntries: 4000,
                maxAgeSeconds: 60 * 60 * 24 * 90,
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /\/models\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'ai-model',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
            },
          },
        ],
      },
    }),
  ],
})
