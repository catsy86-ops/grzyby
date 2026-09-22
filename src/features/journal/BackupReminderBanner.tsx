import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Alert, AlertDescription } from '../../components/ui/alert'
import { Button } from '../../components/ui/button'
import { db } from '../../db/db'
import { useAppStore } from '../../stores/appStore'
import { shouldRemindBackup } from '../../utils/backupReminder'

const SNOOZE_KEY = 'lysy-backup-reminder-snoozed-until'
const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000
// Ten sam wzorzec i uzasadnienie co `NOW_REFRESH_INTERVAL_MS` w useNotificationItems.ts - bez
// tego "now" zamrożone raz przy montowaniu nigdy by się nie zaktualizowało samo z siebie, więc
// baner mógłby pokazywać nieaktualny stan przy długiej sesji (np. Dziennik otwarty przez całą
// wielogodzinną wyprawę), rozjeżdżając się z dzwonkiem powiadomień w nagłówku, który już się
// odświeża (SRC-COMPONENTS-AUDIT-ROADMAP.md Tier 1 pkt 6).
const NOW_REFRESH_INTERVAL_MS = 60_000

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
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), NOW_REFRESH_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [])

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
