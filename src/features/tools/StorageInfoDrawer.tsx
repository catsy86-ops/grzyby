import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../components/ui/alert-dialog'
import { Button } from '../../components/ui/button'
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '../../components/ui/drawer'
import { Progress } from '../../components/ui/progress'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import { getPersistenceStatus, requestPersistentStorage, type PersistenceStatus } from '../../utils/persistentStorage'
import { clearCache, formatStorageBytes, getCacheInfo, getStorageEstimate, type CacheInfo, type StorageEstimate } from '../../utils/storageInfo'

interface StorageInfoDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const CLEAR_DESCRIPTIONS: Record<string, string> = {
  'map-tiles': 'Pobrane obszary mapy przestaną być dostępne offline - będziesz musiał(a) pobrać je ponownie będąc online.',
  'map-overlays': 'Obejrzane wcześniej drzewostany, obszary chronione i szlaki przestaną być widoczne offline, dopóki nie obejrzysz ich ponownie online.',
  'ai-model': 'Model rozpoznawania AI zostanie usunięty z pamięci podręcznej i pobierze się ponownie przy kolejnym uruchomieniu online.',
}

export function StorageInfoDrawer({ open, onOpenChange }: StorageInfoDrawerProps) {
  const [caches, setCaches] = useState<CacheInfo[] | null>(null)
  const [estimate, setEstimate] = useState<StorageEstimate | null>(null)
  const [pendingClear, setPendingClear] = useState<CacheInfo | null>(null)
  const [persistence, setPersistence] = useState<PersistenceStatus | null>(null)
  // Na szerokim ekranie (lg:+) szuflada wysuwa się z prawej jako panel boczny zamiast arkusza z
  // dołu - ten sam wzorzec i próg co w SpotManager.tsx (Faza D nowecos.md, "Drawer -> Dialog/Sheet
  // na desktopie" - responsywny kierunek tego samego Drawera zamiast osobnego komponentu Dialog).
  const isWidePanel = useMediaQuery('(min-width: 1024px)')

  async function refresh() {
    const [cacheInfo, storageEstimate, persistenceStatus] = await Promise.all([
      getCacheInfo(),
      getStorageEstimate(),
      getPersistenceStatus(),
    ])
    setCaches(cacheInfo)
    setEstimate(storageEstimate)
    setPersistence(persistenceStatus)
  }

  useEffect(() => {
    if (open) refresh()
  }, [open])

  async function handleRequestPersistence() {
    const status = await requestPersistentStorage()
    setPersistence(status)
    if (status === 'persisted') toast.success('Dane są teraz chronione przed automatycznym usunięciem')
    else
      toast.info(
        'Przeglądarka odmówiła. Zainstaluj aplikację na ekranie głównym i regularnie rób eksport kopii (Dziennik).',
      )
  }

  async function handleConfirmClear() {
    if (!pendingClear) return
    try {
      await clearCache(pendingClear.name)
      toast.success(`Wyczyszczono: ${pendingClear.label}`)
      await refresh()
    } catch {
      toast.error(`Nie udało się wyczyścić: ${pendingClear.label}`)
    } finally {
      setPendingClear(null)
    }
  }

  return (
    <>
      <Drawer open={open} showSwipeHandle swipeDirection={isWidePanel ? 'right' : 'down'} onOpenChange={onOpenChange}>
        <DrawerContent className={isWidePanel ? undefined : 'mx-auto max-w-md'}>
          <DrawerHeader>
            <DrawerTitle>Pamięć i dane</DrawerTitle>
            <DrawerDescription>
              Miejsce zajęte przez pobrane kafelki mapy i model AI - można je bezpiecznie wyczyścić
              (pobiorą się ponownie przy kolejnym użyciu online). Twoje znaleziska i wyprawy nie są
              tu przechowywane i nigdy nie są usuwane tą funkcją.
            </DrawerDescription>
          </DrawerHeader>

          <div className="flex flex-col gap-3 px-4 pb-4">
            {estimate && (
              <div className="flex flex-col gap-1">
                <Progress value={estimate.quotaBytes > 0 ? (estimate.usageBytes / estimate.quotaBytes) * 100 : 0} />
                <p className="text-xs text-muted-foreground">
                  {formatStorageBytes(estimate.usageBytes)} z {formatStorageBytes(estimate.quotaBytes)} dostępnego
                  miejsca w przeglądarce
                </p>
              </div>
            )}

            {persistence === 'persisted' && (
              <p className="rounded-lg border border-border p-3 text-sm text-foreground">
                🔒 Znaleziska i zdjęcia są chronione - przeglądarka nie usunie ich sama przy braku miejsca.
              </p>
            )}
            {persistence === 'not-persisted' && (
              <div className="flex flex-col gap-2 rounded-lg border border-amber-500/50 bg-amber-500/10 p-3">
                <p className="text-sm text-foreground">
                  Znaleziska i zdjęcia mogą zostać usunięte przez przeglądarkę przy braku miejsca (a w
                  Safari po 7 dniach nieużywania, jeśli aplikacja nie jest zainstalowana).
                </p>
                <Button type="button" size="sm" className="self-start" onClick={handleRequestPersistence}>
                  Chroń moje dane
                </Button>
              </div>
            )}

            {caches?.map((cache) => (
              <div key={cache.name} className="flex items-center justify-between gap-2 rounded-lg border border-border p-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{cache.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {cache.entryCount} {cache.entryCount === 1 ? 'plik' : 'plików'}
                    {cache.sizeBytes != null && ` · ${formatStorageBytes(cache.sizeBytes)}`}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={cache.entryCount === 0}
                  onClick={() => setPendingClear(cache)}
                >
                  Wyczyść
                </Button>
              </div>
            ))}

            {caches?.length === 0 && (
              <p className="text-sm text-muted-foreground">Brak zapisanych danych offline.</p>
            )}
          </div>
        </DrawerContent>
      </Drawer>

      <AlertDialog open={pendingClear != null} onOpenChange={(next) => !next && setPendingClear(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Wyczyścić "{pendingClear?.label}"?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingClear && CLEAR_DESCRIPTIONS[pendingClear.name]}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmClear}>Wyczyść</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
