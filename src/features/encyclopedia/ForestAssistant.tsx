import { useState } from 'react'
import { ArrowLeftIcon, CloudRainIcon, CompassIcon, MapPinIcon, SearchIcon } from 'lucide-react'
import speciesData from '../../data/species.json'
import type { Species } from '../../db/schema'
import { useAppStore } from '../../stores/appStore'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import { getCurrentPosition } from '../../utils/geolocation'
import { fetchMushroomForecast, fetchMushroomOutlook, type MushroomDayOutlook, type MushroomOutlook } from '../../utils/mushroomWeather'
import { getSpeciesSpotHistory, type SpeciesSpotHistory } from '../../utils/speciesSpotHistory'
import { isInSeason } from '../../utils/seasonFilter'
import { formatDate, formatWeekdayShort } from '../../utils/formatDate'
import { EdibilityBadge } from '../../components/EdibilityBadge'
import { LookalikesWarning } from '../../components/LookalikesWarning'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '../../components/ui/drawer'
import { Input } from '../../components/ui/input'

const species = speciesData as Species[]

interface ForestAssistantProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

// "Leśny asystent" (nowe.md, funkcje premium) - użytkownik wybiera gatunek, którego chce
// poszukać, i dostaje jedno miejsce łączące to, co dziś jest rozrzucone po aplikacji: sezon
// gatunku (Baza wiedzy), bieżące warunki pogodowe (ten sam algorytm co useMushroomOutlook, ale
// jednorazowo - to narzędzie "sprawdzam z kanapy przed wyjściem", nie ciągłe śledzenie GPS),
// podobne gatunki (LookalikesWarning) i własną historię - w których zapisanych grzybowiskach ten
// gatunek już się znalazł (getSpeciesSpotHistory). Celowo NIE zgaduje "istotnych drzew" - to pole
// nie istnieje w danych o gatunkach (Species) i wymagałoby nowej treści redakcyjnej, nie kodu.
export function ForestAssistant({ open, onOpenChange }: ForestAssistantProps) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Species | null>(null)
  const [outlook, setOutlook] = useState<MushroomOutlook | null>(null)
  const [outlookStatus, setOutlookStatus] = useState<'idle' | 'loading' | 'ready' | 'unavailable'>('idle')
  // Prognoza na kilka najbliższych dni - osobny, niekrytyczny fetch (patrz komentarz przy
  // `void fetchMushroomForecast` niżej): błąd/offline nie blokuje reszty asystenta, sekcja
  // po prostu się nie pokazuje.
  const [forecast, setForecast] = useState<MushroomDayOutlook[] | null>(null)
  const [spotHistory, setSpotHistory] = useState<SpeciesSpotHistory[] | null>(null)
  const setNavigationTargetSpotId = useAppStore((s) => s.setNavigationTargetSpotId)
  const setActiveTab = useAppStore((s) => s.setActiveTab)
  const isWidePanel = useMediaQuery('(min-width: 1024px)')

  const matches =
    query.trim() === ''
      ? []
      : species.filter(
          (s) =>
            s.nameCommon.toLowerCase().includes(query.toLowerCase()) ||
            s.nameLatin.toLowerCase().includes(query.toLowerCase()),
        )

  async function selectSpecies(s: Species) {
    setSelected(s)
    setQuery('')
    setOutlookStatus('loading')
    setOutlook(null)
    setForecast(null)
    setSpotHistory(null)

    void getSpeciesSpotHistory(s.id).then(setSpotHistory)

    try {
      const coords = await getCurrentPosition()
      const result = await fetchMushroomOutlook(coords.latitude, coords.longitude)
      setOutlook(result)
      setOutlookStatus('ready')
      // Osobny, niekrytyczny fetch - GPS już mamy z linii wyżej, więc to tylko druga zapytanie do
      // Open-Meteo. Błąd tutaj nie cofa `outlookStatus` do 'unavailable' (dzisiejsza pogoda już
      // się pokazała) - pasek "kilka najbliższych dni" po prostu się nie pojawi.
      void fetchMushroomForecast(coords.latitude, coords.longitude).then(setForecast).catch(() => {})
    } catch {
      // Brak GPS/offline/API padło - sekcja pogodowa po prostu się nie pokazuje, jak w
      // useMushroomOutlook.ts. Sezon i historia własna nie zależą od pogody, więc reszta
      // asystenta działa normalnie.
      setOutlookStatus('unavailable')
    }
  }

  function reset() {
    setSelected(null)
    setQuery('')
    setOutlook(null)
    setOutlookStatus('idle')
    setForecast(null)
    setSpotHistory(null)
  }

  const inSeason = selected ? isInSeason(selected.season) : false
  const goodWeather = outlook?.score === 'dobry'

  return (
    <Drawer
      open={open}
      showSwipeHandle={!isWidePanel}
      swipeDirection={isWidePanel ? 'right' : 'down'}
      onOpenChange={(next) => {
        onOpenChange(next)
        if (!next) reset()
      }}
    >
      <DrawerContent className={isWidePanel ? undefined : 'mx-auto max-w-md'}>
        <DrawerHeader>
          <DrawerTitle>Leśny asystent</DrawerTitle>
          <DrawerDescription>
            {selected
              ? 'Orientacyjne wskazówki - nie zastępują wiedzy terenowej i ostrożności.'
              : 'Wybierz gatunek, którego chcesz poszukać.'}
          </DrawerDescription>
        </DrawerHeader>

        <div className="flex flex-col gap-3 px-4 pb-4">
          {!selected ? (
            <>
              <div className="relative">
                <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="np. Borowik szlachetny..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="pl-8"
                  autoFocus
                />
              </div>
              <div className="flex flex-col gap-1">
                {matches.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => selectSpecies(s)}
                    className="flex items-center justify-between gap-2 rounded-lg p-2 text-left outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/50"
                  >
                    <span>
                      <span className="font-[550]">{s.nameCommon}</span>{' '}
                      <span className="text-sm italic text-muted-foreground">{s.nameLatin}</span>
                    </span>
                    <EdibilityBadge edibility={s.edibility} />
                  </button>
                ))}
                {query.trim() !== '' && matches.length === 0 && (
                  <p className="py-4 text-center text-sm text-muted-foreground">Brak gatunku o tej nazwie.</p>
                )}
              </div>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={reset}
                className="flex items-center gap-1 self-start text-xs font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                <ArrowLeftIcon className="size-3.5" />
                Inny gatunek
              </button>

              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="font-[550]">{selected.nameCommon}</p>
                  <p className="text-sm italic text-muted-foreground">{selected.nameLatin}</p>
                </div>
                <EdibilityBadge edibility={selected.edibility} />
              </div>

              <div className="flex flex-wrap gap-2">
                <Badge variant={inSeason ? 'secondary' : 'outline'} className="gap-1.5">
                  <CompassIcon className="size-3.5" />
                  {inSeason ? 'W sezonie teraz' : `Sezon: ${selected.season}`}
                </Badge>
                {outlookStatus === 'loading' && (
                  <Badge variant="outline" className="gap-1.5">
                    <CloudRainIcon className="size-3.5" />
                    Sprawdzanie pogody...
                  </Badge>
                )}
                {outlookStatus === 'ready' && outlook && (
                  <Badge variant={goodWeather ? 'secondary' : 'outline'} className="gap-1.5">
                    <CloudRainIcon className="size-3.5" />
                    {outlook.label}
                  </Badge>
                )}
              </div>

              {outlookStatus === 'ready' && (
                <p className="text-sm text-foreground/80">
                  {inSeason && goodWeather
                    ? '🍄 Dobry moment - jest sezon i warunki pogodowe sprzyjają.'
                    : inSeason
                      ? 'Jest sezon, ale warunki pogodowe ostatnio nie są sprzyjające.'
                      : 'Poza typowym sezonem tego gatunku - szanse mniejsze niezależnie od pogody.'}
                </p>
              )}

              {outlookStatus === 'ready' && outlook?.soilMoisturePercent != null && (
                <p className="text-xs text-muted-foreground">
                  Wilgotność wierzchniej warstwy gleby: ~{Math.round(outlook.soilMoisturePercent)}%
                </p>
              )}

              {/* Prognoza na kilka najbliższych dni - dokłada wymiar "czy warto wybrać się za
                  kilka dni", nie tylko "czy warto dziś" (samo `outlook` wyżej). Niekrytyczna -
                  brak (np. offline po udanym pierwszym zapytaniu, albo drugi fetch akurat padł)
                  po prostu nie pokazuje tej sekcji, reszta asystenta działa normalnie. */}
              {forecast && forecast.length > 1 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Najbliższe dni</p>
                  <div className="mt-1 flex gap-1">
                    {forecast.map((day) => (
                      <div
                        key={day.date}
                        title={day.label}
                        className={`flex flex-1 flex-col items-center gap-1 rounded-md py-1.5 text-[10px] font-medium text-white ${
                          day.score === 'dobry' ? 'bg-green-500' : day.score === 'sredni' ? 'bg-yellow-500' : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        <span className="capitalize">{formatWeekdayShort(day.date)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <p className="text-xs font-medium text-muted-foreground">Siedlisko</p>
                <p className="text-sm text-foreground/80">{selected.habitat}</p>
              </div>

              <LookalikesWarning species={selected} allSpecies={species} />

              <div>
                <p className="text-xs font-medium text-muted-foreground">Twoje sprawdzone miejsca</p>
                {spotHistory == null && <p className="mt-1 text-sm text-muted-foreground">Sprawdzanie...</p>}
                {spotHistory?.length === 0 && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    Jeszcze nigdy nie znaleziono tego gatunku w żadnym zapisanym grzybowisku.
                  </p>
                )}
                {spotHistory && spotHistory.length > 0 && (
                  <div className="mt-1 flex flex-col gap-1">
                    {spotHistory.map((h) => (
                      <div
                        key={h.spotId}
                        className="flex items-center justify-between gap-2 rounded-lg border border-border p-2"
                      >
                        <div className="text-sm">
                          <p className="font-medium">{h.spotName}</p>
                          <p className="text-xs text-muted-foreground">
                            {h.count} {h.count === 1 ? 'raz' : 'razy'} · ostatnio {formatDate(h.lastFoundAt)}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setNavigationTargetSpotId(h.spotId)
                            setActiveTab('mapa')
                            onOpenChange(false)
                          }}
                        >
                          <MapPinIcon />
                          Nawiguj
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  )
}
