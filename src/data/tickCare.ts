// Statyczna treść - ogólne zalecenia dot. usuwania kleszczy i obserwacji po ukąszeniu, zgodne z
// powszechnie znanymi wytycznymi (m.in. GIS/PZH). To ogólny przewodnik, NIE porada medyczna -
// przy niepokojących objawach zawsze skieruj do lekarza.

export interface TickCareStep {
  title: string
  description: string
}

export const TICK_REMOVAL_STEPS: TickCareStep[] = [
  {
    title: 'Usuń kleszcza jak najszybciej',
    description:
      'Im dłużej kleszcz żywi się krwią, tym większe ryzyko przeniesienia patogenów (np. boreliozy). Nie czekaj, nie próbuj go "wykręcić" olejem, benzyną ani smarowaniem - to tylko zwiększa ryzyko, bo podrażniony kleszcz może wypluć więcej śliny do rany.',
  },
  {
    title: 'Chwyć jak najbliżej skóry',
    description:
      'Użyj pęsety o cienkich końcówkach lub specjalnego lasso/haczyka na kleszcze - chwyć kleszcza jak najbliżej powierzchni skóry, bez ściskania jego odwłoka (zwiększa ryzyko wstrzyknięcia treści jelitowej kleszcza).',
  },
  {
    title: 'Wyciągnij pewnym, prostym ruchem',
    description:
      'Pociągnij prosto do góry, stałą siłą, bez szarpania i skręcania. Jeśli część kleszcza (np. głowa) zostanie w skórze, usuń ją jak przy drzazdze - nie panikuj, sama się zwykle wygoi.',
  },
  {
    title: 'Zdezynfekuj miejsce ukąszenia',
    description: 'Umyj ręce i miejsce ukąszenia wodą z mydłem, następnie zdezynfekuj (np. spirytusem, jodyną).',
  },
  {
    title: 'Zanotuj datę i obserwuj miejsce ukąszenia',
    description:
      'Przez najbliższe tygodnie obserwuj miejsce ukąszenia pod kątem rumienia wędrującego (czerwona plama powiększająca się, charakterystyczna dla boreliozy) oraz ogólnego samopoczucia (gorączka, bóle stawów/mięśni).',
  },
]

export const TICK_CARE_DISCLAIMER =
  'Ten przewodnik to ogólne informacje, nie porada medyczna. Przy gorączce, rumieniu wędrującym lub innych niepokojących objawach po ukąszeniu skontaktuj się z lekarzem.'
