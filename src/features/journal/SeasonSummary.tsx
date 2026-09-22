import { useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/db'
import { StatTile, StatTileRow } from './StatTiles'
import { Card, CardContent } from '../../components/ui/card'
import {
  computeRainyTripInsight,
  countSpeciesDiversity,
  formatWeight,
  groupFindingsByYear,
  sumWeightGrams,
  yearOverYearDelta,
} from '../../utils/tripStats'

function DeltaLabel({ delta, unit }: { delta: number | null; unit: string }) {
  if (delta == null) return null
  if (delta === 0) return <span className="text-muted-foreground"> · bez zmian {unit}</span>
  const sign = delta > 0 ? '+' : ''
  return (
    <span className={delta > 0 ? 'text-primary' : 'text-muted-foreground'}>
      {' '}
      · {sign}
      {delta}% {unit}
    </span>
  )
}

// Zbiorcze podsumowanie całego bieżącego sezonu (roku kalendarzowego), niezależne od filtra
// wypraw powyżej - odpowiada na pytanie "jak idzie mi ten rok", którego per-wyprawa StatTile
// (patrz wyżej w JournalView) nie pokazuje. Widoczne tylko, gdy jest co najmniej jedno znalezisko
// z bieżącego roku - pusty sezon i tak pokazuje EmptyBasketIllustration niżej w liście.
export function SeasonSummary() {
  const allFindings = useLiveQuery(() => db.findings.toArray(), [])
  // Osobne od `stats` niżej (który celowo patrzy tylko na bieżący rok) - ten insight jest
  // historyczny, całościowy, żeby w ogóle miał szansę zebrać wystarczająco dużo wypraw w obu
  // grupach (deszczowe/suche, próg w computeRainyTripInsight).
  const allTrips = useLiveQuery(() => db.trips.toArray(), [])
  const rainyInsight = useMemo(
    () => (allTrips && allFindings ? computeRainyTripInsight(allTrips, allFindings) : null),
    [allTrips, allFindings],
  )

  const stats = useMemo(() => {
    if (!allFindings) return null
    const currentYear = new Date().getFullYear()
    const byYear = groupFindingsByYear(allFindings)
    const current = byYear.get(currentYear) ?? []
    if (current.length === 0) return null
    const previous = byYear.get(currentYear - 1) ?? []
    return {
      year: currentYear,
      count: current.length,
      species: countSpeciesDiversity(current),
      weight: sumWeightGrams(current),
      countDelta: yearOverYearDelta(current.length, previous.length),
      weightDelta: yearOverYearDelta(sumWeightGrams(current), sumWeightGrams(previous)),
    }
  }, [allFindings])

  if (!stats) return null

  return (
    <Card size="sm">
      <CardContent className="flex flex-col gap-2">
        <p className="text-sm font-medium">Sezon {stats.year}</p>
        <StatTileRow>
          <StatTile value={stats.count} label="znalezisk" />
          <StatTile value={stats.species} label="gatunków" />
          {stats.weight > 0 && <StatTile value={formatWeight(stats.weight)} label="waga" />}
        </StatTileRow>
        {(stats.countDelta != null || stats.weightDelta != null) && (
          <p className="text-xs text-muted-foreground">
            vs {stats.year - 1}
            <DeltaLabel delta={stats.countDelta} unit="znalezisk" />
            <DeltaLabel delta={stats.weightDelta} unit="wagi" />
          </p>
        )}
        {rainyInsight && (
          <p className="text-xs text-muted-foreground">
            {rainyInsight.avgFindingsRainy > rainyInsight.avgFindingsDry
              ? `🌧️ Podczas deszczowych wypraw znajdujesz średnio ${rainyInsight.avgFindingsRainy.toFixed(1)} znalezisk, w suchych ${rainyInsight.avgFindingsDry.toFixed(1)}.`
              : `☀️ Podczas suchych wypraw znajdujesz średnio ${rainyInsight.avgFindingsDry.toFixed(1)} znalezisk, w deszczowych ${rainyInsight.avgFindingsRainy.toFixed(1)}.`}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
