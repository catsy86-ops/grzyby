import {
  CarIcon,
  CrosshairIcon,
  DownloadIcon,
  FlameIcon,
  LayersIcon,
  ListIcon,
  MapIcon,
  MapPinnedIcon,
  MessageCircleIcon,
  MoreVerticalIcon,
  PlusIcon,
  TreePineIcon,
} from 'lucide-react'
import { Button } from '../../components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu'
import { buildLocationSmsUrl } from '../../utils/locationSms'
import type { Position } from '../../utils/bearing'
import { MAP_LAYERS, type MapLayerId } from '../../data/mapLayers'
import { MIN_FINDINGS_FOR_HEATMAP } from '../../utils/heatmapStyle'
import type { ActiveSheet } from './MapView'

interface MapToolbarProps {
  userPosition: Position | null
  hasReturnPoint: boolean
  isListView: boolean
  onToggleListView: () => void
  onLocate: () => void
  onOpenSheet: (sheet: ActiveSheet) => void
  onSaveReturnPoint: () => void
  onAddFinding: () => void
  mapLayerId: MapLayerId
  onChangeMapLayer: (id: MapLayerId) => void
  findingsCount: number
  isHeatmapView: boolean
  onToggleHeatmapView: () => void
}

// Przyciski akcji + menu narzędzi (prawy dolny róg) - wydzielone z MapView (Faza 19). Menu
// konsoliduje rzadziej używane akcje (offline, grzybowiska, auto, SMS), żeby róg nie spuchł do
// sterty nakładających się przycisków przy każdej kolejnej funkcji mapy (było ich już 6 obok
// siebie). Najczęstsze akcje ("Zlokalizuj mnie", "Dodaj znalezisko") zostają jako osobne, stałe
// przyciski - to one są używane w każdej wyprawie, reszta okazjonalnie.
export function MapToolbar({
  userPosition,
  hasReturnPoint,
  isListView,
  onToggleListView,
  onLocate,
  onOpenSheet,
  onSaveReturnPoint,
  onAddFinding,
  mapLayerId,
  onChangeMapLayer,
  findingsCount,
  isHeatmapView,
  onToggleHeatmapView,
}: MapToolbarProps) {
  const heatmapDisabled = findingsCount < MIN_FINDINGS_FOR_HEATMAP
  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex items-center gap-2">
      <Button
        variant="secondary"
        size="icon"
        className="rounded-full shadow"
        aria-label={isListView ? 'Pokaż mapę' : 'Pokaż listę znalezisk i grzybowisk'}
        onClick={onToggleListView}
      >
        {isListView ? <MapIcon className="size-4" /> : <ListIcon className="size-4" />}
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="secondary"
              size="icon"
              className="rounded-full shadow"
              aria-label="Więcej narzędzi mapy"
            />
          }
        >
          <MoreVerticalIcon className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="end" className="w-56">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Warstwa mapy</DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={mapLayerId}
              onValueChange={(value) => onChangeMapLayer(value as MapLayerId)}
            >
              {MAP_LAYERS.map((layer) => (
                <DropdownMenuRadioItem key={layer.id} value={layer.id}>
                  <LayersIcon />
                  {layer.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuCheckboxItem
            checked={isHeatmapView}
            disabled={heatmapDisabled}
            onCheckedChange={onToggleHeatmapView}
          >
            <FlameIcon />
            {heatmapDisabled ? `Mapa cieplna (min. ${MIN_FINDINGS_FOR_HEATMAP} znalezisk)` : 'Mapa cieplna znalezisk'}
          </DropdownMenuCheckboxItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => onOpenSheet('szczecin-spots')}>
            <TreePineIcon />
            Szczecin i okolice
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onOpenSheet('offline-download')}>
            <DownloadIcon />
            Pobierz obszar offline
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onOpenSheet('spots')}>
            <MapPinnedIcon />
            Grzybowiska
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onSaveReturnPoint}>
            <CarIcon />
            {hasReturnPoint ? 'Zaktualizuj pozycję auta' : 'Zapisz pozycję auta'}
          </DropdownMenuItem>
          {userPosition && (
            <DropdownMenuItem
              onClick={() => {
                window.location.href = buildLocationSmsUrl(userPosition[0], userPosition[1])
              }}
            >
              <MessageCircleIcon />
              Wyślij SMS z lokalizacją
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <Button
        variant="secondary"
        size="icon"
        className="rounded-full shadow"
        aria-label="Zlokalizuj mnie"
        onClick={onLocate}
      >
        <CrosshairIcon className="size-4" />
      </Button>
      </div>
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
