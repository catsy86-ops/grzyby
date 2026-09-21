import { afterEach, describe, expect, it, vi } from 'vitest'
import { computeMushroomOutlook, fetchMushroomForecast, fetchMushroomOutlook } from './mushroomWeather'

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

  it('soilMoisturePercent domyślnie null, gdy nie podano - nie wpływa na score', () => {
    const outlook = computeMushroomOutlook(1, 15)
    expect(outlook.soilMoisturePercent).toBeNull()
    expect(outlook.score).toBe('slaby')
  })

  it('przekazana wilgotność gleby trafia do wyniku bez wpływu na score', () => {
    const dry = computeMushroomOutlook(1, 15, 5)
    const wet = computeMushroomOutlook(1, 15, 40)
    expect(dry.soilMoisturePercent).toBe(5)
    expect(wet.soilMoisturePercent).toBe(40)
    expect(dry.score).toBe(wet.score)
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

  it('uśrednia wilgotność gleby z danych godzinowych, w procentach', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          daily: { precipitation_sum: [5], temperature_2m_mean: [12] },
          hourly: { soil_moisture_0_to_1cm: [0.2, 0.3, null] },
        }),
      })
    )
    const outlook = await fetchMushroomOutlook(52.23, 21.01)
    expect(outlook.soilMoisturePercent).toBeCloseTo(25)
  })

  it('soilMoisturePercent null, gdy brak danych godzinowych w odpowiedzi', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ daily: { precipitation_sum: [5], temperature_2m_mean: [12] } }),
      })
    )
    const outlook = await fetchMushroomOutlook(52.23, 21.01)
    expect(outlook.soilMoisturePercent).toBeNull()
  })
})

describe('fetchMushroomForecast', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('zwraca jeden wpis prognozy per dzień, z rosnącymi datami', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          daily: {
            time: ['2026-01-01', '2026-01-02', '2026-01-03', '2026-01-04', '2026-01-05', '2026-01-06', '2026-01-07', '2026-01-08', '2026-01-09'],
            precipitation_sum: [1, 1, 1, 1, 1, 1, 1, 1, 1],
            temperature_2m_mean: [15, 15, 15, 15, 15, 15, 15, 15, 15],
          },
        }),
      })
    )

    const forecast = await fetchMushroomForecast(52.23, 21.01, 2)
    expect(forecast).toHaveLength(2)
    expect(forecast[0].date).toBe('2026-01-08')
    expect(forecast[1].date).toBe('2026-01-09')
  })

  it('wynik dla pierwszego dnia (dziś) jest identyczny jak fetchMushroomOutlook', async () => {
    const dailyPayload = {
      time: ['2026-01-01', '2026-01-02', '2026-01-03', '2026-01-04', '2026-01-05', '2026-01-06', '2026-01-07', '2026-01-08'],
      precipitation_sum: [0, 5, 10, 0, 0, 0, 0, 0],
      temperature_2m_mean: [10, 12, 14, 12, 12, 12, 12, 12],
    }
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ daily: dailyPayload }) }),
    )
    const outlook = await fetchMushroomOutlook(52.23, 21.01)

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ daily: dailyPayload }) }),
    )
    const forecast = await fetchMushroomForecast(52.23, 21.01, 1)

    expect(forecast[0].score).toBe(outlook.score)
    expect(forecast[0].label).toBe(outlook.label)
  })

  it('rzuca błąd, gdy odpowiedź nie jest ok', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))
    await expect(fetchMushroomForecast(52.23, 21.01)).rejects.toThrow()
  })

  it('rzuca błąd, gdy brakuje wystarczającej liczby dni w odpowiedzi', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ daily: { time: ['2026-01-01'], precipitation_sum: [1], temperature_2m_mean: [10] } }),
      })
    )
    await expect(fetchMushroomForecast(52.23, 21.01)).rejects.toThrow()
  })
})
