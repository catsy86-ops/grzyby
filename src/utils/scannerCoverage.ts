import type { Species } from '../db/schema'

// Które gatunki atlasu skaner AI w ogóle zna. Model rozpoznaje tylko klasy z
// public/models/metadata.json (alpha: 19 z 45) - zdjęcie gatunku spoza tej listy i tak dostanie
// etykietę najbliższej ZNANEJ klasy, często z wysoką pewnością. Bez jawnej informacji o zasięgu
// użytkownik nie ma jak się tego domyślić (Faza 29, pkt 1). Liczone z etykiet modelu, więc po
// retreningu na pełny atlas komunikaty znikną same.

export interface ScannerCoverage {
  covered: Species[]
  uncovered: Species[]
}

export function getScannerCoverage(labels: readonly string[], allSpecies: readonly Species[]): ScannerCoverage {
  const known = new Set(labels)
  const covered: Species[] = []
  const uncovered: Species[] = []
  for (const s of allSpecies) (known.has(s.id) ? covered : uncovered).push(s)
  return { covered, uncovered }
}

// Sobowtóry danego gatunku, których skaner nie zna - jeśli grzyb na zdjęciu był właśnie takim
// sobowtórem, model nie mógł go wskazać i podał ten gatunek zamiast niego.
export function getUncoveredLookalikes(
  species: Species,
  labels: readonly string[],
  allSpecies: readonly Species[],
): Species[] {
  const known = new Set(labels)
  return species.lookalikes
    .filter((id) => !known.has(id))
    .map((id) => allSpecies.find((s) => s.id === id))
    .filter((s): s is Species => s != null)
}
