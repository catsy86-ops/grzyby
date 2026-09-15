import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MapOverlayMessages } from './MapOverlayMessages'

describe('MapOverlayMessages', () => {
  afterEach(() => cleanup())

  it('pokazuje podpowiedź o dotknięciu mapy, gdy nie ma żadnych błędów', () => {
    render(
      <MapOverlayMessages
        tileLoadIssue={false}
        onDismissTileLoadIssue={vi.fn()}
        locateError={null}
        onDismissLocateError={vi.fn()}
        showPinHint
      />,
    )
    expect(screen.getByText(/Stuknij na mapie/)).toBeInTheDocument()
  })

  it('błąd lokalizacji ma pierwszeństwo przed podpowiedzią - ukrywa ją', () => {
    render(
      <MapOverlayMessages
        tileLoadIssue={false}
        onDismissTileLoadIssue={vi.fn()}
        locateError="Brak zgody na dostęp do lokalizacji."
        onDismissLocateError={vi.fn()}
        showPinHint
      />,
    )
    expect(screen.getByText('Brak zgody na dostęp do lokalizacji.')).toBeInTheDocument()
    expect(screen.queryByText(/Stuknij na mapie/)).not.toBeInTheDocument()
  })

  it('błąd kafelków ma pierwszeństwo przed błędem lokalizacji i podpowiedzią', () => {
    render(
      <MapOverlayMessages
        tileLoadIssue
        onDismissTileLoadIssue={vi.fn()}
        locateError="Brak zgody na dostęp do lokalizacji."
        onDismissLocateError={vi.fn()}
        showPinHint
      />,
    )
    expect(screen.getByText(/Brak zapisanych kafelków mapy/)).toBeInTheDocument()
    expect(screen.queryByText('Brak zgody na dostęp do lokalizacji.')).not.toBeInTheDocument()
    expect(screen.queryByText(/Stuknij na mapie/)).not.toBeInTheDocument()
  })

  it('nie pokazuje podpowiedzi, gdy showPinHint=false, mimo braku błędów', () => {
    render(
      <MapOverlayMessages
        tileLoadIssue={false}
        onDismissTileLoadIssue={vi.fn()}
        locateError={null}
        onDismissLocateError={vi.fn()}
        showPinHint={false}
      />,
    )
    expect(screen.queryByText(/Stuknij na mapie/)).not.toBeInTheDocument()
  })
})
