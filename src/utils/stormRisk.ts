// Ostrzeżenie pogodowe podczas aktywnej wyprawy - inny sygnał niż `mushroomWeather.ts` ("czy
// warto szukać grzybów"), to bezpieczeństwo: burza/silny wiatr w lesie. Ten sam darmowy
// Open-Meteo (bez klucza), tylko inne pola prognozy.

// Kody pogodowe WMO używane przez Open-Meteo dla burzy (z gradem lub bez).
const THUNDERSTORM_CODES = new Set([95, 96, 99])
const HIGH_WIND_KMH = 50

export interface StormForecast {
  weatherCode: number
  windSpeedMaxKmh: number
  isStormRisk: boolean
}

export function computeStormRisk(weatherCode: number, windSpeedMaxKmh: number): boolean {
  return THUNDERSTORM_CODES.has(weatherCode) || windSpeedMaxKmh >= HIGH_WIND_KMH
}

const OPEN_METEO_URL = 'https://api.open-meteo.com/v1/forecast'

interface OpenMeteoStormResponse {
  daily?: {
    weather_code?: (number | null)[]
    wind_speed_10m_max?: (number | null)[]
  }
}

export async function fetchStormForecast(latitude: number, longitude: number): Promise<StormForecast> {
  const url = `${OPEN_METEO_URL}?latitude=${latitude}&longitude=${longitude}&daily=weather_code,wind_speed_10m_max&forecast_days=1&timezone=auto`
  const response = await fetch(url)
  if (!response.ok) throw new Error('Nie udało się pobrać prognozy pogody')

  const data = (await response.json()) as OpenMeteoStormResponse
  const weatherCode = data.daily?.weather_code?.[0]
  const windSpeedMaxKmh = data.daily?.wind_speed_10m_max?.[0]
  if (weatherCode == null || windSpeedMaxKmh == null) {
    throw new Error('Niepełne dane pogodowe')
  }

  return { weatherCode, windSpeedMaxKmh, isStormRisk: computeStormRisk(weatherCode, windSpeedMaxKmh) }
}
