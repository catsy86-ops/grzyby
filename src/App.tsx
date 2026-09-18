import { lazy, Suspense, useEffect, useState } from 'react'
import { flushSync } from 'react-dom'
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
import { EmergencyCard } from './features/tools/EmergencyCard'
import { ToolsMenu, type ToolKey } from './features/tools/ToolsMenu'
import { Logo } from './components/Logo'
import { AnimatedHeaderTitle } from './components/AnimatedHeaderTitle'
import { AnimatedHeaderBackground } from './components/AnimatedHeaderBackground'
import { AppSplash } from './components/AppSplash'
import { OnboardingOverlay } from './components/OnboardingOverlay'
import { useTickReminders } from './hooks/useTickReminders'
import { useSpotRevisitReminders } from './hooks/useSpotRevisitReminders'
import { ThemeToggle } from './components/ThemeToggle'
import { ErrorBoundary } from './components/ErrorBoundary'
import { useAndroidWidgetSync } from './hooks/useAndroidWidgetSync'
import { useOnlineStatus } from './hooks/useOnlineStatus'
import { getCurrentSeason } from './utils/seasonFilter'

const TABS: { key: ActiveTab; label: string; icon: typeof MapIcon }[] = [
  { key: 'mapa', label: 'Mapa', icon: MapIcon },
  { key: 'rozpoznaj', label: 'Rozpoznaj', icon: CameraIcon },
  { key: 'dziennik', label: 'Dziennik', icon: NotebookTextIcon },
  { key: 'baza-wiedzy', label: 'Baza wiedzy', icon: BookOpenIcon },
]

// View Transitions API (nowecos.md, pkt 5) - tylko Chromium ma `document.startViewTransition`,
// więc to progresywne wzbogacenie: gdy dostępne, przełączenie taba owija się w natywny crossfade
// (patrz `::view-transition-*(tab-content)` w index.css) i AnimatePresence poniżej przechodzi w
// tryb "bez animacji" (duration 0), żeby nie nakładać dwóch konkurencyjnych przejść na siebie.
// Gdy niedostępne (Firefox, starsze Safari), AnimatePresence działa dokładnie jak wcześniej.
const supportsViewTransitions = typeof document !== 'undefined' && 'startViewTransition' in document

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

// Skeleton dopasowany do kształtu realnego widoku zamiast jednego generycznego spinnera dla
// wszystkich zakładek (Faza C nowecos.md) - karty-placeholdery w przybliżonym kształcie
// prawdziwej treści dają wrażenie "zaraz się pojawi to samo", nie "coś się ładuje od zera".
// Te komponenty muszą zostać w głównym bundlu (nie lazy) - renderują się ZANIM kod danego
// widoku (i jego zależności, np. Leaflet dla mapy) zdąży się pobrać.
function CardListSkeleton() {
  return (
    <div className="mx-auto flex h-full max-w-2xl flex-col gap-4 p-4 md:max-w-4xl lg:max-w-6xl">
      <Skeleton className="h-6 w-40" />
      <Skeleton className="h-10 w-full rounded-lg" />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    </div>
  )
}

function MapViewSkeleton() {
  return (
    <div className="relative h-full w-full overflow-hidden bg-muted">
      <Skeleton className="absolute inset-0 rounded-none" />
      <Skeleton className="absolute bottom-4 right-4 h-10 w-40 rounded-full" />
    </div>
  )
}

function IdentifyViewSkeleton() {
  return (
    <div className="mx-auto flex h-full w-full max-w-md flex-col gap-4 p-4">
      <Skeleton className="h-6 w-56" />
      <Skeleton className="h-40 w-full rounded-lg" />
    </div>
  )
}

