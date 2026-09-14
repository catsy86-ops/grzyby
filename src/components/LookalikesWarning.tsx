import { useState } from 'react'
import { Alert, AlertTitle, AlertDescription } from './ui/alert'
import { SpeciesComparator } from './SpeciesComparator'
import type { Species } from '../db/schema'
import { getLookalikes } from '../utils/lookalikes'

export function LookalikesWarning({ species, allSpecies }: { species: Species; allSpecies: Species[] }) {
  const [comparingWith, setComparingWith] = useState<Species | null>(null)
  const lookalikes = getLookalikes(species, allSpecies)
  if (lookalikes.length === 0) return null

  const hasDangerous = lookalikes.some((l) => l.dangerous)

  return (
    <Alert variant={hasDangerous ? 'destructive-soft' : 'warning'} className="mt-2 text-xs">
      <AlertTitle>
        {hasDangerous ? '⚠️ Uwaga: możliwość pomylenia z gatunkiem trującym!' : 'Uwaga na podobne gatunki'}
      </AlertTitle>
      <AlertDescription className="text-current">
        <ul className="list-inside list-disc">
          {lookalikes.map((l) => (
            <li key={l.species.id} className="flex items-center gap-1.5">
              <span>
                {l.species.nameCommon}
                {l.dangerous && <span className="font-semibold"> ({l.species.edibility})</span>}
              </span>
              <button
                type="button"
                onClick={() => setComparingWith(l.species)}
                className="rounded text-[11px] font-medium underline outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                Porównaj
              </button>
            </li>
          ))}
        </ul>
      </AlertDescription>

      {comparingWith && (
        <SpeciesComparator
          speciesA={species}
          speciesB={comparingWith}
          open
          onOpenChange={(open) => {
            if (!open) setComparingWith(null)
          }}
        />
      )}
    </Alert>
  )
}
