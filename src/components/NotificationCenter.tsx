import { DownloadIcon, MapPinnedIcon } from 'lucide-react'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { useNotificationItems } from '../hooks/useNotificationItems'
import { useAppStore } from '../stores/appStore'
import { downloadBlob } from '../utils/downloadBlob'
import { exportData } from '../utils/exportImport'
import type { NotificationAction, NotificationItem } from '../utils/notificationCenter'
import { Button } from './ui/button'
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from './ui/drawer'

const ACTION_ICON: Record<NotificationAction, typeof DownloadIcon> = {
  export: DownloadIcon,
  'go-to-map': MapPinnedIcon,
}

const ACTION_LABEL: Record<NotificationAction, string> = {
  export: 'Eksportuj',
  'go-to-map': 'Przejdź',
}

interface NotificationCenterProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

// Centralny panel powiadomień - agreguje warunki, które dziś każde żyją osobno (backup,
// przeciągająca się wyprawa, rewizyta grzybowiska), patrz utils/notificationCenter.ts. Reużywa
// dokładnie tę samą sekwencję eksportu JSON co JournalView.handleExport (3 linie, nie warto
// wydzielać wspólnej funkcji tylko dla nich - patrz komentarz w tamtym pliku).
export function NotificationCenter({ open, onOpenChange }: NotificationCenterProps) {
  const items = useNotificationItems()
  const setActiveTab = useAppStore((s) => s.setActiveTab)
  const isWidePanel = useMediaQuery('(min-width: 1024px)')

  async function handleAction(item: NotificationItem) {
    if (item.action === 'export') {
      const blob = await exportData()
      const timestamp = Date.now()
      downloadBlob(blob, `lysy-dziennik-${new Date(timestamp).toISOString().slice(0, 10)}.json`)
      useAppStore.getState().setLastExportAt(timestamp)
    } else {
      setActiveTab('mapa')
    }
    onOpenChange(false)
  }

  return (
    <Drawer open={open} swipeDirection={isWidePanel ? 'right' : 'down'} onOpenChange={onOpenChange}>
      <DrawerContent className={isWidePanel ? undefined : 'mx-auto max-w-md'}>
        <DrawerHeader>
          <DrawerTitle>Powiadomienia</DrawerTitle>
          <DrawerDescription>Rzeczy, na które warto teraz zwrócić uwagę.</DrawerDescription>
        </DrawerHeader>
        <div className="flex flex-col gap-2 px-4 pb-4">
          {items.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">Nic nie wymaga uwagi.</p>
          )}
          {items.map((item) => {
            const Icon = ACTION_ICON[item.action]
            return (
              <div key={item.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Icon className="size-4.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                </div>
                <Button size="sm" variant="outline" className="shrink-0" onClick={() => handleAction(item)}>
                  {ACTION_LABEL[item.action]}
                </Button>
              </div>
            )
          })}
        </div>
      </DrawerContent>
    </Drawer>
  )
}
