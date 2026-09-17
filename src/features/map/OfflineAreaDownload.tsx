import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { Alert, AlertDescription } from '../../components/ui/alert'
import { Button } from '../../components/ui/button'
import { Drawer, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle, DrawerDescription } from '../../components/ui/drawer'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import { Progress } from '../../components/ui/progress'
import {
  computeTilesForArea,
  downloadTilesForOfflineUse,
  estimateDownloadSizeBytes,
  formatBytes,
  OFFLINE_RADIUS_PRESETS,
  type DownloadProgress,
  type TileCoord,
} from '../../utils/offlineMapTiles'
import type { MapLayerDef } from '../../data/mapLayers'

interface OfflineAreaDownloadProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  getCenter: () => [number, number] | null
  // Kafle są pobierane z aktualnie wybranej warstwy mapy (patrz MapToolbar "Warstwa mapy") - kto
  // przełączył się na widok terenowy przed wyprawą, dostaje offline dokładnie to, co widział.
  activeLayer: MapLayerDef
}

export function OfflineAreaDownload({ open, onOpenChange, getCenter, activeLayer }: OfflineAreaDownloadProps) {
  const [radiusKm, setRadiusKm] = useState<number>(OFFLINE_RADIUS_PRESETS[1].km)
  const [progress, setProgress] = useState<DownloadProgress | null>(null)
  // Ten sam wzorzec i próg co w SpotManager.tsx/StorageInfoDrawer.tsx/ToolsMenu.tsx/AddFindingForm.tsx.
  const isWidePanel = useMediaQuery('(min-width: 1024px)')
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Kafelki, które faktycznie nie zapisały się w poprzedniej próbie - pozwala na "Ponów nieudane"
  // zamiast pobierania całego obszaru od nowa (choć już zapisane kafelki i tak są pomijane dzięki
  // `cache.match` w downloadTilesForOfflineUse, więc koszt ponowienia całości jest niższy niż
  // mogłoby się wydawać - "Ponów nieudane" jest mimo to jaśniejszym sygnałem dla użytkownika).
  const [failedTiles, setFailedTiles] = useState<TileCoord[] | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const center = getCenter()
  const tiles = center ? computeTilesForArea(center, radiusKm) : []
  const estimatedBytes = estimateDownloadSizeBytes(tiles.length)

  async function runDownload(tilesToDownload: TileCoord[]) {
    setError(null)
    setDownloading(true)
    setFailedTiles(null)
    setProgress({ downloaded: 0, total: tilesToDownload.length, failed: 0 })
    const controller = new AbortController()
    abortControllerRef.current = controller
    try {
      const result = await downloadTilesForOfflineUse(tilesToDownload, setProgress, controller.signal, activeLayer.urlTemplate)
      if (controller.signal.aborted) {
        toast.info('Pobieranie anulowane - zapisane już kafelki zostają dostępne offline.')
        return
      }
      if (result.failed === 0) {
        toast.success(`Pobrano obszar offline (${result.total} kafelków map).`)
        onOpenChange(false)
      } else {
        toast.warning(`Pobrano obszar offline, ${result.failed} kafelków nie udało się zapisać.`)
        setFailedTiles(result.failedTiles)
      }
    } catch (err) {
      if (!controller.signal.aborted) {
        setError(err instanceof Error ? err.message : 'Nie udało się pobrać kafelków mapy.')
      }
    } finally {
      setDownloading(false)
      abortControllerRef.current = null
    }
  }

  function handleDownload() {
    if (!center) {
      setError('Nie udało się ustalić środka mapy - odśwież mapę i spróbuj ponownie.')
      return
    }
    void runDownload(tiles)
  }

  function handleRetryFailed() {
    if (failedTiles && failedTiles.length > 0) void runDownload(failedTiles)
  }

  function handleCancel() {
    abortControllerRef.current?.abort()
  }

  return (
    <Drawer
      open={open}
      showSwipeHandle={!isWidePanel}
      swipeDirection={isWidePanel ? 'right' : 'down'}
      onOpenChange={(next) => {
        if (!downloading) onOpenChange(next)
      }}
    >
      <DrawerContent className={isWidePanel ? undefined : 'mx-auto max-w-md'}>
        <DrawerHeader>
          <DrawerTitle>Pobierz obszar offline</DrawerTitle>
          <DrawerDescription>
            Zapisuje kafelki mapy (warstwa: {activeLayer.label}) wokół aktualnie widocznego miejsca, żeby były
            dostępne bez internetu na wyprawie. Bądź teraz online.
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
          {downloading ? (
            <Button variant="outline" onClick={handleCancel}>
              Anuluj pobieranie
            </Button>
          ) : failedTiles && failedTiles.length > 0 ? (
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={handleDownload}>
                Pobierz od nowa
              </Button>
              <Button className="flex-1" onClick={handleRetryFailed}>
                Ponów nieudane ({failedTiles.length})
              </Button>
            </div>
          ) : (
            <Button onClick={handleDownload} disabled={!navigator.onLine}>
              Pobierz
            </Button>
          )}
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
