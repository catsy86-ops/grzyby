import { useState } from 'react'
import { toast } from 'sonner'
import { Alert, AlertDescription } from '../../components/ui/alert'
import { Button } from '../../components/ui/button'
import { Drawer, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle, DrawerDescription } from '../../components/ui/drawer'
import { Progress } from '../../components/ui/progress'
import {
  computeTilesForArea,
  downloadTilesForOfflineUse,
  estimateDownloadSizeBytes,
  formatBytes,
  OFFLINE_RADIUS_PRESETS,
  type DownloadProgress,
} from '../../utils/offlineMapTiles'

interface OfflineAreaDownloadProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  getCenter: () => [number, number] | null
}

export function OfflineAreaDownload({ open, onOpenChange, getCenter }: OfflineAreaDownloadProps) {
  const [radiusKm, setRadiusKm] = useState<number>(OFFLINE_RADIUS_PRESETS[1].km)
  const [progress, setProgress] = useState<DownloadProgress | null>(null)
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const center = getCenter()
  const tiles = center ? computeTilesForArea(center, radiusKm) : []
  const estimatedBytes = estimateDownloadSizeBytes(tiles.length)

  async function handleDownload() {
    if (!center) {
      setError('Nie udało się ustalić środka mapy - odśwież mapę i spróbuj ponownie.')
      return
    }
    setError(null)
    setDownloading(true)
    setProgress({ downloaded: 0, total: tiles.length, failed: 0 })
    try {
      const result = await downloadTilesForOfflineUse(tiles, setProgress)
      if (result.failed === 0) {
        toast.success(`Pobrano obszar offline (${result.total} kafelków map).`)
      } else {
        toast.warning(`Pobrano obszar offline, ${result.failed} kafelków nie udało się zapisać.`)
      }
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nie udało się pobrać kafelków mapy.')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <Drawer
      open={open}
      showSwipeHandle
      onOpenChange={(next) => {
        if (!downloading) onOpenChange(next)
      }}
    >
      <DrawerContent className="mx-auto max-w-md">
        <DrawerHeader>
          <DrawerTitle>Pobierz obszar offline</DrawerTitle>
          <DrawerDescription>
            Zapisuje kafelki mapy wokół aktualnie widocznego miejsca, żeby były dostępne bez internetu na
            wyprawie. Bądź teraz online.
          </DrawerDescription>
        </DrawerHeader>

        <div className="flex flex-col gap-4 px-4 pb-2">
          {!navigator.onLine && (
            <Alert variant="destructive-soft">
              <AlertDescription>Jesteś offline - połącz się z internetem, aby pobrać mapę.</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2">
            {OFFLINE_RADIUS_PRESETS.map((preset) => (
              <Button
                key={preset.km}
                type="button"
                variant={radiusKm === preset.km ? 'default' : 'outline'}
                className="flex-1"
                disabled={downloading}
                onClick={() => setRadiusKm(preset.km)}
              >
                {preset.label}
              </Button>
            ))}
          </div>

          <p className="text-sm text-muted-foreground">
            {tiles.length} kafelków, ok. {formatBytes(estimatedBytes)}
          </p>

          {progress && (
            <div className="flex flex-col gap-1">
              <Progress value={(progress.downloaded / Math.max(progress.total, 1)) * 100} />
              <p className="text-xs text-muted-foreground">
                {progress.downloaded} / {progress.total}
                {progress.failed > 0 ? ` (${progress.failed} błędów)` : ''}
              </p>
            </div>
          )}

          {error && (
            <Alert variant="destructive-soft">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DrawerFooter>
          <Button onClick={handleDownload} disabled={downloading || !navigator.onLine}>
            {downloading ? 'Pobieranie...' : 'Pobierz'}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
