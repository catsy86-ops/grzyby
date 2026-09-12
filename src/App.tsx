import { useAppStore, type ActiveTab } from './stores/appStore'
import { MapView } from './features/map/MapView'
import { IdentifyView } from './features/identify/IdentifyView'
import { JournalView } from './features/journal/JournalView'
import { EncyclopediaView } from './features/encyclopedia/EncyclopediaView'

const TABS: { key: ActiveTab; label: string; icon: string }[] = [
  { key: 'mapa', label: 'Mapa', icon: '🗺️' },
  { key: 'rozpoznaj', label: 'Rozpoznaj', icon: '📷' },
  { key: 'dziennik', label: 'Dziennik', icon: '📓' },
  { key: 'baza-wiedzy', label: 'Baza wiedzy', icon: '📚' },
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

  return (
    <div className="flex h-full flex-col bg-gray-50">
      <header className="safe-area-top flex items-center justify-center gap-2 bg-green-900 px-4 pb-3 pt-4 text-white shadow-sm">
        <span className="text-lg leading-none">🍄</span>
        <span className="text-sm font-bold tracking-[0.15em]">ŁYSY</span>
      </header>
      <main className="min-h-0 flex-1 overflow-hidden">
        <ActiveView tab={activeTab} />
      </main>
      <nav className="safe-area-bottom flex border-t border-gray-200 bg-white/95 px-1 pt-1 backdrop-blur supports-[backdrop-filter]:bg-white/80">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="flex flex-1 flex-col items-center gap-0.5 py-1.5 transition-colors active:scale-95"
            >
              <span
                className={`flex h-8 w-14 items-center justify-center rounded-full text-lg transition-colors ${
                  isActive ? 'bg-green-800/10' : ''
                }`}
              >
                {tab.icon}
              </span>
              <span
                className={`text-[11px] leading-none transition-colors ${
                  isActive ? 'font-semibold text-green-800' : 'text-gray-500'
                }`}
              >
                {tab.label}
              </span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}

export default App
