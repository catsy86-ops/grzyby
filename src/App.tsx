import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { MapIcon, CameraIcon, NotebookTextIcon, BookOpenIcon, HardDriveIcon, PhoneCallIcon, WifiOffIcon } from 'lucide-react'
import { useAppStore, type ActiveTab } from './stores/appStore'
import { MapView } from './features/map/MapView'
import { IdentifyView } from './features/identify/IdentifyView'
import { JournalView } from './features/journal/JournalView'
import { EncyclopediaView } from './features/encyclopedia/EncyclopediaView'
import { Toaster } from './components/ui/sonner'
import { StorageInfoDrawer } from './components/StorageInfoDrawer'
import { FirstAidGuide } from './components/FirstAidGuide'
import { ThemeToggle } from './components/ThemeToggle'
import { ErrorBoundary } from './components/ErrorBoundary'
import { useAndroidWidgetSync } from './hooks/useAndroidWidgetSync'
import { useOnlineStatus } from './hooks/useOnlineStatus'

const TABS: { key: ActiveTab; label: string; icon: typeof MapIcon }[] = [
  { key: 'mapa', label: 'Mapa', icon: MapIcon },
  { key: 'rozpoznaj', label: 'Rozpoznaj', icon: CameraIcon },
  { key: 'dziennik', label: 'Dziennik', icon: NotebookTextIcon },
  { key: 'baza-wiedzy', label: 'Baza wiedzy', icon: BookOpenIcon },
]

function ActiveView({ tab }: { tab: ActiveTab }) {
  switch (tab) {
    case 'mapa':
      return <MapView />
    case 'rozpoznaj':
      return <IdentifyView />
    case 'dziennik':
      return <JournalView />
    case 'baza-wiedzy':
      return <EncyclopediaView />
  }
}

function App() {
  const activeTab = useAppStore((s) => s.activeTab)
  const setActiveTab = useAppStore((s) => s.setActiveTab)
  const isOnline = useOnlineStatus()
  const [showStorageInfo, setShowStorageInfo] = useState(false)
  const [showFirstAid, setShowFirstAid] = useState(false)
  useAndroidWidgetSync()

  return (
    <div className="flex h-full flex-col bg-background">
      <header className="safe-area-top flex items-center gap-2 bg-primary px-4 pb-3 pt-4 text-primary-foreground shadow-sm">
        <ThemeToggle />
        <div className="flex flex-1 items-center justify-center gap-2">
          <span className="text-lg leading-none">🍄</span>
          <span className="text-sm font-bold tracking-[0.15em]">ŁYSY</span>
        </div>
        <button
          type="button"
          onClick={() => setShowFirstAid(true)}
          aria-label="Pierwsza pomoc przy podejrzeniu zatrucia"
          className="flex size-8 shrink-0 items-center justify-center rounded-full text-primary-foreground/80 outline-none transition-colors hover:bg-primary-foreground/10 hover:text-primary-foreground focus-visible:ring-3 focus-visible:ring-primary-foreground/50"
        >
          <PhoneCallIcon className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => setShowStorageInfo(true)}
          aria-label="Pamięć i dane"
          className="flex size-8 shrink-0 items-center justify-center rounded-full text-primary-foreground/80 outline-none transition-colors hover:bg-primary-foreground/10 hover:text-primary-foreground focus-visible:ring-3 focus-visible:ring-primary-foreground/50"
        >
          <HardDriveIcon className="size-4" />
        </button>
      </header>
      <AnimatePresence>
        {!isOnline && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="flex items-center justify-center gap-1.5 bg-muted px-4 py-1.5 text-xs text-muted-foreground">
              <WifiOffIcon className="size-3.5" />
              Offline - apka działa normalnie, dane zapisują się lokalnie
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <main className="relative z-0 min-h-0 flex-1 overflow-hidden">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="h-full"
          >
            <ErrorBoundary resetKey={activeTab}>
              <ActiveView tab={activeTab} />
            </ErrorBoundary>
          </motion.div>
        </AnimatePresence>
      </main>
      <nav className="safe-area-bottom flex border-t border-border bg-card/95 px-1 pt-1 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key
          const Icon = tab.icon
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              aria-current={isActive ? 'page' : undefined}
              className="flex flex-1 flex-col items-center gap-0.5 rounded-lg py-1.5 outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-95"
            >
              <span className="relative flex h-8 w-14 items-center justify-center rounded-full">
                {isActive && (
                  <motion.span
                    layoutId="nav-pill"
                    className="absolute inset-0 rounded-full bg-primary/10"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                  />
                )}
                <Icon
                  className={`relative size-[18px] transition-colors ${
                    isActive ? 'text-primary' : 'text-muted-foreground'
                  }`}
                />
              </span>
              <span
                className={`text-[11px] leading-none transition-colors ${
                  isActive ? 'font-semibold text-primary' : 'text-muted-foreground'
                }`}
              >
                {tab.label}
              </span>
            </button>
          )
        })}
      </nav>
      <Toaster position="top-center" />
      <StorageInfoDrawer open={showStorageInfo} onOpenChange={setShowStorageInfo} />
      <FirstAidGuide open={showFirstAid} onOpenChange={setShowFirstAid} />
    </div>
  )
}

export default App
