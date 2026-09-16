// Jedno miejsce formatowania dat widocznych w UI (pl-PL) - dotąd `toLocaleDateString('pl-PL')`/
// `toLocaleString('pl-PL')` było powielone identycznie w kilkunastu plikach (Dziennik, Mapa),
// więc zmiana formatu (np. skrócenie roku, dodanie strefy czasowej) wymagałaby edycji każdego z
// osobna zamiast jednej funkcji.

export function formatDate(value: string | number | Date): string {
  return new Date(value).toLocaleDateString('pl-PL')
}

export function formatDateTime(value: string | number | Date): string {
  return new Date(value).toLocaleString('pl-PL')
}
