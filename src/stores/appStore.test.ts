import { afterEach, describe, expect, it } from 'vitest'
import { useAppStore } from './appStore'

describe('useAppStore - returnPoint', () => {
  afterEach(() => {
    useAppStore.setState({ returnPoint: null })
  })

  it('domyślnie nie ma zapisanej pozycji auta', () => {
    expect(useAppStore.getState().returnPoint).toBeNull()
  })

  it('zapisuje i czyści pozycję auta', () => {
    const point = { latitude: 52.1, longitude: 19.5, savedAt: 1000 }
    useAppStore.getState().setReturnPoint(point)

    expect(useAppStore.getState().returnPoint).toEqual(point)

    useAppStore.getState().setReturnPoint(null)

    expect(useAppStore.getState().returnPoint).toBeNull()
  })
})
