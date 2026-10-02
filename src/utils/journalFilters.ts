import type { TreeCode } from '../data/forestCodes'
import type { Finding } from '../db/schema'

export type SortOrder = 'newest' | 'oldest'

// `dateFrom`/`dateTo` to wartości natywnego `<input type="date">` (yyyy-mm-dd, strefa lokalna,
// pusty string = brak granicy). Górna granica jest inkluzywna do KOŃCA dnia (23:59:59.999) - bez
// tego znalezisko dodane w dniu wybranym jako "Do" zostałoby błędnie odfiltrowane (jego
// `createdAt` ma godzinę/minuty, nie tylko datę).
export function isWithinDateRange(createdAt: number, dateFrom: string, dateTo: string): boolean {
  if (dateFrom) {
    const fromMs = new Date(`${dateFrom}T00:00:00`).getTime()
    if (createdAt < fromMs) return false
  }
  if (dateTo) {
    const toMs = new Date(`${dateTo}T23:59:59.999`).getTime()
    if (createdAt > toMs) return false
  }
  return true
}

// Drzewa, pod którymi są znaleziska (z `Finding.forestStand`), od najczęstszego - opcje filtra
// "Drzewostan" w Dzienniku. Pusta lista = filtr się nie pokazuje (nakładka nigdy nie była włączona).
export function listFindingTrees(findings: Finding[]): TreeCode[] {
  const counts = new Map<TreeCode, number>()
  for (const finding of findings) {
    const tree = finding.forestStand?.treeCode
    if (tree) counts.set(tree, (counts.get(tree) ?? 0) + 1)
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([tree]) => tree)
}
