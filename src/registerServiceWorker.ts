import { registerSW } from 'virtual:pwa-register'

// Naprawia realny błąd produkcyjny: dotąd apka polegała na domyślnej auto-rejestracji SW
// wstrzykniętej przez vite-plugin-pwa (`injectRegister: 'auto'`), która instaluje nową wersję w
// tle, ale NIE przejmuje kontroli nad już otwartą kartą ani jej nie odświeża. Karta otwarta
// podczas/przed nowym wdrożeniem (np. na Vercelu) dalej żyje w starym JS-ie i przy przejściu na
// leniwie ładowany widok (EncyclopediaView/JournalView/IdentifyView) prosi przeglądarkę o chunk
// spod starego hasha, którego nowy build/CDN już nie ma - stąd
// "error loading dynamically imported module" / NS_ERROR_CORRUPTED_CONTENT w konsoli.
// `registerSW({ immediate: true })` sprawdza aktualizację od razu przy starcie (nie dopiero przy
// następnej wizycie), a `onNeedRefresh` z `updateSW(true)` każe nowemu SW przejąć kontrolę i
// natychmiast przeładować kartę - użytkownik dostaje świeży build zamiast rozsypanych chunków.
export function registerServiceWorker() {
  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      void updateSW(true)
    },
  })
}
