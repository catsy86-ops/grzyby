import { TREE_UNDER } from '../data/forestCodes'
import { db } from '../db/db'
import type { Finding, FindingForestStand } from '../db/schema'
import { useAppStore } from '../stores/appStore'
import { fetchForestStand, formatStandAge } from './forestStand'

// Współrzędne znaleziska (często czyjaś "tajna" miejscówka) wysyłamy do BDL tylko wtedy, gdy
// użytkownik sam włączył nakładkę Drzewostany - czyli już świadomie korzysta z tego serwera.
export function canAttachForestStand(): boolean {
  return useAppStore.getState().mapOverlayIds.includes('forest') && navigator.onLine
}

// `AbortSignal.any` jest dopiero od Safari 17.4 - na starszych przerwanie przez użytkownika i tak
// sprawdza pętla w backfillForestStands, więc wystarczy sam timeout.
function withTimeout(signal?: AbortSignal): AbortSignal {
  const timeout = AbortSignal.timeout(15000)
  return signal && typeof AbortSignal.any === 'function' ? AbortSignal.any([signal, timeout]) : timeout
}

// Pobiera drzewostan i zapisuje go przy znalezisku (`null`, gdy to nie las). Zwraca false przy
// błędzie sieci/serwera - wtedy pole zostaje nietknięte, żeby dało się spróbować ponownie.
async function fetchAndStore(findingId: number, latitude: number, longitude: number, signal?: AbortSignal) {
  try {
    const stand = await fetchForestStand(latitude, longitude, withTimeout(signal))
    const forestStand: FindingForestStand | null = stand
      ? { treeCode: stand.treeCode, treeName: stand.treeName, age: stand.age, siteType: stand.siteType }
      : null
    await db.findings.update(findingId, { forestStand })
    return true
  } catch {
    return false
  }
}

// Dopisuje drzewostan do zapisanego już znaleziska - w tle, po zapisie, bez blokowania
// formularza. Każdy błąd (brak sieci, timeout BDL) jest cichy: to dodatek, a znalezisko jest
// już bezpiecznie zapisane.
export async function attachForestStand(findingId: number, latitude: number, longitude: number): Promise<void> {
  if (!canAttachForestStand()) return
  await fetchAndStore(findingId, latitude, longitude)
}

// Znaleziska z lokalizacją, dla których drzewostanu jeszcze nie sprawdzano (np. sprzed tej funkcji).
export function needsForestStand(finding: Finding): finding is Finding & { id: number; latitude: number; longitude: number } {
  return finding.id != null && finding.latitude != null && finding.longitude != null && finding.forestStand === undefined
}

export interface BackfillResult {
  checked: number
  failed: number
}

// Jednorazowe uzupełnienie starych znalezisk - po kolei, nie równolegle, żeby nie zasypać
// publicznego serwera BDL dziesiątkami zapytań naraz.
export async function backfillForestStands(
  findings: Finding[],
  onProgress: (done: number, total: number) => void,
  signal: AbortSignal,
): Promise<BackfillResult> {
  const pending = findings.filter(needsForestStand)
  let failed = 0
  for (const [index, finding] of pending.entries()) {
    if (signal.aborted) return { checked: index - failed, failed }
    if (!(await fetchAndStore(finding.id, finding.latitude, finding.longitude, signal))) failed++
    onProgress(index + 1, pending.length)
  }
  return { checked: pending.length - failed, failed }
}

// "pod bukiem, 136 lat · las świeży"
export function describeForestStand(stand: FindingForestStand): string {
  const under = stand.treeCode ? TREE_UNDER[stand.treeCode] : `drzewostan ${stand.treeName}`
  const age = stand.age !== null ? `, ${formatStandAge(stand.age)}` : ''
  return [`${under}${age}`, stand.siteType].filter(Boolean).join(' · ')
}
