// Trwałe przechowywanie (Storage API) - wszystkie dane użytkownika (znaleziska, zdjęcia,
// miejscówki) żyją wyłącznie w IndexedDB. Bez `persist()` przeglądarka traktuje je jako
// "best-effort": Chrome może je usunąć przy braku miejsca, a Safari w zwykłej karcie (PWA
// niezainstalowana) kasuje je po 7 dniach nieużywania. Faza 28, Etap 1.

export type PersistenceStatus = 'persisted' | 'not-persisted' | 'unsupported'

export async function getPersistenceStatus(): Promise<PersistenceStatus> {
  if (typeof navigator === 'undefined' || !navigator.storage?.persisted) return 'unsupported'
  try {
    return (await navigator.storage.persisted()) ? 'persisted' : 'not-persisted'
  } catch {
    return 'unsupported'
  }
}

// Prosi o trwałość tylko wtedy, gdy jeszcze jej nie ma - bezpieczne do wołania przy każdym
// zapisie znaleziska. Chrome decyduje sam (bez okna) na podstawie zaangażowania/instalacji,
// Firefox może pokazać pytanie, dlatego wołamy to dopiero po akcji użytkownika (zapis), nie
// przy starcie. Zwraca końcowy stan; błędy są połykane - to nigdy nie może zablokować zapisu.
export async function requestPersistentStorage(): Promise<PersistenceStatus> {
  const status = await getPersistenceStatus()
  if (status !== 'not-persisted' || !navigator.storage.persist) return status
  try {
    return (await navigator.storage.persist()) ? 'persisted' : 'not-persisted'
  } catch {
    return 'not-persisted'
  }
}
