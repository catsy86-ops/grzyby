import { useState } from 'react'
import { db } from '../../db/db'
import type { Finding, ReactionSeverity, Species } from '../../db/schema'
import speciesData from '../../data/species.json'
import { severityLabel } from '../../utils/reactionTracking'
import { formatDateTime } from '../../utils/formatDate'
import { Button } from '../../components/ui/button'
import { Textarea } from '../../components/ui/textarea'
import { ToggleGroup, ToggleGroupItem } from '../../components/ui/toggle-group'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from '../../components/ui/alert-dialog'

const SEVERITIES: ReactionSeverity[] = ['brak', 'lekka', 'ciężka']

export function ConsumptionTracker({ finding }: { finding: Finding }) {
  const [reactionNotes, setReactionNotes] = useState(finding.reactionNotes ?? '')
  const [confirmOpen, setConfirmOpen] = useState(false)

  const species = finding.speciesId
    ? (speciesData as Species[]).find((s) => s.id === finding.speciesId)
    : undefined

  // Species.lookalikes to id-ki gatunków (patrz src/data/species.json), nie gotowe nazwy -
  // trzeba je zresolvować do nameCommon, żeby przypomnienie było czytelne.
  const lookalikeNames = (species?.lookalikes ?? [])
    .map((id) => (speciesData as Species[]).find((s) => s.id === id)?.nameCommon)
    .filter((name): name is string => Boolean(name))

  async function markConsumed() {
    if (finding.id == null) return
    await db.findings.update(finding.id, { consumed: true, consumedAt: Date.now() })
  }

  // Gatunek ma znane sobowtóry (Species.lookalikes) - przed samym potwierdzeniem pokazujemy
  // przypomnienie, żeby nie oznaczać "zjedzone" w pośpiechu bez sprawdzenia cech odróżniających.
  // Nie dodaje nowej treści merytorycznej o jadalności, tylko reużywa już istniejące dane.
  function requestMarkConsumed() {
    if (species && species.lookalikes.length > 0) {
      setConfirmOpen(true)
    } else {
      void markConsumed()
    }
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
      <>
        <Button variant="link" size="sm" className="mt-2 h-auto p-0 text-xs text-primary" onClick={requestMarkConsumed}>
          Oznacz jako zjedzone
        </Button>
        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogTitle>Sprawdziłeś cechy sobowtórów?</AlertDialogTitle>
            <AlertDialogDescription>
              {species?.nameCommon} ma znane sobowtóry: {lookalikeNames.join(', ')}. Zanim potwierdzisz
              zjedzenie, upewnij się, że sprawdziłeś cechy odróżniające ten okaz od tych gatunków.
            </AlertDialogDescription>
            <AlertDialogFooter>
              <AlertDialogCancel>Anuluj</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  setConfirmOpen(false)
                  void markConsumed()
                }}
              >
                Tak, sprawdziłem, potwierdź
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    )
  }

  return (
    <div className="mt-2 rounded border border-border bg-muted/50 p-2 text-xs">
      <div className="flex items-center justify-between">
        <p className="font-medium text-muted-foreground">
          Zjedzone {finding.consumedAt ? formatDateTime(finding.consumedAt) : ''}
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
                ? 'rounded-full data-pressed:border-destructive data-pressed:bg-destructive data-pressed:text-white'
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
