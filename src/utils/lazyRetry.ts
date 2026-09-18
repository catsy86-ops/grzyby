import { lazy, type ComponentType } from 'react'

const RELOAD_FLAG_KEY = 'lysy-chunk-reload-attempted'

// React.lazy() z automatycznym, jednorazowym przeładowaniem strony przy błędzie ładowania chunka
// (dynamic import failure) - patrz uzasadnienie w registerServiceWorker.ts. Karta otwarta podczas
// nowego wdrożenia prosi o chunk pod starym hashem, którego CDN już nie ma ("error loading
// dynamically imported module" / NS_ERROR_CORRUPTED_CONTENT); jedno przeładowanie pobiera świeży
// index.html i aktualny zestaw chunków, naprawiając to bez interwencji użytkownika. Flaga w
// sessionStorage (nie licznik) chroni przed pętlą przeładowań, gdyby błąd był realny (np. brak
// sieci) - drugi błąd po jednej próbie leci dalej do ErrorBoundary jak dotąd. Czyszczona po
// udanym imporcie, żeby błąd innego widoku później w tej samej sesji dostał własną, świeżą próbę.
export function lazyRetry<T extends ComponentType<unknown>>(factory: () => Promise<{ default: T }>) {
  return lazy(async () => {
    try {
      const result = await factory()
      sessionStorage.removeItem(RELOAD_FLAG_KEY)
      return result
    } catch (error) {
      const alreadyAttempted = sessionStorage.getItem(RELOAD_FLAG_KEY) === '1'
      if (alreadyAttempted) throw error
      sessionStorage.setItem(RELOAD_FLAG_KEY, '1')
      window.location.reload()
      // Przeglądarka i tak zaraz przeładuje kartę - zwracamy Promise, która nigdy się nie
      // rozwiąże, żeby React nie zdążył wyrenderować stanu błędu w tej ułamkowej chwili przed
      // przeładowaniem.
      return new Promise<{ default: T }>(() => {})
    }
  })
}
