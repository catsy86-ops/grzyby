import { ListIcon, MapIcon, PlusIcon } from 'lucide-react'
import { Button } from '../../components/ui/button'

interface MapToolbarProps {
  isListView: boolean
  onToggleListView: () => void
  onAddFinding: () => void
}

// Przyciski akcji (prawy dolny róg) - wydzielone z MapView (Faza 19). Tylko te dwie akcje
// zostają tutaj, pływające nad samą mapą - są używane w każdej wyprawie bez wyjątku. Reszta
// (lokalizacja, warstwy, grzybowiska, kompas, offline, SMS...) przeniesiona do górnego nagłówka
// (patrz MapHeaderActions.tsx) - tu, w rogu mapy, nachodziła wizualnie na natywne kontrolki zoom
// Leaflet.
export function MapToolbar({ isListView, onToggleListView, onAddFinding }: MapToolbarProps) {
  return (
    <div className="flex flex-col items-end gap-2">
      <Button
        variant="secondary"
        size="icon"
        className="rounded-full shadow"
        aria-label={isListView ? 'Pokaż mapę' : 'Pokaż listę znalezisk i grzybowisk'}
        onClick={onToggleListView}
      >
        {isListView ? <MapIcon className="size-4" /> : <ListIcon className="size-4" />}
      </Button>
      {/* Okrągły, ikonowy FAB zamiast pigułki z tekstem - konwencja map-appek (Google/Apple Maps,
          OsmAnd) dla głównej akcji unoszącej się nad mapą. size-14 (56px, standardowy rozmiar
          Material FAB) zamiast domyślnego rozmiaru przycisku - to najważniejsza akcja tego
          widoku, ma być łatwa trafić kciukiem w terenie, w rękawiczkach czy biegu. */}
      <Button
        size="icon"
        className="size-14 rounded-full shadow-[var(--shadow-floating)]"
        aria-label="Dodaj znalezisko"
        onClick={onAddFinding}
      >
        <PlusIcon className="size-6" />
      </Button>
    </div>
  )
}
