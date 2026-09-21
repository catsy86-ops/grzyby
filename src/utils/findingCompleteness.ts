import type { Finding } from '../db/schema'

// "Do uzupełnienia" (ROZBUDOWA-ROADMAP.md Część 2 pkt 3) - znaleziska dodane w pośpiechu w
// terenie (np. dyktowanie głosowe bez otwierania aparatu) często zostają bez przypisanego
// gatunku lub bez zdjęcia. Osobna, czysta funkcja (nie hook) - `findingIdsWithPhoto` to zbiór
// id znalezień MAJĄCYCH co najmniej jedno zdjęcie (patrz JournalView.tsx - budowany przez
// `db.photos.orderBy('findingId').uniqueKeys()`, żeby nie wczytywać blobów zdjęć tylko po to,
// by sprawdzić ich istnienie).
export function isIncompleteFinding(finding: Finding, findingIdsWithPhoto: ReadonlySet<number>): boolean {
  if (finding.speciesId == null) return true
  return finding.id != null && !findingIdsWithPhoto.has(finding.id)
}

export function filterIncompleteFindings(findings: Finding[], findingIdsWithPhoto: ReadonlySet<number>): Finding[] {
  return findings.filter((f) => isIncompleteFinding(f, findingIdsWithPhoto))
}
