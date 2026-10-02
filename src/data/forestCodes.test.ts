import { describe, expect, it } from 'vitest'
import { normalizeTreeCode, siteTypeName } from './forestCodes'

describe('forestCodes', () => {
  it('normalizuje kody BDL: spacje, gatunki podrzędne po kropce, polskie znaki', () => {
    expect(normalizeTreeCode('SO       ')).toBe('SO')
    expect(normalizeTreeCode('DB.B')).toBe('DB')
    expect(normalizeTreeCode('ŚW')).toBe('SW')
    expect(normalizeTreeCode('brz')).toBe('BRZ')
  })

  it('zwraca null dla nieznanego kodu', () => {
    expect(normalizeTreeCode('XYZ')).toBeNull()
  })

  it('rozszyfrowuje typ siedliska', () => {
    expect(siteTypeName('BŚW    ')).toBe('bór świeży')
    expect(siteTypeName('LMśw')).toBe('las mieszany świeży')
    expect(siteTypeName('???')).toBeNull()
  })
})
