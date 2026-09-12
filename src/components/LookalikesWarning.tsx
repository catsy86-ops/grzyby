import type { Species } from '../db/schema'
import { getLookalikes } from '../utils/lookalikes'

export function LookalikesWarning({ species, allSpecies }: { species: Species; allSpecies: Species[] }) {
  const lookalikes = getLookalikes(species, allSpecies)
  if (lookalikes.length === 0) return null

  const hasDangerous = lookalikes.some((l) => l.dangerous)

  return (
    <div
      className={`mt-2 rounded border p-2 text-xs ${
        hasDangerous ? 'border-red-300 bg-red-50 text-red-900' : 'border-amber-300 bg-amber-50 text-amber-900'
      }`}
    >
      <p className="font-semibold">
        {hasDangerous ? '⚠️ Uwaga: możliwość pomylenia z gatunkiem trującym!' : 'Uwaga na podobne gatunki'}
      </p>
      <ul className="mt-1 list-inside list-disc">
        {lookalikes.map((l) => (
          <li key={l.species.id}>
            {l.species.nameCommon}
            {l.dangerous && <span className="font-semibold"> ({l.species.edibility})</span>}
          </li>
        ))}
      </ul>
    </div>
  )
}
