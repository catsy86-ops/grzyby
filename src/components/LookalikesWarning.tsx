import { Alert, AlertTitle, AlertDescription } from './ui/alert'
import type { Species } from '../db/schema'
import { getLookalikes } from '../utils/lookalikes'

export function LookalikesWarning({ species, allSpecies }: { species: Species; allSpecies: Species[] }) {
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
            <li key={l.species.id}>
              {l.species.nameCommon}
              {l.dangerous && <span className="font-semibold"> ({l.species.edibility})</span>}
            </li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  )
}
