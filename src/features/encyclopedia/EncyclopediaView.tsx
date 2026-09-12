import { useMemo, useState } from 'react'
import speciesData from '../../data/species.json'
import type { EdibilityStatus, Species } from '../../db/schema'
import { EdibilityBadge } from '../../components/EdibilityBadge'
import { LookalikesWarning } from '../../components/LookalikesWarning'
import { Card, CardContent } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import { ToggleGroup, ToggleGroupItem } from '../../components/ui/toggle-group'

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

  const species = speciesData as Species[]

  const filtered = useMemo(() => {
    return species.filter((s) => {
      const matchesFilter = filter === 'wszystkie' || s.edibility === filter
      const matchesQuery =
        query.trim() === '' ||
        s.nameCommon.toLowerCase().includes(query.toLowerCase()) ||
        s.nameLatin.toLowerCase().includes(query.toLowerCase())
      return matchesFilter && matchesQuery
    })
  }, [species, query, filter])

  return (
    <div className="mx-auto flex h-full max-w-2xl flex-col gap-4 overflow-y-auto p-4">
      <h1 className="text-xl font-semibold">Baza wiedzy o gatunkach</h1>

      <Input
        type="search"
        placeholder="Szukaj gatunku..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

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

      <div className="flex flex-col gap-3">
        {filtered.map((s) => (
          <Card key={s.id} size="sm">
            <CardContent>
              <div className="flex items-center justify-between">
                <p className="font-medium">{s.nameCommon}</p>
                <EdibilityBadge edibility={s.edibility} />
              </div>
              <p className="text-sm italic text-muted-foreground">{s.nameLatin}</p>
              <p className="mt-2 text-sm text-foreground/80">{s.description}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Siedlisko: {s.habitat} · Sezon: {s.season}
              </p>
              <LookalikesWarning species={s} allSpecies={species} />
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground">Brak wyników dla podanych kryteriów.</p>
        )}
      </div>
    </div>
  )
}
