// "Kiedy na grzyby" - darmowe, publiczne API pogodowe (Open-Meteo, bez klucza, hojny darmowy
// limit) wywoływane bezpośrednio z przeglądarki tylko gdy online. Wynik jest cache'owany
// (patrz hooks/useMushroomOutlook.ts) do wglądu offline. Sam "algorytm wysypu" to nasza własna,
// uproszczona heurystyka na tych danych - nie naukowa prognoza, raczej ludowa zasada "deszcz +
// ciepło = grzyby za ok. tydzień", jasno opisana jako orientacyjna w UI.

export interface MushroomOutlook {
  recentRainMm: number
  avgTempC: number
  score: 'dobry' | 'sredni' | 'slaby'
  label: string
}

const OPEN_METEO_URL = 'https://api.open-meteo.com/v1/forecast'

interface OpenMeteoResponse {
  daily?: {
    precipitation_sum?: (number | null)[]
    temperature_2m_mean?: (number | null)[]
  }
}

// Uproszczona, ludowa heurystyka: grzyby (zwłaszcza po deszczu) najlepiej wysypują się przy
// umiarkowanym cieple i wystarczającej wilgoci z ostatniego tygodnia - zbyt sucho albo zbyt
// zimno/gorąco obniża szansę.
export function computeMushroomOutlook(recentRainMm: number, avgTempC: number): MushroomOutlook {
  const goodRain = recentRainMm >= 15
  const someRain = recentRainMm >= 5
  const goodTemp = avgTempC >= 8 && avgTempC <= 22

  let score: MushroomOutlook['score']
  let label: string
  if (goodRain && goodTemp) {
    score = 'dobry'
    label = 'Dobry czas na grzyby'
  } else if ((goodRain || someRain) && goodTemp) {
    score = 'sredni'
    label = 'Umiarkowane warunki'
  } else {
    score = 'slaby'
    label = 'Słabe warunki'
  }

  return { recentRainMm, avgTempC, score, label }
}

export async function fetchMushroomOutlook(latitude: number, longitude: number): Promise<MushroomOutlook> {
  const url = `${OPEN_METEO_URL}?latitude=${latitude}&longitude=${longitude}&daily=precipitation_sum,temperature_2m_mean&past_days=7&forecast_days=1&timezone=auto`
  const response = await fetch(url)
  if (!response.ok) throw new Error('Nie udało się pobrać danych pogodowych')

  const data = (await response.json()) as OpenMeteoResponse
  const rainValues = (data.daily?.precipitation_sum ?? []).filter((v): v is number => v != null)
  const tempValues = (data.daily?.temperature_2m_mean ?? []).filter((v): v is number => v != null)
  if (rainValues.length === 0 || tempValues.length === 0) {
    throw new Error('Niepełne dane pogodowe')
  }

  const recentRainMm = rainValues.reduce((sum, v) => sum + v, 0)
  const avgTempC = tempValues.reduce((sum, v) => sum + v, 0) / tempValues.length

  return computeMushroomOutlook(recentRainMm, avgTempC)
}
