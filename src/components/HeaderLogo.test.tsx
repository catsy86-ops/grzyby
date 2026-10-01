import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { HeaderLogo } from './HeaderLogo'

describe('HeaderLogo', () => {
  afterEach(() => cleanup())

  it('renderuje logo "Grzyby po piwku" z dostępną nazwą', () => {
    render(<HeaderLogo />)
    const img = screen.getByRole('img', { name: 'Grzyby po piwku' })
    expect(img.getAttribute('src')).toMatch(/logo-naglowek\.webp$/)
  })
})
