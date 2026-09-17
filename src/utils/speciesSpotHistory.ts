import { db } from '../db/db'

export interface SpeciesSpotHistory {
  spotId: number
  spotName: string
  count: number
  lastFoundAt: number
}

// Własne, sprawdzone miejsca dla danego gatunku (patrz "Leśny asystent" w EncyclopediaView) -
// znaleziska bez przypisanego grzybowiska (spotId) są pomijane, bo nie da się ich powiązać z
// żadnym konkretnym, nazwanym miejscem do polecenia.
export async function getSpeciesSpotHistory(speciesId: string): Promise<SpeciesSpotHistory[]> {
  const findings = await db.findings.where('speciesId').equals(speciesId).toArray()

  const bySpot = new Map<number, { count: number; lastFoundAt: number }>()
  for (const finding of findings) {
    if (finding.spotId == null) continue
    const existing = bySpot.get(finding.spotId)
    if (existing) {
      existing.count += 1
      existing.lastFoundAt = Math.max(existing.lastFoundAt, finding.createdAt)
    } else {
      bySpot.set(finding.spotId, { count: 1, lastFoundAt: finding.createdAt })
    }
  }
  if (bySpot.size === 0) return []

  const spots = await db.spots.bulkGet([...bySpot.keys()])
  return spots
    .filter((spot): spot is NonNullable<typeof spot> => spot != null && spot.id != null)
    .map((spot) => ({
      spotId: spot.id!,
      spotName: spot.name,
      ...bySpot.get(spot.id!)!,
    }))
    .sort((a, b) => b.lastFoundAt - a.lastFoundAt)
}
