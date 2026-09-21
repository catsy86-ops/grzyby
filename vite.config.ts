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
      // `injectManifest` (własny src/sw.ts) zamiast domyślnego `generateSW` - jedyny powód:
      // `share_target` poniżej wymaga ręcznego fetch-handlera na POST multipart/form-data, co jest
      // niemożliwe w deklaratywnym `generateSW`. Precache app-shellu i runtimeCaching (kafle mapy,
      // model AI) w src/sw.ts odtwarzają dokładnie to, co wcześniej robił `workbox` config niżej
      // (ta sekcja jest teraz nieużywana przez `generateSW`, ale zostawiona jako odniesienie -
      // patrz komentarze w src/sw.ts).
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,json,ico,png,svg,webp,bin,jpg}'],
        maximumFileSizeToCacheInBytes: 20 * 1024 * 1024,
      },
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
        // Skrót z długiego przytrzymania ikony apki na telefonie - prosto do formularza
        // znaleziska, bez przechodzenia przez zakładkę Mapa i FAB. Obsłużone w MapView.tsx
        // (czyta `?open=add-finding` z URL-a przy starcie).
        shortcuts: [
          {
            name: 'Dodaj znalezisko',
            short_name: 'Dodaj',
            url: '/?open=add-finding',
            icons: [{ src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
          },
        ],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        // Udostępnianie zdjęcia grzyba Z INNEJ apki (np. Galerii telefonu) bezpośrednio do
        // Grzybobrania - "Udostępnij" pokazuje apkę na liście celów, POST trafia do
        // src/sw.ts's `handleShareTarget`, który odkłada plik do Cache Storage i przekierowuje do
        // formularza dodawania znaleziska. Tylko `image/*` - to jedyny typ pliku, który formularz
        // znaleziska umie przyjąć.
        share_target: {
          action: '/share-target',
          method: 'POST',
          enctype: 'multipart/form-data',
          params: {
            files: [{ name: 'photo', accept: ['image/*'] }],
          },
        },
      },
    }),
  ],
})
