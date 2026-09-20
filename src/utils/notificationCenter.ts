import type { Spot, Trip } from '../db/schema'
import { shouldRemindBackup } from './backupReminder'
import { isTripOverdue } from './overdueTrip'
import { shouldRemindRevisit } from './spotRevisit'

// Centralny panel powiadomień (nowe.md/UI-QOL-ROADMAP, Część 2 pkt 7) - agreguje TE SAME warunki,
// które już dziś wyzwalają osobne lokalne notyfikacje/bannery (backup, przeciągająca się
// wyprawa, rewizyta grzybowiska), w jedno miejsce "co wymaga uwagi", niezależnie od tego, na
// której zakładce jest użytkownik i czy widział/odrzucił systemową notyfikację. Celowo NIE
// obejmuje ostrzeżenia sztormowego (useStormWarning.ts) - to jednorazowy fetch pogody per
// wyprawa, odtwarzanie go tutaj wymagałoby drugiego wywołania sieciowego bez realnej wartości
// (ostrzeżenie już raz wysłane jako notyfikacja systemowa).
export type NotificationAction = 'export' | 'go-to-map'

export interface NotificationItem {
  id: string
  title: string
  description: string
  action: NotificationAction
}

export interface NotificationCenterInput {
  findingsCount: number
  lastExportAt: number | null
  backupSnoozedUntil: number | null
  activeTrip: Trip | null
  spots: Spot[]
}

export function computeNotificationItems(input: NotificationCenterInput, now: number): NotificationItem[] {
  const items: NotificationItem[] = []

  if (shouldRemindBackup(input.lastExportAt, input.findingsCount, now, input.backupSnoozedUntil)) {
    items.push({
      id: 'backup',
      title: 'Zrób backup dziennika',
      description:
        input.lastExportAt == null
          ? 'Nie masz jeszcze eksportu danych - apka działa offline, to jedyna kopia.'
          : 'Dawno nie robiono eksportu danych.',
      action: 'export',
    })
  }

  if (input.activeTrip && isTripOverdue(input.activeTrip.plannedReturnAt, now)) {
    items.push({
      id: 'overdue-trip',
      title: 'Wyprawa się przeciąga',
      description: `"${input.activeTrip.name}" trwa dłużej niż planowany powrót.`,
      action: 'go-to-map',
    })
  }

  for (const spot of input.spots) {
    if (spot.revisitMonth == null || spot.revisitFlaggedAt == null) continue
    if (shouldRemindRevisit(spot.revisitMonth, spot.revisitFlaggedAt, now)) {
      items.push({
        id: `revisit-${spot.id}`,
        title: `Sprawdź grzybowisko: ${spot.name}`,
        description: 'W tym miesiącu w poprzednich latach coś tu rosło.',
        action: 'go-to-map',
      })
    }
  }

  return items
}
