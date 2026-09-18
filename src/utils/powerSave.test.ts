import { describe, expect, it } from 'vitest'
import { isPowerSaveActive } from './powerSave'

describe('isPowerSaveActive', () => {
  it('zwraca true zawsze dla trybu "always", niezależnie od baterii', () => {
    expect(isPowerSaveActive('always', null)).toBe(true)
    expect(isPowerSaveActive('always', { level: 1, charging: true })).toBe(true)
  })

  it('zwraca false zawsze dla trybu "never", niezależnie od baterii', () => {
    expect(isPowerSaveActive('never', { level: 0.05, charging: false })).toBe(false)
  })

  it('"auto" bez wsparcia Battery Status API (battery=null) nigdy się nie włącza', () => {
    expect(isPowerSaveActive('auto', null)).toBe(false)
  })

  it('"auto" włącza się poniżej progu, gdy telefon nie jest ładowany', () => {
    expect(isPowerSaveActive('auto', { level: 0.15, charging: false })).toBe(true)
  })

  it('"auto" nie włącza się poniżej progu, gdy telefon jest ładowany', () => {
    expect(isPowerSaveActive('auto', { level: 0.1, charging: true })).toBe(false)
  })

  it('"auto" nie włącza się powyżej progu', () => {
    expect(isPowerSaveActive('auto', { level: 0.5, charging: false })).toBe(false)
  })
})
