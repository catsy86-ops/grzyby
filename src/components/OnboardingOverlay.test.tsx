import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { OnboardingOverlay } from './OnboardingOverlay'

const SEEN_KEY = 'lysy-onboarding-seen'

beforeEach(() => {
  localStorage.removeItem(SEEN_KEY)
})

afterEach(() => {
  cleanup()
  localStorage.removeItem(SEEN_KEY)
})

describe('OnboardingOverlay', () => {
  it('pokazuje pierwszy slajd przy pierwszym uruchomieniu', () => {
    render(<OnboardingOverlay />)
    expect(screen.getByText('Zapisuj znaleziska na mapie')).toBeInTheDocument()
  })

  it('nie renderuje się, gdy onboarding już widziany', () => {
    localStorage.setItem(SEEN_KEY, '1')
    const { container } = render(<OnboardingOverlay />)
    expect(container).toBeEmptyDOMElement()
  })

  it('przechodzi do kolejnych slajdów i kończy na ostatnim', async () => {
    render(<OnboardingOverlay />)
    fireEvent.click(screen.getByRole('button', { name: 'Dalej' }))
    await waitFor(() => expect(screen.getByText('Rozpoznaj gatunek ze zdjęcia')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: 'Dalej' }))
    await waitFor(() => expect(screen.getByText('Narzędzia zawsze pod ręką')).toBeInTheDocument())
    expect(screen.getByRole('button', { name: 'Zaczynajmy' })).toBeInTheDocument()
  })

  it('pomija onboarding i zapisuje flagę w localStorage', () => {
    const { container } = render(<OnboardingOverlay />)
    fireEvent.click(screen.getByRole('button', { name: 'Pomiń' }))
    expect(container).toBeEmptyDOMElement()
    expect(localStorage.getItem(SEEN_KEY)).toBe('1')
  })

  it('pozwala cofnąć się do poprzedniego slajdu przyciskiem "Wstecz"', async () => {
    render(<OnboardingOverlay />)
    expect(screen.queryByRole('button', { name: 'Wstecz' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Dalej' }))
    await waitFor(() => expect(screen.getByText('Rozpoznaj gatunek ze zdjęcia')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: 'Wstecz' }))
    await waitFor(() => expect(screen.getByText('Zapisuj znaleziska na mapie')).toBeInTheDocument())
    expect(screen.queryByRole('button', { name: 'Wstecz' })).not.toBeInTheDocument()
  })

  it('pozwala skoczyć do dowolnego slajdu klikając kropkę postępu', async () => {
    render(<OnboardingOverlay />)
    fireEvent.click(screen.getByRole('button', { name: 'Slajd 3 z 3' }))
    await waitFor(() => expect(screen.getByText('Narzędzia zawsze pod ręką')).toBeInTheDocument())
  })

  it('forceReplayKey otwiera onboarding ponownie nawet po wcześniejszym "Pomiń"', () => {
    localStorage.setItem(SEEN_KEY, '1')
    const { rerender } = render(<OnboardingOverlay forceReplayKey={0} />)
    expect(screen.queryByText('Zapisuj znaleziska na mapie')).not.toBeInTheDocument()

    rerender(<OnboardingOverlay forceReplayKey={1} />)
    expect(screen.getByText('Zapisuj znaleziska na mapie')).toBeInTheDocument()
  })
})
