import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { TreePineIcon } from 'lucide-react'
import { toast } from 'sonner'
import { db } from '../../db/db'
import { useAppStore } from '../../stores/appStore'
import { backfillForestStands, needsForestStand } from '../../utils/findingForestStand'
import { pluralPl } from '../../utils/pluralPl'
import { Button } from '../../components/ui/button'
import { Card, CardContent } from '../../components/ui/card'

// Jednorazowe dopisanie drzewostanu do znalezisk sprzed tej funkcji (albo zapisanych offline).
// Widoczne tylko przy włączonej nakładce Drzewostany - ten sam warunek zgody na wysyłanie
// współrzędnych do BDL co przy nowych znaleziskach (utils/findingForestStand.ts).
export function ForestStandBackfill() {
  const forestOverlayOn = useAppStore((s) => s.mapOverlayIds.includes('forest'))
  const pendingCount = useLiveQuery(() => db.findings.filter(needsForestStand).count(), [])
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => () => abortRef.current?.abort(), [])

  if (!forestOverlayOn || (!progress && !pendingCount)) return null

  async function handleStart() {
    const controller = new AbortController()
    abortRef.current = controller
    setProgress({ done: 0, total: pendingCount ?? 0 })
    const findings = await db.findings.filter(needsForestStand).toArray()
    const result = await backfillForestStands(findings, (done, total) => setProgress({ done, total }), controller.signal)
    if (controller.signal.aborted) return
    setProgress(null)
    if (result.failed > 0) {
      toast.error(`Nie udało się sprawdzić: ${findingsLabel(result.failed)}. Spróbuj ponownie później.`)
    } else {
      toast.success(`Sprawdzono drzewostan: ${findingsLabel(result.checked)}.`)
    }
  }

  function handleCancel() {
    abortRef.current?.abort()
    setProgress(null)
  }

  return (
    <Card size="sm">
      <CardContent className="flex items-center gap-3">
        <TreePineIcon className="size-5 shrink-0 text-primary" aria-hidden />
        <p className="flex-1 text-sm" aria-live="polite">
          {progress
            ? `Sprawdzam drzewostan… ${progress.done}/${progress.total}`
            : `${findingsLabel(pendingCount ?? 0)} z lokalizacją bez danych o drzewostanie.`}
        </p>
        {progress ? (
          <Button size="sm" variant="outline" onClick={handleCancel}>
            Przerwij
          </Button>
        ) : (
          <Button size="sm" onClick={handleStart}>
            Uzupełnij
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

function findingsLabel(count: number) {
  return `${count} ${pluralPl(count, 'znalezisko', 'znaleziska', 'znalezisk')}`
}
