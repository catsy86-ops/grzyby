import Dexie, { type Table } from 'dexie'
import type { Finding, Trip } from './schema'

export class GrzybyDatabase extends Dexie {
  findings!: Table<Finding, number>
  trips!: Table<Trip, number>

  constructor() {
    super('lysy-db')
    this.version(1).stores({
      findings: '++id, speciesId, createdAt, tripId',
      trips: '++id, startedAt',
    })
  }
}

export const db = new GrzybyDatabase()
