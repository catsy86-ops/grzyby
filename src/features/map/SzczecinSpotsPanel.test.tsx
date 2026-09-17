import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SzczecinSpotsPanel } from './SzczecinSpotsPanel'
import { szczecinSpots } from '../../data/szczecinSpots'

describe('SzczecinSpotsPanel', () => {
  afterEach(() => cleanup())

  it('pokazuje wszystkie kuratorowane grzybowiska z linkiem do źródła', () => {
    render(<SzczecinSpotsPanel open onOpenChange={vi.fn()} onShowOnMap={vi.fn()} />)

    for (const spot of szczecinSpots) {
      expect(screen.getByText(spot.name)).toBeInTheDocument()
    }
    expect(screen.getAllByRole('link', { name: /Źródło:/ })).toHaveLength(szczecinSpots.length)
  })

  it('linki do źródeł otwierają się w nowej karcie i mają poprawny href', () => {
    render(<SzczecinSpotsPanel open onOpenChange={vi.fn()} onShowOnMap={vi.fn()} />)

    const firstSpot = szczecinSpots[0]
    const link = screen.getByText(new RegExp(`Źródło: ${firstSpot.sourceLabel}`)).closest('a')
    expect(link).toHaveAttribute('href', firstSpot.sourceUrl)
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noreferrer')
  })

  it('"Pokaż na mapie" wywołuje onShowOnMap ze współrzędnymi i zamyka panel', () => {
    const onShowOnMap = vi.fn()
    const onOpenChange = vi.fn()
    render(<SzczecinSpotsPanel open onOpenChange={onOpenChange} onShowOnMap={onShowOnMap} />)

    const firstSpot = szczecinSpots[0]
    const buttons = screen.getAllByRole('button', { name: 'Pokaż na mapie' })
    fireEvent.click(buttons[0])

    expect(onShowOnMap).toHaveBeenCalledWith([firstSpot.latitude, firstSpot.longitude])
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('nie renderuje treści panelu, gdy open=false', () => {
    render(<SzczecinSpotsPanel open={false} onOpenChange={vi.fn()} onShowOnMap={vi.fn()} />)

    expect(screen.queryByText('Szczecin i okolice')).not.toBeInTheDocument()
  })
})
