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
// Promise, która nigdy się nie rozwiązuje - przeglądarka i tak zaraz przeładuje kartę (patrz
// niżej), więc React nie zdąży wyrenderować stanu błędu w tej ułamkowej chwili przed
// przeładowaniem. Wydzielone z osobną adnotacją typu - inline `new Promise(() => {})` wewnątrz
// `async` funkcji myli wnioskowanie typów TS przy zwracaniu unii z sukcesem. `T extends
// ComponentType<any>` (nie `<object>`/`<unknown>`) z tego samego powodu - węższe granice tu
// zwężały wywnioskowany typ propsów bezpropsowych widoków do `never` w wywołaniach niżej.
function hangForever<T>(): Promise<T> {
  return new Promise<T>(() => {})
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- patrz uzasadnienie nad `hangForever`
export function lazyRetry<T extends ComponentType<any>>(factory: () => Promise<{ default: T }>) {
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
      return hangForever<{ default: T }>()
    }
  })
}
