import { describe, expect, it } from 'vitest'
import { isRainCode } from './rainCheck'

describe('isRainCode', () => {
  it('rozpoznaje kody WMO opadu deszczu', () => {
    expect(isRainCode(61)).toBe(true)
    expect(isRainCode(80)).toBe(true)
    expect(isRainCode(51)).toBe(true)
  })

  it('nie kwalifikuje pogody bezdeszczowej ani śniegu', () => {
    expect(isRainCode(0)).toBe(false)
    expect(isRainCode(71)).toBe(false)
    expect(isRainCode(95)).toBe(false)
  })
})
