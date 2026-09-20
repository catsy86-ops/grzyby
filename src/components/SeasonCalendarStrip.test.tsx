import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SeasonCalendarStrip } from './SeasonCalendarStrip'

describe('SeasonCalendarStrip', () => {
  it('renderuje 12 komórek miesięcy z etykietą całego zakresu', () => {
    render(<SeasonCalendarStrip season="Czerwiec - październik" />)
    const strip = screen.getByRole('img', { name: 'Kalendarz sezonu: Czerwiec - październik' })
    expect(strip.children).toHaveLength(12)
  })

  it('nie renderuje niczego dla nieparsowalnego formatu sezonu', () => {
    const { container } = render(<SeasonCalendarStrip season="cały rok" />)
    expect(container).toBeEmptyDOMElement()
  })

  it('oznacza bieżący miesiąc pierścieniem, niezależnie od tego czy jest w sezonie', () => {
    render(<SeasonCalendarStrip season="Czerwiec - październik" currentMonth={0} />)
    const strip = screen.getByRole('img')
    const january = strip.children[0]
    expect(january.className).toContain('ring-2')
  })
})