function ActiveView({ tab, mapHeaderActionsSlot }: { tab: ActiveTab; mapHeaderActionsSlot: HTMLDivElement | null }) {
  const fallback =
    tab === 'mapa' ? <MapViewSkeleton /> : tab === 'rozpoznaj' ? <IdentifyViewSkeleton /> : <CardListSkeleton />
  return (
    <Suspense fallback={fallback}>
      {(() => {
        switch (tab) {
          case 'mapa':
            return <MapView headerActionsSlot={mapHeaderActionsSlot} />
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
        {/* size-4.5 (18px) - rozmiar ikon nawigacyjnych, patrz konwencja rozmiarów ikon w index.css */}
        <Icon className={`relative size-4.5 transition-colors ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
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
  const [showEmergencyCard, setShowEmergencyCard] = useState(false)
  // Węzeł DOM drugiego rzędu nagłówka (tylko na zakładce Mapy) - MapView portaluje tam swoje
  // kontekstowe akcje (patrz MapHeaderActions.tsx). `useState` zamiast zwykłego `useRef`, bo
  // callback-ref musi wywołać re-render App, żeby `headerMapActionsEl` faktycznie dotarł do
  // MapView przy pierwszym montowaniu tego wiersza (ref.current samo w sobie nie jest reaktywne).
  const [headerMapActionsEl, setHeaderMapActionsEl] = useState<HTMLDivElement | null>(null)
  const [showToolsMenu, setShowToolsMenu] = useState(false)
  const forestMode = useAppStore((s) => s.forestMode)
  const setForestMode = useAppStore((s) => s.setForestMode)
  useAndroidWidgetSync()
  useTickReminders()
  useSpotRevisitReminders()

  function changeTab(tab: ActiveTab) {
    if (!supportsViewTransitions) {
      setActiveTab(tab)
      return
    }
    // `flushSync` wymusza commit Reacta wewnątrz callbacku, zanim przeglądarka zrobi zrzut
    // "po" stanu DOM - bez tego `startViewTransition` mógłby przechwycić stary widok, bo React
    // batchowałby update poza tym tickiem.
    document.startViewTransition(() => {
      flushSync(() => setActiveTab(tab))
    })
  }

  useEffect(() => {
    document.documentElement.classList.toggle('forest-mode', forestMode)
  }, [forestMode])

  // Sezonowy akcent koloru (`.season-*` w index.css) - liczony raz przy starcie apki, nie
  // reaktywnie - pora roku realistycznie nie zmienia się w trakcie jednej sesji użytkownika.
  useEffect(() => {
    document.documentElement.classList.add(`season-${getCurrentSeason()}`)
  }, [])

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
      case 'emergency-card':
        setShowEmergencyCard(true)
        break
    }
  }

  return (
    <div className="flex h-full flex-col bg-background">
      <AppSplash />
      <OnboardingOverlay />
      {/* Płaski, jednolicie ciemny (nie zielony gradient per-zakładka jak dawniej) - tło nagłówka
          niesie teraz AnimatedHeaderBackground (unoszące się grzyby/piwo), więc samo tło musi być
          stonowane i jednolite w obu motywach, żeby animowane ikony były czytelne na wierzchu.
          `relative overflow-hidden` przycina ikony wypływające poza wysokość nagłówka, treść
          (ThemeToggle/tytuł/przycisk narzędzi) dostaje `z-10`, żeby zawsze była nad animacją.
          `flex-col` (nie pojedynczy rząd) - na zakładce Mapy dochodzi drugi, węższy rząd z
          kontekstowymi akcjami mapy (Zlokalizuj/Grzybowiska/Więcej), przeniesionymi tu z rogu
          mapy, gdzie nachodziły na natywne kontrolki zoom Leaflet. Oba rzędy dzielą jedno tło
          (AnimatedHeaderBackground) i cień, więc czytają się jako jeden spójny pasek, nie dwa
          osobne. */}
      <header className="safe-area-top relative flex flex-col overflow-hidden bg-primary text-primary-foreground shadow-[var(--shadow-card)]">
        <AnimatedHeaderBackground />
        <div className="relative z-10 flex items-center gap-2 px-4 pb-3 pt-4">
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
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-foreground/15 text-primary-foreground outline-none ring-1 ring-primary-foreground/25 transition-[background-color,transform] hover:bg-primary-foreground/25 focus-visible:ring-3 focus-visible:ring-primary-foreground/50 active:translate-y-px"
          >
            <WrenchIcon className="size-4.5" />
          </button>
        </div>
        {activeTab === 'mapa' && (
          <div
            ref={setHeaderMapActionsEl}
            className="relative z-10 flex items-center justify-end gap-0.5 border-t border-primary-foreground/10 px-3 pb-2 pt-1.5"
          />
        )}
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
              onSelect={() => changeTab(tab.key)}
              orientation="vertical"
            />
          ))}
        </aside>
        <main
          className="relative z-0 min-h-0 flex-1 overflow-hidden"
          style={supportsViewTransitions ? { viewTransitionName: 'tab-content' } : undefined}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={activeTab}
              initial={supportsViewTransitions ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={supportsViewTransitions ? undefined : { opacity: 0, y: -8 }}
              transition={supportsViewTransitions ? { duration: 0 } : { duration: 0.18, ease: 'easeOut' }}
              className="h-full"
            >
              <ErrorBoundary resetKey={activeTab}>
                <ActiveView tab={activeTab} mapHeaderActionsSlot={headerMapActionsEl} />
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
            onSelect={() => changeTab(tab.key)}
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
      <EmergencyCard open={showEmergencyCard} onOpenChange={setShowEmergencyCard} />
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
