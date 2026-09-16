import { lazy, Suspense, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { MapIcon, CameraIcon, NotebookTextIcon, BookOpenIcon, WifiOffIcon, WrenchIcon } from 'lucide-react'
import { useAppStore, type ActiveTab } from './stores/appStore'
import { Toaster } from './components/ui/sonner'
import { Skeleton } from './components/ui/skeleton'
import { StorageInfoDrawer } from './features/tools/StorageInfoDrawer'
import { FirstAidGuide } from './features/tools/FirstAidGuide'
import { GearChecklist } from './features/tools/GearChecklist'
import { TickCareGuide } from './features/tools/TickCareGuide'
import { CookingTimer } from './features/tools/CookingTimer'
import { ToolsMenu, type ToolKey } from './features/tools/ToolsMenu'
import { Logo } from './components/Logo'
import { AnimatedHeaderTitle } from './components/AnimatedHeaderTitle'
import { AppSplash } from './components/AppSplash'
import { OnboardingOverlay } from './components/OnboardingOverlay'
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

// Każdy widok lazy-loadowany osobno - żaden z nich (zwłaszcza Mapa, ciągnąca za sobą
// Leaflet/react-leaflet) nie musi lądować w głównym bundlu, jeśli użytkownik danej zakładki
// nigdy nie otworzy. `Suspense` fallback to prosty skeleton - przejście jest praktycznie
// niezauważalne po pierwszym załadowaniu (moduł zostaje w cache przeglądarki/Service Workera).
const MapView = lazy(() => import('./features/map/MapView').then((m) => ({ default: m.MapView })))
const IdentifyView = lazy(() => import('./features/identify/IdentifyView').then((m) => ({ default: m.IdentifyView })))
const JournalView = lazy(() => import('./features/journal/JournalView').then((m) => ({ default: m.JournalView })))
const EncyclopediaView = lazy(() =>
  import('./features/encyclopedia/EncyclopediaView').then((m) => ({ default: m.EncyclopediaView })),
)

function ViewSkeleton() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2">
      <Skeleton className="h-10 w-10 rounded-full" />
      <Skeleton className="h-3 w-32" />
    </div>
  )
}

function ActiveView({ tab }: { tab: ActiveTab }) {
  return (
    <Suspense fallback={<ViewSkeleton />}>
      {(() => {
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
      })()}
    </Suspense>
  )
}

// Wspólny render przycisku zakładki dla dolnego nav (mobile) i side-rail (desktop, `md:` w
// górę) - te same dane i logika aktywności, różni się tylko układ (poziomy pasek u dołu vs.
// pionowa szyna z boku), więc zamiast dwóch kopii JSX jeden helper z parametrem orientacji.
function NavButton({
  tab,
  isActive,
  onSelect,
  orientation,
}: {
  tab: (typeof TABS)[number]
  isActive: boolean
  onSelect: () => void
  orientation: 'horizontal' | 'vertical'
}) {
  const Icon = tab.icon
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={isActive ? 'page' : undefined}
      className={
        orientation === 'horizontal'
          ? 'flex flex-1 flex-col items-center gap-0.5 rounded-lg py-1.5 outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50'
          : 'flex w-full flex-col items-center gap-1 rounded-lg py-2.5 outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50'
      }
    >
      <motion.span
        className="relative flex h-8 w-14 items-center justify-center rounded-full"
        whileTap={{ scale: 0.85 }}
        transition={{ type: 'spring', stiffness: 400, damping: 15 }}
      >
        {isActive && (
          <motion.span
            layoutId={`nav-pill-${orientation}`}
            className="absolute inset-0 rounded-full bg-primary/10"
            transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
          />
        )}
        <Icon className={`relative size-[18px] transition-colors ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
      </motion.span>
      <span className={`text-[11px] leading-none transition-colors ${isActive ? 'font-semibold text-primary' : 'text-muted-foreground'}`}>
        {tab.label}
      </span>
    </button>
  )
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
      <OnboardingOverlay />
      {/* Gradient primary -> brand-accent (bursztyn) zamiast prawie niewidocznego primary ->
          primary/90 - nagłówek jako realna przestrzeń marki, wykorzystująca drugi akcent, który
          wcześniej żył tylko w logo/cieniach kart. Diagonalny kierunek + oba kolory tak samo
          ciemne w obu motywach (patrz index.css) utrzymują kontrast tekstu primary-foreground.
          Faza A nowecos.md: Mapa i Rozpoznaj dostają subtelnie inny końcowy kolor gradientu
          (leśna zieleń / bursztyn skanu) dla szybszej orientacji "w której jestem zakładce" -
          Dziennik i Baza wiedzy zostają przy domyślnym primary->brand-accent. */}
      <header
        className={`safe-area-top flex items-center gap-2 bg-gradient-to-br from-primary via-primary px-4 pb-3 pt-4 text-primary-foreground shadow-[var(--shadow-card)] transition-colors duration-300 ${
          activeTab === 'mapa'
            ? 'to-header-accent-mapa/70'
            : activeTab === 'rozpoznaj'
              ? 'to-header-accent-rozpoznaj/70'
              : 'to-brand-accent/70'
        }`}
      >
        <ThemeToggle />
        <div className="flex flex-1 items-center justify-center gap-1.5">
          <Logo className="size-5" />
          <AnimatedHeaderTitle />
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
      {/* `md:` w górę: dolny nav ustępuje pionowej szynie z boku (side-rail) - na szerszym
          ekranie apka rozciągnięta na całą szerokość telefonu wygląda jak przeskalowany telefon,
          nie jak natywna aplikacja desktopowa/tabletowa. Oba nav-y są zamontowane naraz (ukryte
          przez CSS, nie unmount) - `key={activeTab}` w `AnimatePresence` i stan w appStore są
          współdzielone, więc przełączenie breakpointu w locie (np. obrót tabletu) nic nie gubi. */}
      <div className="flex min-h-0 flex-1 md:flex-row">
        <aside className="hidden shrink-0 flex-col gap-1 border-r border-border bg-card/60 p-2 md:flex md:w-24">
          {TABS.map((tab) => (
            <NavButton
              key={tab.key}
              tab={tab}
              isActive={activeTab === tab.key}
              onSelect={() => setActiveTab(tab.key)}
              orientation="vertical"
            />
          ))}
        </aside>
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
      </div>
      <nav className="safe-area-bottom relative z-10 flex border-t border-border bg-card/95 px-1 pt-1 shadow-[var(--shadow-floating)] backdrop-blur supports-[backdrop-filter]:bg-card/80 md:hidden">
        {TABS.map((tab) => (
          <NavButton
            key={tab.key}
            tab={tab}
            isActive={activeTab === tab.key}
            onSelect={() => setActiveTab(tab.key)}
            orientation="horizontal"
          />
        ))}
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
