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
  /** Średnia wilgotność wierzchniej warstwy gleby (0-1cm, Open-Meteo `soil_moisture_0_to_1cm`)
   * z tego samego okresu co `recentRainMm`, w % (0-100). Dokładniejszy, bezpośredni sygnał
   * wilgoci niż sama suma opadów - uwzględnia np. szybkie odparowanie po krótkim, intensywnym
   * deszczu, którego suma opadów sama w sobie by nie pokazała. Pokazywana jako DODATKOWA
   * informacja, celowo NIE wpływa na `score` - istniejąca, przetestowana heurystyka rain+temp
   * zostaje niezmieniona, to tylko dodatkowy kontekst dla użytkownika. `null`, gdy Open-Meteo nie
   * zwróciło danych glebowych dla tej lokalizacji/okresu. */
  soilMoisturePercent: number | null
}

export interface MushroomDayOutlook {
  /** ISO yyyy-mm-dd (Open-Meteo `daily.time`, w lokalnej strefie czasowej lokalizacji). */
  date: string
  score: MushroomOutlook['score']
  label: string
}

const OPEN_METEO_URL = 'https://api.open-meteo.com/v1/forecast'
// Ta sama szerokość okna, jakiej `fetchMushroomOutlook` zawsze używał dla "dziś"
// (`past_days=7&forecast_days=1` dawało 8 wartości: 7 dni wstecz + dziś) - zachowana też w
// `fetchMushroomForecast` (okno przesuwane per dzień), żeby wynik dla "dziś" był identyczny w
// obu funkcjach.
const WINDOW_DAYS = 8

interface OpenMeteoResponse {
  daily?: {
    time?: string[]
    precipitation_sum?: (number | null)[]
    temperature_2m_mean?: (number | null)[]
  }
  hourly?: {
    soil_moisture_0_to_1cm?: (number | null)[]
  }
}

// Uproszczona, ludowa heurystyka: grzyby (zwłaszcza po deszczu) najlepiej wysypują się przy
// umiarkowanym cieple i wystarczającej wilgoci z ostatniego tygodnia - zbyt sucho albo zbyt
// zimno/gorąco obniża szansę.
export function computeMushroomOutlook(
  recentRainMm: number,
  avgTempC: number,
  soilMoisturePercent: number | null = null,
): MushroomOutlook {
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

  return { recentRainMm, avgTempC, score, label, soilMoisturePercent }
}

function averageSoilMoisturePercent(hourlyValues: (number | null)[] | undefined): number | null {
  const values = (hourlyValues ?? []).filter((v): v is number => v != null)
  if (values.length === 0) return null
  // Open-Meteo zwraca m³/m³ (0-1) - *100 dla czytelnej wartości procentowej w UI.
  return (values.reduce((sum, v) => sum + v, 0) / values.length) * 100
}

export async function fetchMushroomOutlook(latitude: number, longitude: number): Promise<MushroomOutlook> {
  const url = `${OPEN_METEO_URL}?latitude=${latitude}&longitude=${longitude}&daily=precipitation_sum,temperature_2m_mean&hourly=soil_moisture_0_to_1cm&past_days=7&forecast_days=1&timezone=auto`
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
  const soilMoisturePercent = averageSoilMoisturePercent(data.hourly?.soil_moisture_0_to_1cm)

  return computeMushroomOutlook(recentRainMm, avgTempC, soilMoisturePercent)
}

// Prognoza na kilka najbliższych dni, nie tylko dziś (ROZBUDOWA-ROADMAP.md Część 2 pkt 2) - dla
// każdego dnia w zakresie [dziś, dziś+forecastDays) liczy tę samą heurystykę co
// `fetchMushroomOutlook`, ale z oknem przesuniętym na ten dzień (7 dni wstecz + ten dzień) zamiast
// zawsze "dziś". Dla przyszłych dni okno miesza już-zaobserwowane dni (past_days) z
// prognozowanymi (forecast_days) - to ten sam kompromis co reszta apki (prognoza Open-Meteo, nie
// nasza własna ekstrapolacja). Wynik dla pierwszego dnia (dziś) jest identyczny z tym, co zwróci
// `fetchMushroomOutlook` dla tej samej lokalizacji.
export async function fetchMushroomForecast(
  latitude: number,
  longitude: number,
  forecastDays = 5,
): Promise<MushroomDayOutlook[]> {
  const url = `${OPEN_METEO_URL}?latitude=${latitude}&longitude=${longitude}&daily=precipitation_sum,temperature_2m_mean&past_days=7&forecast_days=${forecastDays}&timezone=auto`
  const response = await fetch(url)
  if (!response.ok) throw new Error('Nie udało się pobrać danych pogodowych')

  const data = (await response.json()) as OpenMeteoResponse
  const times = data.daily?.time ?? []
  const rain = data.daily?.precipitation_sum ?? []
  const temp = data.daily?.temperature_2m_mean ?? []
  // Indeks 7 to "dziś" (7 dni wstecz z `past_days=7`, indeksy 0-6, potem dziś od indeksu 7).
  if (times.length <= 7) throw new Error('Niepełne dane pogodowe')

  const results: MushroomDayOutlook[] = []
  for (let t = 7; t < times.length; t++) {
    const windowRain = rain.slice(t - (WINDOW_DAYS - 1), t + 1).filter((v): v is number => v != null)
    const windowTemp = temp.slice(t - (WINDOW_DAYS - 1), t + 1).filter((v): v is number => v != null)
    if (windowRain.length === 0 || windowTemp.length === 0) continue
    const sumRain = windowRain.reduce((sum, v) => sum + v, 0)
    const avgTemp = windowTemp.reduce((sum, v) => sum + v, 0) / windowTemp.length
    const { score, label } = computeMushroomOutlook(sumRain, avgTemp)
    results.push({ date: times[t], score, label })
  }
  return results
}
