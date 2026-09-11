import { useMemo, useState } from 'react'
import speciesData from '../../data/species.json'
import type { EdibilityStatus, Species } from '../../db/schema'
import { EdibilityBadge } from '../../components/EdibilityBadge'

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

      <input
        type="search"
        placeholder="Szukaj gatunku..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="rounded border border-gray-300 p-2"
      />

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`rounded-full border px-3 py-1 text-xs font-medium ${
              filter === f.value
                ? 'border-green-800 bg-green-800 text-white'
                : 'border-gray-300 text-gray-700'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        {filtered.map((s) => (
          <div key={s.id} className="rounded border border-gray-200 p-3 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="font-medium">{s.nameCommon}</p>
              <EdibilityBadge edibility={s.edibility} />
            </div>
            <p className="text-sm italic text-gray-500">{s.nameLatin}</p>
            <p className="mt-2 text-sm text-gray-700">{s.description}</p>
            <p className="mt-1 text-xs text-gray-500">
              Siedlisko: {s.habitat} · Sezon: {s.season}
            </p>
            {s.lookalikes.length > 0 && (
              <p className="mt-1 text-xs text-amber-700">
                Uwaga na podobne gatunki:{' '}
                {s.lookalikes
                  .map((id) => species.find((x) => x.id === id)?.nameCommon ?? id)
                  .join(', ')}
              </p>
            )}
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-gray-500">Brak wyników dla podanych kryteriów.</p>
        )}
      </div>
    </div>
  )
}
