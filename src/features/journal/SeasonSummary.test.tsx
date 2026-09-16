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
    await db.findings.clear()
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
})
