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

describe('useAppStore - forestMode', () => {
  afterEach(() => {
    useAppStore.setState({ forestMode: false })
  })

  it('domyślnie wyłączony', () => {
    expect(useAppStore.getState().forestMode).toBe(false)
  })

  it('włącza i wyłącza tryb "W lesie"', () => {
    useAppStore.getState().setForestMode(true)
    expect(useAppStore.getState().forestMode).toBe(true)

    useAppStore.getState().setForestMode(false)
    expect(useAppStore.getState().forestMode).toBe(false)
  })
})

describe('useAppStore - mapLayerId', () => {
  afterEach(() => {
    useAppStore.setState({ mapLayerId: 'street' })
  })

  it('domyślnie warstwa standardowa (street)', () => {
    expect(useAppStore.getState().mapLayerId).toBe('street')
  })

  it('przełącza warstwę mapy', () => {
    useAppStore.getState().setMapLayerId('topo')
    expect(useAppStore.getState().mapLayerId).toBe('topo')
  })
})
