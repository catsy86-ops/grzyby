import { useMemo, useState } from 'react'
import { useAutoAnimate } from '@formkit/auto-animate/react'
import { motion } from 'motion/react'
import { LeafIcon, ChefHatIcon, ChevronDownIcon, ScaleIcon } from 'lucide-react'
import { EmptySearchIllustration } from '../../components/icons/illustrations'
import speciesData from '../../data/species.json'
import type { EdibilityStatus, Species } from '../../db/schema'
import { EdibilityBadge, edibilityCardAccentClass } from '../../components/EdibilityBadge'
import { LookalikesWarning } from '../../components/LookalikesWarning'
import { Alert, AlertTitle, AlertDescription } from '../../components/ui/alert'
import { Badge } from '../../components/ui/badge'
import { Card, CardContent } from '../../components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../../components/ui/collapsible'
import { Input } from '../../components/ui/input'
import { Toggle } from '../../components/ui/toggle'
import { ToggleGroup, ToggleGroupItem } from '../../components/ui/toggle-group'
import { getSeasonDotClass, isInSeason } from '../../utils/seasonFilter'
import { SHAPE_GROUP_LABEL, getSpeciesShapeGroup } from '../../utils/speciesShape'
import { SpeciesShapeIcon } from '../../components/icons/speciesShapeIcons'

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
  const [listRef] = useAutoAnimate()

  const species = speciesData as Species[]

  const filtered = useMemo(() => {
    return species.filter((s) => {
      const matchesFilter = filter === 'wszystkie' || s.edibility === filter
      const matchesQuery =
        query.trim() === '' ||
        s.nameCommon.toLowerCase().includes(query.toLowerCase()) ||
        s.nameLatin.toLowerCase().includes(query.toLowerCase())
      const matchesSeason = !seasonOnly || isInSeason(s.season)
      return matchesFilter && matchesQuery && matchesSeason
    })
  }, [species, query, filter, seasonOnly])

  return (
    <div className="mx-auto flex h-full max-w-2xl flex-col gap-4 overflow-y-auto p-4">
      <h1 className="text-xl font-semibold">Baza wiedzy o gatunkach</h1>

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
      </div>

      <ToggleGroup
        variant="outline"
        value={[filter]}
        onValueChange={(values) => {
          const [v] = values
          if (v != null) setFilter(v as EdibilityStatus | 'wszystkie')
        }}
        className="w-full flex-wrap"
      >
        {FILTERS.map((f) => (
          <ToggleGroupItem key={f.value} value={f.value} className="rounded-full">
            {f.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      <div ref={listRef} className="flex flex-col gap-3">
        {filtered.map((s) => (
          // Karta jest bezpośrednim dzieckiem kontenera z `useAutoAnimate` (filtrowanie/wyszukiwanie
          // animuje pozycję/usunięcie) - mikrointerakcja `whileTap` idzie na wewnętrzny `motion.div`,
          // nie na `Card`, żeby nie kolidować z transformacjami auto-animate.
          <Card key={s.id} size="sm" className={`border-l-4 ${edibilityCardAccentClass(s.edibility)}`}>
            <CardContent>
            <motion.div whileTap={{ scale: 0.98 }} transition={{ type: 'spring', stiffness: 400, damping: 25 }}>
              {s.imageUrls[0] && (
                <img
                  src={s.imageUrls[0]}
                  alt={s.nameCommon}
                  loading="lazy"
                  className="mb-3 h-40 w-full rounded-lg object-cover"
                />
              )}
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium">{s.nameCommon}</p>
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
            className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground"
          >
            <EmptySearchIllustration className="size-14 text-muted-foreground" />
            <p className="text-sm">Brak wyników dla podanych kryteriów.</p>
          </motion.div>
        )}
      </div>
    </div>
  )
}
