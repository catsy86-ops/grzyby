import Dexie, { type Table } from 'dexie'
import type { Finding, Photo, Spot, Trip, TripTrailPoint } from './schema'

export class GrzybyDatabase extends Dexie {
  findings!: Table<Finding, number>
  trips!: Table<Trip, number>
  photos!: Table<Photo, number>
  spots!: Table<Spot, number>
  tripTrailPoints!: Table<TripTrailPoint, number>

  constructor() {
    super('lysy-db')
    this.version(1).stores({
      findings: '++id, speciesId, createdAt, tripId',
      trips: '++id, startedAt',
    })
    this.version(2).stores({
      findings: '++id, speciesId, createdAt, tripId',
      trips: '++id, startedAt',
      photos: '++id, findingId',
    })
    // Indeks na reactionSeverity - pozwala wyszukać znaleziska z ciężką reakcją (ostrzeżenie
    // bezpieczeństwa w JournalView) bez skanowania całej tabeli findings.
    this.version(3).stores({
      findings: '++id, speciesId, createdAt, tripId, reactionSeverity',
    })
    // Osobiste "grzybowiska" - nazwane, stałe miejsca niezależne od wypraw (Trip).
    this.version(4).stores({
      findings: '++id, speciesId, createdAt, tripId, reactionSeverity, spotId',
      spots: '++id, createdAt',
    })
    // Ślad GPS z aktywnej wyprawy (trasa, nie tylko punkty start/powrót) - patrz schema.ts.
    this.version(5).stores({
      tripTrailPoints: '++id, tripId, createdAt',
    })
  }
}

export const db = new GrzybyDatabase()
