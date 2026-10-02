import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../../db/db'
import { useAppStore } from '../../stores/appStore'
import { Toaster } from '../../components/ui/sonner'
import { ForestStandBackfill } from './ForestStandBackfill'

const STAND_RESPONSE = JSON.stringify({ features: [{ properties: { species_cd_d: 'SO', species_age: '97' } }] })

function addFinding() {
  return db.findings.add({ speciesId: null, speciesNameGuess: null, latitude: 53.3, longitude: 14.6, notes: '', createdAt: 1 })
}

describe('ForestStandBackfill', () => {
  beforeEach(async () => {
    await db.findings.clear()
    // spyOn zamiast stubGlobal - vi.unstubAllGlobals() skasowałoby też globalną atrapę matchMedia
    // z vitest.setup.ts, potrzebną przez Toaster.
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(STAND_RESPONSE))
  })
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    useAppStore.setState({ mapOverlayIds: [] })
  })

  it('nie pokazuje się bez włączonej nakładki Drzewostany', async () => {
    await addFinding()
    const { container } = render(<ForestStandBackfill />)
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(container).toBeEmptyDOMElement()
  })

  it('uzupełnia drzewostan znalezisk po kliknięciu i znika', async () => {
    useAppStore.setState({ mapOverlayIds: ['forest'] })
    const id = (await addFinding()) as number
    render(
      <>
        <ForestStandBackfill />
        <Toaster />
      </>,
    )

    expect(await screen.findByText('1 znalezisko z lokalizacją bez danych o drzewostanie.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Uzupełnij' }))

    expect(await screen.findByText('Sprawdzono drzewostan: 1 znalezisko.')).toBeInTheDocument()
    expect((await db.findings.get(id))?.forestStand?.treeName).toBe('Sosna')
    expect(screen.queryByRole('button', { name: 'Uzupełnij' })).not.toBeInTheDocument()
  })
})
