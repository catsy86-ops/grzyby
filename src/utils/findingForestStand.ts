import { TREE_UNDER } from '../data/forestCodes'
import { db } from '../db/db'
import type { FindingForestStand } from '../db/schema'
import { useAppStore } from '../stores/appStore'
import { fetchForestStand, formatStandAge } from './forestStand'

// Współrzędne znaleziska (często czyjaś "tajna" miejscówka) wysyłamy do BDL tylko wtedy, gdy
// użytkownik sam włączył nakładkę Drzewostany - czyli już świadomie korzysta z tego serwera.
export function canAttachForestStand(): boolean {
  return useAppStore.getState().mapOverlayIds.includes('forest') && navigator.onLine
}

// Dopisuje drzewostan do zapisanego już znaleziska - w tle, po zapisie, bez blokowania
// formularza. Każdy błąd (brak sieci, timeout BDL, punkt poza lasem) jest cichy: to dodatek,
// a znalezisko jest już bezpiecznie zapisane.
export async function attachForestStand(findingId: number, latitude: number, longitude: number): Promise<void> {
  if (!canAttachForestStand()) return
  try {
    const stand = await fetchForestStand(latitude, longitude, AbortSignal.timeout(15000))
    if (!stand) return
    const forestStand: FindingForestStand = {
      treeCode: stand.treeCode,
      treeName: stand.treeName,
      age: stand.age,
      siteType: stand.siteType,
    }
    await db.findings.update(findingId, { forestStand })
  } catch {
    // Celowo cicho - patrz komentarz wyżej.
  }
}

// "pod bukiem, 136 lat · las świeży"
export function describeForestStand(stand: FindingForestStand): string {
  const under = stand.treeCode ? TREE_UNDER[stand.treeCode] : `drzewostan ${stand.treeName}`
  const age = stand.age !== null ? `, ${formatStandAge(stand.age)}` : ''
  return [`${under}${age}`, stand.siteType].filter(Boolean).join(' · ')
}
