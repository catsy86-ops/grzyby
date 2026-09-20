import { describe, expect, it } from 'vitest'
import type { Spot, Trip } from '../db/schema'
import { computeNotificationItems, type NotificationCenterInput } from './notificationCenter'

function baseInput(overrides: Partial<NotificationCenterInput> = {}): NotificationCenterInput {
  return {
    findingsCount: 0,
    lastExportAt: null,
    backupSnoozedUntil: null,
    activeTrip: null,
    spots: [],
    ...overrides,
  }
}

function trip(overrides: Partial<Trip> = {}): Trip {
  return { name: 'Wyprawa', startedAt: 1, endedAt: null, notes: '', ...overrides }
}

function spot(overrides: Partial<Spot> = {}): Spot {
  return { name: 'Spot', latitude: 0, longitude: 0, notes: '', createdAt: 1, ...overrides }
}

const NOW = new Date(2026, 8, 15).getTime() // wrzesień 2026

describe('computeNotificationItems', () => {
  it('zwraca pustą listę, gdy nic nie wymaga uwagi', () => {
    expect(computeNotificationItems(baseInput(), NOW)).toEqual([])
  })

  it('dodaje przypomnienie o backupie, gdy shouldRemindBackup zwraca true', () => {
    const items = computeNotificationItems(baseInput({ findingsCount: 10, lastExportAt: null }), NOW)
    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({ id: 'backup', action: 'export' })
  })

  it('dodaje ostrzeżenie o przeciągającej się wyprawie', () => {
    const items = computeNotificationItems(
      baseInput({ activeTrip: trip({ name: 'Niedzielna', plannedReturnAt: NOW - 1000 }) }),
      NOW,
    )
    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({ id: 'overdue-trip', action: 'go-to-map' })
    expect(items[0].description).toContain('Niedzielna')
  })

  it('nie dodaje ostrzeżenia o wyprawie, gdy planowany powrót jeszcze nie minął', () => {
    const items = computeNotificationItems(
      baseInput({ activeTrip: trip({ plannedReturnAt: NOW + 1000 }) }),
      NOW,
    )
    expect(items).toEqual([])
  })

  it('dodaje przypomnienie o rewizycie dla każdego pasującego spotu', () => {
    const items = computeNotificationItems(
      baseInput({
        spots: [
          spot({ id: 1, name: 'Gotowy', revisitMonth: 9, revisitFlaggedAt: NOW - 320 * 24 * 60 * 60_000 }),
          spot({ id: 2, name: 'Za wcześnie', revisitMonth: 9, revisitFlaggedAt: NOW }),
          spot({ id: 3, name: 'Bez flagi' }),
        ],
      }),
      NOW,
    )
    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({ id: 'revisit-1', action: 'go-to-map' })
    expect(items[0].title).toContain('Gotowy')
  })

  it('agreguje wiele różnych powiadomień naraz', () => {
    const items = computeNotificationItems(
      baseInput({
        findingsCount: 10,
        activeTrip: trip({ plannedReturnAt: NOW - 1000 }),
        spots: [spot({ id: 1, name: 'X', revisitMonth: 9, revisitFlaggedAt: NOW - 320 * 24 * 60 * 60_000 })],
      }),
      NOW,
    )
    expect(items.map((i) => i.id)).toEqual(['backup', 'overdue-trip', 'revisit-1'])
  })
})
