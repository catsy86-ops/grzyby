import { describe, expect, it } from 'vitest'
import { heatmapStyleForCount } from './heatmapStyle'

describe('heatmapStyleForCount', () => {
  it('daje maksymalny rozmiar/przezroczystość dla punktu równego maksimum', () => {
    const style = heatmapStyleForCount(10, 10)
    expect(style.radius).toBe(32)
    expect(style.fillOpacity).toBeCloseTo(0.65)
  })

  it('daje minimalny rozmiar/przezroczystość dla najmniejszego bucketa (count=1)', () => {
    const style = heatmapStyleForCount(1, 10)
    expect(style.radius).toBeGreaterThanOrEqual(12)
    expect(style.radius).toBeLessThan(heatmapStyleForCount(10, 10).radius)
  })

  it('skaluje monotonicznie z liczbą znalezisk w buckecie', () => {
    const low = heatmapStyleForCount(2, 10)
    const mid = heatmapStyleForCount(5, 10)
    const high = heatmapStyleForCount(9, 10)

    expect(low.radius).toBeLessThan(mid.radius)
    expect(mid.radius).toBeLessThan(high.radius)
    expect(low.fillOpacity).toBeLessThan(mid.fillOpacity)
    expect(mid.fillOpacity).toBeLessThan(high.fillOpacity)
  })

  it('nie dzieli przez zero, gdy maxCount=1 (jeden bucket na całej mapie)', () => {
    const style = heatmapStyleForCount(1, 1)
    expect(style.radius).toBe(32)
    expect(style.fillOpacity).toBeCloseTo(0.65)
  })
})
