import Dexie, { type Table } from 'dexie'
import type { Finding, Photo, Trip } from './schema'

export class GrzybyDatabase extends Dexie {
  findings!: Table<Finding, number>
  trips!: Table<Trip, number>
  photos!: Table<Photo, number>

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
  }
}

export const db = new GrzybyDatabase()
