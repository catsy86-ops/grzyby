import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../db/db'
import { SeasonSummary } from './SeasonSummary'

function findingAt(dateIso: string, overrides: Partial<Parameters<typeof db.findings.add>[0]> = {}) {
  return {
    speciesId: null,
    speciesNameGuess: null,
    latitude: null,
    longitude: null,
    notes: '',
    createdAt: new Date(dateIso).getTime(),
    ...overrides,
  }
}

describe('SeasonSummary', () => {
  beforeEach(async () => {
    await db.transaction('rw', db.findings, db.trips, async () => {
      await db.findings.clear()
      await db.trips.clear()
    })
  })

  afterEach(() => cleanup())

  it('nie renderuje się, gdy brak znalezisk w bieżącym roku', async () => {
    await db.findings.add(findingAt('2020-01-01'))
    const { container } = render(<SeasonSummary />)
    await waitFor(() => expect(container.querySelector('[data-slot=card]')).toBeNull())
  })

  it('pokazuje liczbę znalezisk i gatunków z bieżącego roku', async () => {
    const now = new Date()
    const thisYear = `${now.getFullYear()}-06-15`
    await db.findings.bulkAdd([
      findingAt(thisYear, { speciesId: 'borowik' }),
      findingAt(thisYear, { speciesId: 'kurka' }),
      findingAt(thisYear, { speciesId: 'borowik' }),
    ])

    render(<SeasonSummary />)

    await waitFor(() => expect(screen.getByText(`Sezon ${now.getFullYear()}`)).toBeInTheDocument())
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('pokazuje porównanie deszczowych/suchych wypraw, gdy jest wystarczająco danych', async () => {
    const now = new Date()
    const thisYear = `${now.getFullYear()}-06-15`
    await db.findings.add(findingAt(thisYear, { speciesId: 'borowik' }))

    const rainyIds = await db.trips.bulkAdd(
      [1, 2, 3].map(() => ({ name: 'Deszczowa', startedAt: Date.now(), endedAt: Date.now(), notes: '', wasRainy: true })),
      { allKeys: true },
    )
    await db.trips.bulkAdd(
      [1, 2, 3].map(() => ({ name: 'Sucha', startedAt: Date.now(), endedAt: Date.now(), notes: '', wasRainy: false })),
    )
    // 2 znaleziska na każdą deszczową wyprawę, 0 na suche - jednoznaczna przewaga deszczowych.
    await db.findings.bulkAdd(
      rainyIds.flatMap((id) => [findingAt(thisYear, { tripId: id as number }), findingAt(thisYear, { tripId: id as number })]),
    )

    render(<SeasonSummary />)

    expect(await screen.findByText(/Podczas deszczowych wypraw znajdujesz średnio/)).toBeInTheDocument()
  })

  it('nie pokazuje porównania, gdy za mało wypraw z zapisanym wasRainy', async () => {
    const now = new Date()
    await db.findings.add(findingAt(`${now.getFullYear()}-06-15`, { speciesId: 'borowik' }))
    await db.trips.add({ name: 'Jedyna', startedAt: Date.now(), endedAt: Date.now(), notes: '', wasRainy: true })

    render(<SeasonSummary />)

    await waitFor(() => expect(screen.getByText(`Sezon ${now.getFullYear()}`)).toBeInTheDocument())
    expect(screen.queryByText(/wypraw znajdujesz średnio/)).not.toBeInTheDocument()
  })
})
