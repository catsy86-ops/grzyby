import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ALL_SPECIES } from '../../data/species'
import { EncyclopediaView } from './EncyclopediaView'

// Osobny plik, bo mock mushroomModel dotyczy całego modułu testowego - w EncyclopediaView.test.tsx
// etykiety modelu nie są istotne (fetch metadata.json w jsdom zawodzi -> cały atlas jako znany).
vi.mock('../../utils/mushroomModel', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../utils/mushroomModel')>()
  return { ...actual, loadClassLabels: vi.fn(async () => [ALL_SPECIES[0].id, 'inne']) }
})

describe('EncyclopediaView - plakietka "Poza skanerem"', () => {
  afterEach(() => cleanup())

  it('oznacza wszystkie gatunki, których skaner AI nie zna', async () => {
    render(<EncyclopediaView />)

    expect(await screen.findAllByText('Poza skanerem')).toHaveLength(ALL_SPECIES.length - 1)
  })
})
