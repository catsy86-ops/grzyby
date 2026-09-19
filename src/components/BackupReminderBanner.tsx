import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Alert, AlertDescription } from './ui/alert'
import { Button } from './ui/button'
import { db } from '../db/db'
import { useAppStore } from '../stores/appStore'
import { shouldRemindBackup } from '../utils/backupReminder'

const SNOOZE_KEY = 'lysy-backup-reminder-snoozed-until'
const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000

interface BackupReminderBannerProps {
  onExport: () => void
}

export function BackupReminderBanner({ onExport }: BackupReminderBannerProps) {
  const lastExportAt = useAppStore((s) => s.lastExportAt)
  const findingsCount = useLiveQuery(() => db.findings.count(), [])
  const [snoozedUntil, setSnoozedUntil] = useState(() => {
    const raw = localStorage.getItem(SNOOZE_KEY)
    return raw ? Number(raw) : null
  })
  const [now] = useState(() => Date.now())

  if (findingsCount == null) return null
  if (!shouldRemindBackup(lastExportAt, findingsCount, now, snoozedUntil)) return null

  function handleSnooze() {
    const until = Date.now() + SNOOZE_MS
    localStorage.setItem(SNOOZE_KEY, String(until))
    setSnoozedUntil(until)
  }

  return (
    <Alert className="flex items-center justify-between gap-2">
      <AlertDescription className="text-current">
        {lastExportAt == null
          ? 'Nie masz jeszcze backupu dziennika. Apka działa offline - to jedyna kopia Twoich danych.'
          : 'Dawno nie robiono backupu dziennika. Warto wyeksportować dane na wszelki wypadek.'}
      </AlertDescription>
      <div className="flex shrink-0 gap-2">
        <Button size="sm" onClick={onExport}>
          Eksportuj
        </Button>
        <Button size="sm" variant="ghost" onClick={handleSnooze}>
          Później
        </Button>
      </div>
    </Alert>
  )
}
