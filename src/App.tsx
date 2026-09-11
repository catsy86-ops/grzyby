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
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-2 border-b border-gray-200 bg-green-900 px-4 py-2 text-white">
        <span className="text-lg">🍄</span>
        <span className="text-sm font-bold tracking-wide">ŁYSY</span>
      </header>
      <main className="min-h-0 flex-1">
        <ActiveView tab={activeTab} />
      </main>
      <nav className="flex border-t border-gray-200 bg-white">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-xs ${
              activeTab === tab.key ? 'font-semibold text-green-800' : 'text-gray-500'
            }`}
          >
            <span className="text-lg">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  )
}

export default App
