import { useMemo, useState } from 'react'
import { useAutoAnimate } from '@formkit/auto-animate/react'
import { AnimatePresence, motion } from 'motion/react'
import {
  LeafIcon,
  CalendarClockIcon,
  ChefHatIcon,
  ChevronDownIcon,
  CompassIcon,
  DownloadIcon,
  GitCompareIcon,
  ScaleIcon,
  SwordsIcon,
} from 'lucide-react'
import { EmptySearchIllustration } from '../../components/icons/illustrations'
import speciesData from '../../data/species.json'
import type { EdibilityStatus, Species } from '../../db/schema'
import { EdibilityBadge, edibilityChartColor, speciesCardClassName } from '../../components/EdibilityBadge'
import { LookalikesWarning } from '../../components/LookalikesWarning'
import { SeasonCalendarStrip } from '../../components/SeasonCalendarStrip'
import { Alert, AlertTitle, AlertDescription } from '../../components/ui/alert'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Card, CardContent } from '../../components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../../components/ui/collapsible'
import { Input } from '../../components/ui/input'
import { Toggle } from '../../components/ui/toggle'
import { ToggleGroup, ToggleGroupItem } from '../../components/ui/toggle-group'
import { downloadBlob } from '../../utils/exportImport'
import { exportSpeciesCardToPdf } from '../../utils/pdfExport'
import { daysUntilSeasonStart, getSeasonDotClass, isInSeason } from '../../utils/seasonFilter'
import { HABITAT_TAG_LABELS, matchesHabitatTag, type HabitatTag } from '../../utils/speciesHabitatTags'
import { SHAPE_GROUP_LABEL, getSpeciesShapeGroup } from '../../utils/speciesShape'
import { SpeciesShapeIcon } from '../../components/icons/speciesShapeIcons'
import { ForestAssistant } from './ForestAssistant'
import { LookalikeQuiz } from './LookalikeQuiz'
import { SpeciesComparePicker } from './SpeciesComparePicker'

const FILTERS: { label: string; value: EdibilityStatus | 'wszystkie' }[] = [
  { label: 'Wszystkie', value: 'wszystkie' },
  { label: 'Jadalne', value: 'jadalny' },
  { label: 'Warunkowo jadalne', value: 'warunkowo-jadalny' },
  { label: 'Niejadalne', value: 'niejadalny' },
  { label: 'Trujące', value: 'trujący' },
  { label: 'Śmiertelnie trujące', value: 'śmiertelnie-trujący' },
]

