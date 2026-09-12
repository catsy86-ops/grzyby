import { useState } from 'react'
import { db } from '../../db/db'
import type { Finding, ReactionSeverity } from '../../db/schema'
import { severityLabel } from '../../utils/reactionTracking'

const SEVERITIES: ReactionSeverity[] = ['brak', 'lekka', 'ciężka']

export function ConsumptionTracker({ finding }: { finding: Finding }) {
  const [reactionNotes, setReactionNotes] = useState(finding.reactionNotes ?? '')

  async function markConsumed() {
    if (finding.id == null) return
    await db.findings.update(finding.id, { consumed: true, consumedAt: Date.now() })
  }

  async function unmarkConsumed() {
    if (finding.id == null) return
    await db.findings.update(finding.id, {
      consumed: false,
      consumedAt: null,
      reactionSeverity: null,
      reactionNotes: '',
    })
  }

  async function setSeverity(severity: ReactionSeverity) {
    if (finding.id == null) return
    await db.findings.update(finding.id, { reactionSeverity: severity })
  }

  async function saveNotes() {
    if (finding.id == null) return
    await db.findings.update(finding.id, { reactionNotes })
  }

  if (!finding.consumed) {
    return (
      <button
        onClick={markConsumed}
        className="mt-2 text-xs text-green-800 hover:underline"
      >
        Oznacz jako zjedzone
      </button>
    )
  }

  return (
    <div className="mt-2 rounded border border-gray-200 bg-gray-50 p-2 text-xs">
      <div className="flex items-center justify-between">
        <p className="font-medium text-gray-700">
          Zjedzone {finding.consumedAt ? new Date(finding.consumedAt).toLocaleString('pl-PL') : ''}
        </p>
        <button onClick={unmarkConsumed} className="text-gray-500 hover:underline">
          Cofnij
        </button>
      </div>
      <div className="mt-1 flex gap-1">
        {SEVERITIES.map((severity) => (
          <button
            key={severity}
            onClick={() => setSeverity(severity)}
            className={`rounded-full border px-2 py-0.5 ${
              finding.reactionSeverity === severity
                ? severity === 'ciężka'
                  ? 'border-red-600 bg-red-600 text-white'
                  : 'border-green-800 bg-green-800 text-white'
                : 'border-gray-300 text-gray-600'
            }`}
          >
            {severityLabel(severity)}
          </button>
        ))}
      </div>
      <textarea
        value={reactionNotes}
        onChange={(e) => setReactionNotes(e.target.value)}
        onBlur={saveNotes}
        placeholder="Objawy, godzina wystąpienia..."
        className="mt-1 w-full rounded border border-gray-300 p-1"
        rows={2}
      />
    </div>
  )
}
