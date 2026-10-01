import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../db/db'
import type { Finding } from '../../db/schema'
import speciesData from '../../data/species.json'
import { ConsumptionTracker } from './ConsumptionTracker'

// Gatunek bez sobowtórów wybierany z danych, nie wpisany na sztywno - rozszerzenie atlasu
// (nowe gatunki dopinają odwrotne powiązania `lookalikes` do istniejących wpisów) potrafiło
// unieważnić taki zahardkodowany fixture, choć sam komponent działał poprawnie.
const SPECIES_WITHOUT_LOOKALIKES = (speciesData as { id: string; lookalikes: string[] }[]).find(
  (s) => s.lookalikes.length === 0,
)!.id

beforeEach(async () => {
  await db.findings.clear()
})

async function addFinding(overrides: Partial<Finding>): Promise<Finding> {
  const base: Finding = {
    speciesId: null,
    speciesNameGuess: null,
    latitude: null,
    longitude: null,
    notes: '',
    createdAt: Date.now(),
    consumed: false,
    consumedAt: null,
    reactionSeverity: null,
    reactionNotes: '',
    ...overrides,
  }
  const id = await db.findings.add(base)
  return { ...base, id }
}

describe('ConsumptionTracker', () => {
  it('oznacza od razu jako zjedzone, gdy gatunek nie ma sobowtórów', async () => {
    const finding = await addFinding({ speciesId: SPECIES_WITHOUT_LOOKALIKES })
    render(<ConsumptionTracker finding={finding} />)

    fireEvent.click(screen.getByRole('button', { name: 'Oznacz jako zjedzone' }))

    await waitFor(async () => {
      const updated = await db.findings.get(finding.id!)
      expect(updated?.consumed).toBe(true)
    })
    expect(screen.queryByText('Sprawdziłeś cechy sobowtórów?')).not.toBeInTheDocument()
  })

  it('pokazuje przypomnienie o sobowtórach przed potwierdzeniem, gdy gatunek je ma', async () => {
    const finding = await addFinding({ speciesId: 'borowik-szlachetny' })
    render(<ConsumptionTracker finding={finding} />)

    fireEvent.click(screen.getByRole('button', { name: 'Oznacz jako zjedzone' }))

    expect(await screen.findByText('Sprawdziłeś cechy sobowtórów?')).toBeInTheDocument()
    expect(screen.getByText(/Borowik szatański/)).toBeInTheDocument()
    expect(screen.getByText(/Goryczak żółciowy/)).toBeInTheDocument()

    const updatedBeforeConfirm = await db.findings.get(finding.id!)
    expect(updatedBeforeConfirm?.consumed).toBe(false)

    fireEvent.click(screen.getByRole('button', { name: 'Tak, sprawdziłem, potwierdź' }))

    await waitFor(async () => {
      const updated = await db.findings.get(finding.id!)
      expect(updated?.consumed).toBe(true)
    })
  })

  it('nie oznacza jako zjedzone, gdy przypomnienie zostanie anulowane', async () => {
    const finding = await addFinding({ speciesId: 'borowik-szlachetny' })
    render(<ConsumptionTracker finding={finding} />)

    fireEvent.click(screen.getByRole('button', { name: 'Oznacz jako zjedzone' }))
    await screen.findByText('Sprawdziłeś cechy sobowtórów?')
    fireEvent.click(screen.getByRole('button', { name: 'Anuluj' }))

    const updated = await db.findings.get(finding.id!)
    expect(updated?.consumed).toBe(false)
  })
})
