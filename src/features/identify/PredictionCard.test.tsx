import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Prediction } from '../../utils/mushroomModel'
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
})
