import { afterEach, describe, expect, it, vi } from 'vitest'
import { computeMushroomOutlook, fetchMushroomOutlook } from './mushroomWeather'

describe('computeMushroomOutlook', () => {
  it('zwraca "dobry", gdy dużo deszczu i umiarkowana temperatura', () => {
    const outlook = computeMushroomOutlook(20, 15)
    expect(outlook.score).toBe('dobry')
    expect(outlook.label).toBe('Dobry czas na grzyby')
  })

  it('zwraca "sredni", gdy trochę deszczu (ale nie dużo) i dobra temperatura', () => {
    const outlook = computeMushroomOutlook(7, 15)
    expect(outlook.score).toBe('sredni')
  })

  it('zwraca "slaby", gdy za sucho mimo dobrej temperatury', () => {
    const outlook = computeMushroomOutlook(1, 15)
    expect(outlook.score).toBe('slaby')
  })

  it('zwraca "slaby", gdy dużo deszczu, ale za zimno', () => {
    const outlook = computeMushroomOutlook(20, 2)
    expect(outlook.score).toBe('slaby')
  })

  it('zwraca "slaby", gdy dużo deszczu, ale za gorąco', () => {
    const outlook = computeMushroomOutlook(20, 28)
    expect(outlook.score).toBe('slaby')
  })

  it('graniczne wartości progów należą do "dobry"/"sredni"', () => {
    expect(computeMushroomOutlook(15, 8).score).toBe('dobry')
    expect(computeMushroomOutlook(15, 22).score).toBe('dobry')
    expect(computeMushroomOutlook(5, 10).score).toBe('sredni')
  })

  it('zwraca przekazane wartości rainMm/tempC bez zmian', () => {
    const outlook = computeMushroomOutlook(12.5, 14.2)
    expect(outlook.recentRainMm).toBe(12.5)
    expect(outlook.avgTempC).toBe(14.2)
  })
})

describe('fetchMushroomOutlook', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('sumuje opady i uśrednia temperaturę z odpowiedzi Open-Meteo', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          daily: {
            precipitation_sum: [0, 5, 10, null],
            temperature_2m_mean: [10, 12, 14],
          },
        }),
      })
    )

    const outlook = await fetchMushroomOutlook(52.23, 21.01)
    expect(outlook.recentRainMm).toBe(15)
    expect(outlook.avgTempC).toBe(12)
    expect(outlook.score).toBe('dobry')
  })

  it('rzuca błąd, gdy odpowiedź nie jest ok', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))
    await expect(fetchMushroomOutlook(52.23, 21.01)).rejects.toThrow()
  })

  it('rzuca błąd, gdy brak danych pogodowych w odpowiedzi', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ daily: { precipitation_sum: [], temperature_2m_mean: [] } }),
      })
    )
    await expect(fetchMushroomOutlook(52.23, 21.01)).rejects.toThrow()
  })
})
