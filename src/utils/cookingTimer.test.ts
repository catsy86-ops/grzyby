import { describe, expect, it } from 'vitest'
import { formatCountdown } from './cookingTimer'

describe('formatCountdown', () => {
  it('formatuje pełne minuty', () => {
    expect(formatCountdown(300)).toBe('05:00')
  })

  it('formatuje minuty i sekundy', () => {
    expect(formatCountdown(125)).toBe('02:05')
  })

  it('zwraca 00:00 dla zera i wartości ujemnych', () => {
    expect(formatCountdown(0)).toBe('00:00')
    expect(formatCountdown(-5)).toBe('00:00')
  })

  it('zaokrągla wartości niecałkowite', () => {
    expect(formatCountdown(59.6)).toBe('01:00')
  })
})
