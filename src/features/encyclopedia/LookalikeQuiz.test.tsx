import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LookalikeQuiz } from './LookalikeQuiz'

afterEach(() => cleanup())

describe('LookalikeQuiz', () => {
  it('nie renderuje treści, gdy zamknięty', () => {
    render(<LookalikeQuiz open={false} onOpenChange={vi.fn()} />)
    expect(screen.queryByText('Quiz sobowtórów')).not.toBeInTheDocument()
  })

  it('pokazuje pytanie i dwóch kandydatów, gdy otwarty', () => {
    render(<LookalikeQuiz open onOpenChange={vi.fn()} />)

    expect(screen.getByText('Quiz sobowtórów')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /Kandydat [AB]/ })).toHaveLength(2)
    expect(screen.getByText('0/0')).toBeInTheDocument()
  })

  it('po odpowiedzi aktualizuje wynik i odsłania nazwy obu gatunków', () => {
    render(<LookalikeQuiz open onOpenChange={vi.fn()} />)

    const [first] = screen.getAllByRole('button', { name: /Kandydat [AB]/ })
    fireEvent.click(first)

    // Po odpowiedzi etykiety przycisków zmieniają się z pozycyjnych na nazwy gatunków, a wynik
    // (poprawna/błędna) rośnie o jedno pytanie niezależnie od trafienia.
    expect(screen.queryByRole('button', { name: /Kandydat [AB]/ })).not.toBeInTheDocument()
    expect(screen.getByText(/^[01]\/1$/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Następne pytanie' })).toBeInTheDocument()
  })

  it('ignoruje kolejne kliknięcia w kandydatów po udzieleniu odpowiedzi', () => {
    render(<LookalikeQuiz open onOpenChange={vi.fn()} />)

    const [first] = screen.getAllByRole('button', { name: /Kandydat [AB]/ })
    fireEvent.click(first)
    const scoreBefore = screen.getByText(/^[01]\/1$/).textContent

    // Przyciski są `disabled` po odpowiedzi - to sprawdza, że kliknięcie faktycznie nic nie robi,
    // nie tylko że atrybut jest ustawiony.
    for (const button of screen.getAllByRole('button')) {
      if (button.textContent?.includes('Następne') || button.textContent?.includes('Reset')) continue
      fireEvent.click(button)
    }

    expect(screen.getByText(scoreBefore!)).toBeInTheDocument()
  })

  it('"Następne pytanie" losuje kolejną rundę i wraca do stanu bez odpowiedzi', () => {
    render(<LookalikeQuiz open onOpenChange={vi.fn()} />)

    fireEvent.click(screen.getAllByRole('button', { name: /Kandydat [AB]/ })[0])
    fireEvent.click(screen.getByRole('button', { name: 'Następne pytanie' }))

    expect(screen.getAllByRole('button', { name: /Kandydat [AB]/ })).toHaveLength(2)
    expect(screen.queryByRole('button', { name: 'Następne pytanie' })).not.toBeInTheDocument()
  })

  it('"Reset wyniku" zeruje licznik i losuje nową rundę', () => {
    render(<LookalikeQuiz open onOpenChange={vi.fn()} />)

    fireEvent.click(screen.getAllByRole('button', { name: /Kandydat [AB]/ })[0])
    fireEvent.click(screen.getByRole('button', { name: 'Reset wyniku' }))

    expect(screen.getByText('0/0')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /Kandydat [AB]/ })).toHaveLength(2)
  })
})
