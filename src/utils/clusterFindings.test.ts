import { describe, expect, it } from 'vitest'
import { clusterFindings } from './clusterFindings'

// Prosta projekcja identycznościowa (lat -> x, lng -> y) - wystarcza do testowania samej logiki
// kubełkowania w izolacji od Leaflet.
const identityProject = (lat: number, lng: number) => ({ x: lat, y: lng })

describe('clusterFindings', () => {
  it('nie łączy punktów oddalonych od siebie bardziej niż próg', () => {
    const points = [
      { id: 1, lat: 0, lng: 0 },
      { id: 2, lat: 500, lng: 500 },
    ]
    const clusters = clusterFindings(points, identityProject, 40)

    expect(clusters).toHaveLength(2)
    expect(clusters.map((c) => c.points.length)).toEqual([1, 1])
  })

  it('łączy punkty leżące blisko siebie w jeden klaster', () => {
    const points = [
      { id: 1, lat: 10, lng: 10 },
      { id: 2, lat: 12, lng: 11 },
      { id: 3, lat: 15, lng: 14 },
    ]
    const clusters = clusterFindings(points, identityProject, 40)

    expect(clusters).toHaveLength(1)
    expect(clusters[0].points.map((p) => p.id).sort()).toEqual([1, 2, 3])
  })

  it('liczy centroid klastra jako średnią współrzędnych', () => {
    const points = [
      { id: 1, lat: 0, lng: 0 },
      { id: 2, lat: 10, lng: 20 },
    ]
    const clusters = clusterFindings(points, identityProject, 40)

    expect(clusters).toHaveLength(1)
    expect(clusters[0].lat).toBe(5)
    expect(clusters[0].lng).toBe(10)
  })

  it('zwraca pustą listę dla braku punktów', () => {
    expect(clusterFindings([], identityProject, 40)).toEqual([])
  })

  it('zachowuje pojedynczy punkt jako klaster jednoelementowy', () => {
    const points = [{ id: 1, lat: 1, lng: 1 }]
    const clusters = clusterFindings(points, identityProject, 40)

    expect(clusters).toEqual([{ lat: 1, lng: 1, points }])
  })
})
