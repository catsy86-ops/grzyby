import type { Finding } from '../db/schema'

// Osobna logika od `exportImport.ts`'s `countLikelyDuplicates` - tamta porównuje DOKŁADNĄ
// sygnaturę (włącznie z `createdAt`) do wykrycia ponownego importu tego samego pliku. Tu
// wykrywamy inny scenariusz: przypadkowe podwójne dodanie w terenie (np. dwukrotny tap "Zapisz"
// w rękawiczkach) - ten sam gatunek + to samo grzybowisko, zapisane w krótkim odstępie czasu.
export const DUPLICATE_WINDOW_MS = 2 * 60_000

export function isLikelyDuplicateFinding(
  candidate: { speciesId: string | null; spotId: number | undefined },
  recentFindings: Pick<Finding, 'speciesId' | 'spotId' | 'createdAt'>[],
  now = Date.now(),
): boolean {
  // Bez wybranego gatunku sygnał jest zbyt słaby, żeby ostrzegać - "kilka nieokreślonych
  // znalezisk pod rząd" to normalny, częsty przypadek (grzyby do zidentyfikowania później).
  if (candidate.speciesId == null) return false
  return recentFindings.some(
    (f) =>
      f.speciesId === candidate.speciesId &&
      f.spotId === candidate.spotId &&
      now - f.createdAt <= DUPLICATE_WINDOW_MS,
  )
}

const LAST_SPECIES_KEY = 'grzyby-last-species-id'

// Domyślne podpowiedzenie ostatnio wybranego gatunku w formularzu dodawania - przy zbieraniu
// jednego gatunku seriami (typowy scenariusz: "dużo borowików dziś") oszczędza powtarzanie tego
// samego wyboru za każdym razem. Zapisywane TYLKO po realnym wyborze (nie po "-- nieokreślony --"),
// żeby jeden nieopisany wpis nie wyzerował podpowiedzi na kolejne dodania.
export function getLastSpeciesId(): string | null {
  try {
    return localStorage.getItem(LAST_SPECIES_KEY)
  } catch {
    return null
  }
}

export function rememberLastSpeciesId(speciesId: string | null): void {
  try {
    if (speciesId == null) return
    localStorage.setItem(LAST_SPECIES_KEY, speciesId)
  } catch {
    // localStorage niedostępny (np. tryb prywatny) - podpowiedź to tylko wygoda, nie krytyczna.
  }
}
