import { useState } from 'react'
import { db } from '../../db/db'
import type { Finding, ReactionSeverity } from '../../db/schema'
import { severityLabel } from '../../utils/reactionTracking'
import { Button } from '../../components/ui/button'
import { Textarea } from '../../components/ui/textarea'
import { ToggleGroup, ToggleGroupItem } from '../../components/ui/toggle-group'

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
      <Button variant="link" size="sm" className="mt-2 h-auto p-0 text-xs text-primary" onClick={markConsumed}>
        Oznacz jako zjedzone
      </Button>
    )
  }

  return (
    <div className="mt-2 rounded border border-border bg-muted/50 p-2 text-xs">
      <div className="flex items-center justify-between">
        <p className="font-medium text-muted-foreground">
          Zjedzone {finding.consumedAt ? new Date(finding.consumedAt).toLocaleString('pl-PL') : ''}
        </p>
        <Button variant="link" size="sm" className="h-auto p-0 text-muted-foreground" onClick={unmarkConsumed}>
          Cofnij
        </Button>
      </div>
      <ToggleGroup
        variant="outline"
        value={finding.reactionSeverity ? [finding.reactionSeverity] : []}
        onValueChange={(values) => {
          const [v] = values
          if (v != null) setSeverity(v as ReactionSeverity)
        }}
        className="mt-1"
      >
        {SEVERITIES.map((severity) => (
          <ToggleGroupItem
            key={severity}
            value={severity}
            className={
              severity === 'ciężka'
                ? 'rounded-full data-pressed:border-red-600 data-pressed:bg-red-600 data-pressed:text-white'
                : 'rounded-full'
            }
          >
            {severityLabel(severity)}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <Textarea
        value={reactionNotes}
        onChange={(e) => setReactionNotes(e.target.value)}
        onBlur={saveNotes}
        placeholder="Objawy, godzina wystąpienia..."
        className="mt-1 min-h-0 text-xs"
        rows={2}
      />
    </div>
  )
}
