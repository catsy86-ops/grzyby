import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { MapIcon, CameraIcon, NotebookTextIcon, BookOpenIcon, WifiOffIcon, WrenchIcon } from 'lucide-react'
import { useAppStore, type ActiveTab } from './stores/appStore'
import { MapView } from './features/map/MapView'
import { IdentifyView } from './features/identify/IdentifyView'
import { JournalView } from './features/journal/JournalView'
import { EncyclopediaView } from './features/encyclopedia/EncyclopediaView'
import { Toaster } from './components/ui/sonner'
import { StorageInfoDrawer } from './components/StorageInfoDrawer'
import { FirstAidGuide } from './components/FirstAidGuide'
import { GearChecklist } from './components/GearChecklist'
import { TickCareGuide } from './components/TickCareGuide'
import { CookingTimer } from './components/CookingTimer'
import { ToolsMenu, type ToolKey } from './components/ToolsMenu'
import { Logo } from './components/Logo'
import { AppSplash } from './components/AppSplash'
import { useTickReminders } from './hooks/useTickReminders'
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
  const [showGearChecklist, setShowGearChecklist] = useState(false)
  const [showTickCare, setShowTickCare] = useState(false)
  const [showCookingTimer, setShowCookingTimer] = useState(false)
  const [showToolsMenu, setShowToolsMenu] = useState(false)
  const forestMode = useAppStore((s) => s.forestMode)
  const setForestMode = useAppStore((s) => s.setForestMode)
  useAndroidWidgetSync()
  useTickReminders()

  useEffect(() => {
    document.documentElement.classList.toggle('forest-mode', forestMode)
  }, [forestMode])

  function handleSelectTool(tool: ToolKey) {
    setShowToolsMenu(false)
    switch (tool) {
      case 'first-aid':
        setShowFirstAid(true)
        break
      case 'gear-checklist':
        setShowGearChecklist(true)
        break
      case 'tick-care':
        setShowTickCare(true)
        break
      case 'cooking-timer':
        setShowCookingTimer(true)
        break
      case 'storage-info':
        setShowStorageInfo(true)
        break
    }
  }

  return (
    <div className="flex h-full flex-col bg-background">
      <AppSplash />
      {/* Gradient primary -> brand-accent (bursztyn) zamiast prawie niewidocznego primary ->
          primary/90 - nagłówek jako realna przestrzeń marki, wykorzystująca drugi akcent, który
          wcześniej żył tylko w logo/cieniach kart. Diagonalny kierunek + oba kolory tak samo
          ciemne w obu motywach (patrz index.css) utrzymują kontrast tekstu primary-foreground. */}
      <header className="safe-area-top flex items-center gap-2 bg-gradient-to-br from-primary via-primary to-brand-accent/70 px-4 pb-3 pt-4 text-primary-foreground shadow-sm shadow-brand-accent/20">
        <ThemeToggle />
        <div className="flex flex-1 items-center justify-center gap-1.5">
          <Logo className="size-5" />
          <span className="text-sm font-bold tracking-wide">Grzybobranie</span>
        </div>
        {/* Przycisk "Narzędzia" celowo WYRAŹNIEJSZY niż ThemeToggle obok (stała, nie tylko
            hover, obwódka/tło + pełna nieprzezroczystość ikony) - to wejście do pierwszej
            pomocy/kleszczy/checklisty sprzętu, nie kosmetyczne ustawienie, więc nie powinno mieć
            tej samej, łatwej do przeoczenia wagi wizualnej co przełącznik motywu. */}
        <button
          type="button"
          onClick={() => setShowToolsMenu(true)}
          aria-label="Narzędzia"
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-foreground/15 text-primary-foreground outline-none ring-1 ring-primary-foreground/25 transition-colors hover:bg-primary-foreground/25 focus-visible:ring-3 focus-visible:ring-primary-foreground/50"
        >
          <WrenchIcon className="size-4.5" />
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
              className="flex flex-1 flex-col items-center gap-0.5 rounded-lg py-1.5 outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <motion.span
                className="relative flex h-8 w-14 items-center justify-center rounded-full"
                whileTap={{ scale: 0.85 }}
                transition={{ type: 'spring', stiffness: 400, damping: 15 }}
              >
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
              </motion.span>
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
      <GearChecklist open={showGearChecklist} onOpenChange={setShowGearChecklist} />
      <TickCareGuide open={showTickCare} onOpenChange={setShowTickCare} />
      <CookingTimer open={showCookingTimer} onOpenChange={setShowCookingTimer} />
      <ToolsMenu
        open={showToolsMenu}
        onOpenChange={setShowToolsMenu}
        onSelect={handleSelectTool}
        forestMode={forestMode}
        onToggleForestMode={() => setForestMode(!forestMode)}
      />
    </div>
  )
}

export default App
