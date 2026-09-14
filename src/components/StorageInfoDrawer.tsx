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
} from './ui/alert-dialog'
import { Button } from './ui/button'
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from './ui/drawer'
import { Progress } from './ui/progress'
import { clearCache, formatStorageBytes, getCacheInfo, getStorageEstimate, type CacheInfo, type StorageEstimate } from '../utils/storageInfo'

interface StorageInfoDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function StorageInfoDrawer({ open, onOpenChange }: StorageInfoDrawerProps) {
  const [caches, setCaches] = useState<CacheInfo[] | null>(null)
  const [estimate, setEstimate] = useState<StorageEstimate | null>(null)
  const [pendingClear, setPendingClear] = useState<CacheInfo | null>(null)

  async function refresh() {
    const [cacheInfo, storageEstimate] = await Promise.all([getCacheInfo(), getStorageEstimate()])
    setCaches(cacheInfo)
    setEstimate(storageEstimate)
  }

  useEffect(() => {
    if (open) refresh()
  }, [open])

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
      <Drawer open={open} showSwipeHandle onOpenChange={onOpenChange}>
        <DrawerContent className="mx-auto max-w-md">
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
              {pendingClear?.name === 'map-tiles'
                ? 'Pobrane obszary mapy przestaną być dostępne offline - będziesz musiał(a) pobrać je ponownie będąc online.'
                : 'Model rozpoznawania AI zostanie usunięty z pamięci podręcznej i pobierze się ponownie przy kolejnym uruchomieniu online.'}
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