export function EncyclopediaView() {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<EdibilityStatus | 'wszystkie'>('wszystkie')
  const [seasonOnly, setSeasonOnly] = useState(false)
  const [protectedOnly, setProtectedOnly] = useState(false)
  const [habitatFilter, setHabitatFilter] = useState<HabitatTag | null>(null)
  const [assistantOpen, setAssistantOpen] = useState(false)
  const [quizOpen, setQuizOpen] = useState(false)
  const [compareOpen, setCompareOpen] = useState(false)
  const [listRef] = useAutoAnimate()

  const species = speciesData as Species[]

  // "Za X dni zaczyna się sezon na [gatunek]" (ROZBUDOWA-ROADMAP.md Część 2 pkt 5) - jeden,
  // najbliższy nadchodzący sezon spośród wszystkich gatunków, nie lista - to skrót/ciekawostka na
  // start widoku, nie kolejny filtr. Próg 45 dni: dalej niż to i tak nie jest "już blisko", więc
  // nie pokazujemy banera cały rok dla czegoś, co zacznie się za pół roku.
  const upcomingSeason = useMemo(() => {
    let best: { species: Species; days: number } | null = null
    for (const s of species) {
      const days = daysUntilSeasonStart(s.season)
      if (days == null || days > 45) continue
      if (best == null || days < best.days) best = { species: s, days }
    }
    return best
  }, [species])

  const filtered = useMemo(() => {
    return species.filter((s) => {
      const matchesFilter = filter === 'wszystkie' || s.edibility === filter
      const matchesQuery =
        query.trim() === '' ||
        s.nameCommon.toLowerCase().includes(query.toLowerCase()) ||
        s.nameLatin.toLowerCase().includes(query.toLowerCase())
      const matchesSeason = !seasonOnly || isInSeason(s.season)
      const matchesProtected = !protectedOnly || !!s.legalProtection
      const matchesHabitat = matchesHabitatTag(s.habitat, habitatFilter)
      return matchesFilter && matchesQuery && matchesSeason && matchesProtected && matchesHabitat
    })
  }, [species, query, filter, seasonOnly, protectedOnly, habitatFilter])

  // "Karta kieszonkowa" PDF (Część 3 pkt 8 ROZBUDOWA-ROADMAP.md) - jeden gatunek, do wydruku i
  // zabrania w teren bez telefonu. Best-effort (patrz fetchImageAsDataUrl w pdfExport.ts) - błąd
  // pobrania zdjęcia nie blokuje eksportu, karta i tak jest użyteczna bez niego.
  async function handleExportSpeciesCard(s: Species) {
    const blob = await exportSpeciesCardToPdf(s, species)
    downloadBlob(blob, `grzybobranie-${s.id}.pdf`)
  }

  return (
    // max-w rośnie na szerszych ekranach (md/lg) - dotąd apka była wszędzie ograniczona do
    // szerokości telefonu nawet na desktopie, więc treść pływała wąską kolumną w pustej
    // przestrzeni. Lista kart niżej dostaje odpowiadającą siatkę 2/3 kolumn.
    <div className="mx-auto flex h-full max-w-2xl flex-col gap-4 overflow-y-auto p-4 md:max-w-4xl lg:max-w-6xl">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-heading-md font-semibold tracking-tight">Baza wiedzy o gatunkach</h1>
        <div className="flex shrink-0 gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setCompareOpen(true)}>
            <GitCompareIcon className="size-4" />
            Porównaj
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setQuizOpen(true)}>
            <SwordsIcon className="size-4" />
            Quiz
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setAssistantOpen(true)}>
            <CompassIcon className="size-4" />
            Leśny asystent
          </Button>
        </div>
      </div>

      {upcomingSeason && (
        <Alert className="flex items-center justify-between gap-2">
          <AlertDescription className="flex items-center gap-1.5 text-current">
            <CalendarClockIcon className="size-4 shrink-0" />
            Za {upcomingSeason.days} {upcomingSeason.days === 1 ? 'dzień' : 'dni'} zaczyna się sezon na{' '}
            {upcomingSeason.species.nameCommon}.
          </AlertDescription>
          <Button size="sm" variant="outline" onClick={() => setQuery(upcomingSeason.species.nameCommon)}>
            Pokaż
          </Button>
        </Alert>
      )}

      {/* Sticky pasek wyszukiwania/filtrów - przy przewijaniu 19 gatunków w dół wracanie na
          górę tylko po to, żeby zmienić filtr, jest niewygodne na telefonie. Ujemny margines +
          padding odtwarza szerokość kontenera (który ma własny `p-4`), a tło + blur sprawiają,
          że treść listy znika POD paskiem zamiast prześwitywać zza niego przy scrollu. */}
      <div className="sticky top-0 z-10 -mx-4 flex flex-col gap-2 bg-background/95 px-4 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/85">
        <div className="flex gap-2">
          <Input
            type="search"
            placeholder="Szukaj gatunku..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1"
          />
          <Toggle
            variant="outline"
            pressed={seasonOnly}
            onPressedChange={setSeasonOnly}
            aria-label="Pokaż tylko gatunki w sezonie teraz"
            className="shrink-0 gap-1.5"
          >
            <LeafIcon />
            W sezonie
          </Toggle>
          <Toggle
            variant="outline"
            pressed={protectedOnly}
            onPressedChange={setProtectedOnly}
            aria-label="Pokaż tylko gatunki chronione"
            className="shrink-0 gap-1.5"
          >
            <ScaleIcon />
            Chronione
          </Toggle>
        </div>

        {/* Poziomy scroll zamiast flex-wrap (poprawka z audytu UI) - 6 filtrów, część z długimi
            etykietami ("Śmiertelnie trujące"), łamało się na 2-3 linie w sticky pasku na wąskim
            telefonie, zjadając pionową przestrzeń nad listą - ten sam problem co w plakietkach
            stanu na mapie. -mx-4 px-4 bije do krawędzi względem paddingu paska sticky wyżej (ta
            sama technika, co ten pasek stosuje wobec kontenera strony). */}
        <ToggleGroup
          variant="outline"
          value={[filter]}
          onValueChange={(values) => {
            const [v] = values
            if (v != null) setFilter(v as EdibilityStatus | 'wszystkie')
          }}
          className="w-full flex-nowrap overflow-x-auto -mx-4 px-4 pb-1"
        >
          {FILTERS.map((f) => (
            <ToggleGroupItem key={f.value} value={f.value} className="shrink-0 rounded-full">
              {f.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>

        {/* Filtr po siedlisku (Część 3 pkt 7 ROZBUDOWA-ROADMAP.md) - osobny rząd chipów, ta sama
            technika poziomego scrolla co filtr jadalności wyżej. Wielokrotne kliknięcie tego
            samego chipa czyści filtr (wraca do `null`/"wszystkie") - `ToggleGroup` w trybie
            pojedynczego wyboru domyślnie nie pozwala odznaczyć jedynej zaznaczonej wartości, stąd
            ręczna obsługa `onValueChange` zamiast polegania na samym komponencie. */}
        <ToggleGroup
          variant="outline"
          value={habitatFilter ? [habitatFilter] : []}
          onValueChange={(values) => setHabitatFilter((values[0] as HabitatTag | undefined) ?? null)}
          className="w-full flex-nowrap overflow-x-auto -mx-4 px-4 pb-1"
        >
          {(Object.keys(HABITAT_TAG_LABELS) as HabitatTag[]).map((tag) => (
            <ToggleGroupItem key={tag} value={tag} className="shrink-0 rounded-full">
              {HABITAT_TAG_LABELS[tag]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      {/* Liczba wyników reaguje na każdą zmianę filtra/wyszukiwania animowanym "odbiciem" liczby
          (AnimatePresence po kluczu = wartości) - bez tego zmiana filtra byłaby czytelna tylko po
          policzeniu kart w siatce, nie od razu, jednym spojrzeniem. */}
      <p
        aria-label={`Liczba wyników: ${filtered.length}`}
        className="-mt-1 flex items-baseline gap-1 text-xs text-muted-foreground"
      >
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={filtered.length}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6, position: 'absolute' }}
            transition={{ duration: 0.16 }}
            aria-hidden="true"
            className="font-medium tabular-nums text-foreground"
          >
            {filtered.length}
          </motion.span>
        </AnimatePresence>
        <span aria-hidden="true">{filtered.length === 1 ? 'gatunek' : 'gatunków'}</span>
      </p>

      {/* Siatka 2-kolumnowa już na mobile (nie dopiero od md:) - z miniaturkami zdjęć lista 19
          gatunków skanuje się szybciej niż jedna szeroka kolumna, a szczegóły opisowe i tak są
          domyślnie zwinięte (patrz Collapsible niżej), więc węższa karta ich nie ścieśnia. */}
      <div ref={listRef} className="grid grid-cols-2 items-start gap-3 md:grid-cols-3 lg:grid-cols-4">
        {filtered.map((s, index) => (
          // Karta jest bezpośrednim dzieckiem kontenera z `useAutoAnimate` (filtrowanie/wyszukiwanie
          // animuje pozycję/usunięcie) - mikrointerakcja `whileTap` idzie na wewnętrzny `motion.div`,
          // nie na `Card`, żeby nie kolidować z transformacjami auto-animate.
          // hover:shadow (bez transform - Card jest dzieckiem useAutoAnimate powyżej, patrz ten
          // sam komentarz w JournalView.tsx dla tej samej reguły).
          <Card
            key={s.id}
            size="sm"
            style={{ animationDelay: `${Math.min(index, 12) * 40}ms` }}
            className={speciesCardClassName(s.edibility)}
          >
            <CardContent>
            <motion.div whileTap={{ scale: 0.98 }} transition={{ type: 'spring', stiffness: 400, damping: 25 }}>
              {s.imageUrls[0] && (
                <div className="relative mb-3 aspect-square w-full overflow-hidden rounded-lg">
                  <img src={s.imageUrls[0]} alt={s.nameCommon} loading="lazy" className="size-full object-cover" />
                  {/* Winieta u dołu zdjęcia, tonowana kolorem jadalności (ta sama skala co lewy
                      pasek karty) - łączy fotografię z systemem kolorów bezpieczeństwa zamiast
                      być oderwaną dekoracją, i daje zdjęciu głębi zamiast płaskiego object-cover. */}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-0 bottom-0 h-16"
                    style={{
                      background: `linear-gradient(to top, color-mix(in oklab, ${edibilityChartColor(s.edibility)} 30%, transparent), transparent)`,
                    }}
                  />
                </div>
              )}
              {/* flex-wrap - w wąskiej 2-kolumnowej karcie na mobile nazwa gatunku + odznaki
                  (chroniony/jadalność) obok siebie w jednym rzędzie by się ścieśniały; odznaki
                  schodzą do nowej linii zamiast obcinać nazwę. */}
              {/* font-[550] (nie font-medium=500 ani font-semibold=600) - waga pośrednia
                  dostępna dzięki @fontsource-variable/geist, subtelnie cięższa niż zwykły tekst
                  karty, ale odróżnialna od wagi przycisków (font-semibold) w tym samym widoku. */}
              <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                <p className="font-[550]">{s.nameCommon}</p>
                <div className="flex shrink-0 gap-1.5">
                  {s.legalProtection && (
                    <Badge
                      variant="secondary"
                      className="gap-1 border-brand-accent/40 bg-brand-accent/10 text-brand-accent"
                    >
                      <ScaleIcon className="size-3" />
                      Chroniony
                    </Badge>
                  )}
                  <EdibilityBadge edibility={s.edibility} />
                </div>
              </div>
              <p className="flex items-center gap-1.5 text-sm italic text-muted-foreground">
                {s.nameLatin}
                {getSpeciesShapeGroup(s.id) && (
                  <span title={SHAPE_GROUP_LABEL[getSpeciesShapeGroup(s.id)!]} className="not-italic">
                    <SpeciesShapeIcon group={getSpeciesShapeGroup(s.id)!} className="text-muted-foreground/70" />
                  </span>
                )}
              </p>
              {/* Sezon zawsze widoczny (nie dopiero po rozwinięciu "Szczegóły") - to jedna z
                  rzeczy, które grzybiarz chce wiedzieć od razu, skanując listę, nie po otwarciu
                  karty. Kolor kropki to pora roku (uproszczona), tekst to dokładny zakres. */}
              <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className={`size-1.5 shrink-0 rounded-full ${getSeasonDotClass(s.season)}`} aria-hidden="true" />
                {s.season}
                {isInSeason(s.season) && <span className="font-medium text-primary">· w sezonie teraz</span>}
              </p>
              {/* Ostrzeżenie o ochronie prawnej zostaje zawsze widoczne (obok jadalności) - to,
                  razem z LookalikesWarning w widoku Rozpoznaj, jest bezpieczeństwo/legalność, nie
                  ciekawostka do zwinięcia. */}
              {s.legalProtection && (
                <Alert variant="warning" className="mt-2 text-xs">
                  <ScaleIcon />
                  <AlertTitle>Gatunek chroniony prawem</AlertTitle>
                  <AlertDescription className="text-current">{s.legalProtection}</AlertDescription>
                </Alert>
              )}
              {/* Reszta (opis/siedlisko/sobowtóry/przepisy) domknięta domyślnie - progresywne
                  odkrywanie treści, żeby lista 19 gatunków dała się skanować wzrokiem zamiast
                  wymuszać przescrollowanie ściany tekstu na każdej karcie. */}
              <Collapsible defaultOpen={false}>
                <CollapsibleTrigger
                  className="group/details mt-2 flex items-center gap-1 text-xs font-medium text-primary outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  Szczegóły
                  <ChevronDownIcon className="size-3.5 transition-transform group-data-[panel-open]/details:rotate-180" />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <p className="mt-2 text-sm leading-relaxed text-foreground/80">{s.description}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Siedlisko: {s.habitat}</p>
                  <SeasonCalendarStrip season={s.season} />
                  <LookalikesWarning species={s} allSpecies={species} />
                  {s.preparationTips && (
                    // text-sm (nie text-xs) - porady dot. przyrządzania bywają bezpieczeństwem,
                    // nie ciekawostką (np. smardz/piestrzenica: toksyny niszczone dopiero
                    // gotowaniem) - nie warto ich miniaturyzować względem reszty karty.
                    <div
                      data-testid="preparation-tip"
                      className="mt-2 flex items-start gap-1.5 rounded-lg bg-muted/60 p-2 text-sm leading-relaxed text-foreground/80"
                    >
                      <ChefHatIcon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                      <p>{s.preparationTips}</p>
                    </div>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2 gap-1.5"
                    onClick={() => void handleExportSpeciesCard(s)}
                  >
                    <DownloadIcon className="size-3.5" />
                    Karta PDF do druku
                  </Button>
                </CollapsibleContent>
              </Collapsible>
            </motion.div>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="col-span-2 flex flex-col items-center gap-2 py-10 text-center text-muted-foreground md:col-span-3 lg:col-span-4"
          >
            <EmptySearchIllustration className="size-14 text-muted-foreground" />
            <p className="text-sm">Brak wyników dla podanych kryteriów.</p>
          </motion.div>
        )}
      </div>

      <ForestAssistant open={assistantOpen} onOpenChange={setAssistantOpen} />
      <LookalikeQuiz open={quizOpen} onOpenChange={setQuizOpen} />
      <SpeciesComparePicker open={compareOpen} onOpenChange={setCompareOpen} />
    </div>
  )
}
