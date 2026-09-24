import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Prediction } from '../../utils/mushroomModel'
import { useAppStore } from '../../stores/appStore'
import { PredictionCard } from './PredictionCard'

function makePrediction(overrides: Partial<Prediction> = {}): Prediction {
  return {
    labelRaw: 'borowik-szlachetny',
    confidence: 0.9,
    species: {
      id: 'borowik-szlachetny',
      nameCommon: 'Borowik szlachetny',
      nameLatin: 'Boletus edulis',
      edibility: 'jadalny',
      description: 'Opis borowika.',
      habitat: 'Lasy iglaste i liściaste',
      season: 'lato-jesień',
      lookalikes: [],
      imageUrls: [],
    },
    ...overrides,
  }
}

describe('PredictionCard', () => {
  it('renderuje wariant niskiej pewności, gdy confidence < 40%, bez ujawniania nazwy gatunku', () => {
    render(<PredictionCard prediction={makePrediction({ confidence: 0.39 })} rank={1} />)

    expect(screen.getByText(/zbyt niska pewność/i)).toBeInTheDocument()
    expect(screen.queryByText('Opis borowika.')).not.toBeInTheDocument()
    // Twarde wstrzymanie wyniku (patrz komentarz w PredictionCard.tsx) - nawet podpisana jako
    // "niepewna" sugestia gatunku to wciąż sugestia przy klasyfikatorze jadalny/trujący.
    expect(screen.queryByText(/borowik szlachetny/i)).not.toBeInTheDocument()
  })

  it('renderuje pełną kartę, gdy confidence >= 40%', () => {
    render(<PredictionCard prediction={makePrediction({ confidence: 0.4 })} rank={1} />)

    expect(screen.queryByText(/zbyt niska pewność/i)).not.toBeInTheDocument()
    expect(screen.getByText('Boletus edulis')).toBeInTheDocument()
    expect(screen.getByText('Opis borowika.')).toBeInTheDocument()
  })

  it('pokazuje czytelny tekst zamiast surowej etykiety dla klasy negatywnej "inne"', () => {
    render(
      <PredictionCard
        prediction={makePrediction({ labelRaw: 'inne', species: null, confidence: 0.8 })}
        rank={1}
      />,
    )

    expect(screen.getByText(/to raczej nie jest grzyb/i)).toBeInTheDocument()
    expect(screen.queryByText('inne')).not.toBeInTheDocument()
  })

  it('nie pokazuje przycisku "Dodaj do dziennika" dla klasy negatywnej "inne" (species = null)', () => {
    render(
      <PredictionCard
        prediction={makePrediction({ labelRaw: 'inne', species: null, confidence: 0.8 })}
        rank={1}
      />,
    )

    expect(screen.queryByRole('button', { name: /dodaj do dziennika/i })).not.toBeInTheDocument()
  })

  it('"Dodaj do dziennika" ustawia pendingIdentifiedSpeciesId i przełącza na zakładkę Mapa', () => {
    useAppStore.setState({ pendingIdentifiedSpeciesId: null, activeTab: 'rozpoznaj' })
    render(<PredictionCard prediction={makePrediction()} rank={1} />)

    fireEvent.click(screen.getByRole('button', { name: /dodaj do dziennika/i }))

    expect(useAppStore.getState().pendingIdentifiedSpeciesId).toBe('borowik-szlachetny')
    expect(useAppStore.getState().activeTab).toBe('mapa')
  })
})
