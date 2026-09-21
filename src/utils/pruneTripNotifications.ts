// Trzy niezależne hooki (useStormWarning/useOverdueTripReminder/useTickReminders) piszą do
// localStorage klucze per-wyprawa (`<prefix><tripId>`) jako "już powiadomiono o tym", ale żaden
// z nich nigdy ich nie usuwał - przy wieloletnim użytkowaniu apki rosną nieograniczenie (choć to
// małe stringi, więc niska dotkliwość). Ta funkcja czyści klucze wskazujące na wyprawy, których
// już nie ma w bazie (usunięte ręcznie albo - w praktyce częściej - z dawna zakończone i
// nieistotne). Osobna, czysta funkcja (nie hook) - łatwa do testowania bez mockowania Dexie.
const PRUNE_PREFIXES = ['lysy-storm-warning-notified-', 'lysy-overdue-trip-notified-', 'lysy-tick-spray-last-notified-']

const TICK_CHECK_NOTIFIED_TRIP_IDS_KEY = 'lysy-tick-check-notified-trip-ids'

export function pruneTripNotificationKeys(existingTripIds: Set<number>, storage: Storage = localStorage): void {
  const keysToRemove: string[] = []
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i)
    if (!key) continue
    const prefix = PRUNE_PREFIXES.find((p) => key.startsWith(p))
    if (!prefix) continue
    const tripId = Number(key.slice(prefix.length))
    if (!Number.isFinite(tripId) || !existingTripIds.has(tripId)) keysToRemove.push(key)
  }
  for (const key of keysToRemove) storage.removeItem(key)

  // Ten klucz to pojedynczy JSON-array (nie jedno-klucz-na-wyprawę jak wyżej) - filtrowany
  // osobno zamiast usuwany w całości, żeby nie zgubić wpisów dla wciąż istniejących wypraw.
  try {
    const raw = storage.getItem(TICK_CHECK_NOTIFIED_TRIP_IDS_KEY)
    if (raw) {
      const ids = (JSON.parse(raw) as number[]).filter((id) => existingTripIds.has(id))
      storage.setItem(TICK_CHECK_NOTIFIED_TRIP_IDS_KEY, JSON.stringify(ids))
    }
  } catch {
    // JSON uszkodzony/localStorage niedostępny - nic krytycznego, zostawiamy jak jest
  }
}
