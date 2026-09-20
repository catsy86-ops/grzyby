// Jednorazowy odczyt "czy teraz pada" przy zakończeniu wyprawy - napędza odznakę "Grzybobranie w
// deszczu". Osobny, prostszy fetch niż `stormRisk.ts` (tam interesuje nas prognoza burzy/wiatru na
// dziś, tu tylko bieżący kod pogodowy w chwili zakończenia).

// Kody WMO oznaczające opad deszczu (mżawka, deszcz, przelotny deszcz) - bez śniegu/gradu.
const RAIN_CODES = new Set([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82])

export function isRainCode(weatherCode: number): boolean {
  return RAIN_CODES.has(weatherCode)
}

const OPEN_METEO_URL = 'https://api.open-meteo.com/v1/forecast'

interface OpenMeteoCurrentResponse {
  current?: { weather_code?: number }
}

export async function fetchIsCurrentlyRaining(latitude: number, longitude: number): Promise<boolean> {
  const url = `${OPEN_METEO_URL}?latitude=${latitude}&longitude=${longitude}&current=weather_code`
  const response = await fetch(url)
  if (!response.ok) throw new Error('Nie udało się pobrać bieżącej pogody')

  const data = (await response.json()) as OpenMeteoCurrentResponse
  const weatherCode = data.current?.weather_code
  if (weatherCode == null) throw new Error('Niepełne dane pogodowe')

  return isRainCode(weatherCode)
}
