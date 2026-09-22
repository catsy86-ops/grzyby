import { describe, expect, it } from 'vitest'
import { shouldResetSelectionOnClose } from './speciesComparePicker'

describe('shouldResetSelectionOnClose', () => {
  it('resetuje przy zamknięciu bez dokończenia wyboru', () => {
    expect(shouldResetSelectionOnClose(false, false)).toBe(true)
  })

  it('nie resetuje przy zamknięciu PO wybraniu obu gatunków (przejście do porównywarki)', () => {
    expect(shouldResetSelectionOnClose(false, true)).toBe(false)
  })

  it('nie resetuje przy otwarciu, niezależnie od stanu wyboru', () => {
    expect(shouldResetSelectionOnClose(true, false)).toBe(false)
    expect(shouldResetSelectionOnClose(true, true)).toBe(false)
  })
})
