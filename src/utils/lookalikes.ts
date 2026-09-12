import type { Species } from '../db/schema'

export interface LookalikeInfo {
  species: Species
  dangerous: boolean
}

// Gatunki, których pomylenie z inną rozpoznawaną rośliną/grzybem może zakończyć się
// poważnym zatruciem lub śmiercią - używane do wyróżnienia ostrzeżenia w UI.
const DANGEROUS_EDIBILITY = new Set(['trujący', 'śmiertelnie-trujący'])

/**
 * Zwraca listę mylonych gatunków dla danego gatunku wraz z informacją, czy dany
 * "sobowtór" jest niebezpieczny (trujący lub śmiertelnie trujący). Nieznane id
 * (brak w bazie gatunków) są pomijane.
 */
export function getLookalikes(species: Species, allSpecies: Species[]): LookalikeInfo[] {
  return species.lookalikes
    .map((id) => allSpecies.find((s) => s.id === id))
    .filter((s): s is Species => s != null)
    .map((s) => ({ species: s, dangerous: DANGEROUS_EDIBILITY.has(s.edibility) }))
}

/** Czy wśród sobowtórów danego gatunku znajduje się gatunek trujący/śmiertelnie trujący. */
export function hasDangerousLookalike(species: Species, allSpecies: Species[]): boolean {
  return getLookalikes(species, allSpecies).some((l) => l.dangerous)
}
