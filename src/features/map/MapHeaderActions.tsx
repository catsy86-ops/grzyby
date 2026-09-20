import {
  BatteryIcon,
  CarIcon,
  CompassIcon,
  CrosshairIcon,
  DownloadIcon,
  FilterIcon,
  FlameIcon,
  LayersIcon,
  MapPinnedIcon,
  MessageCircleIcon,
  MoreVerticalIcon,
  SparklesIcon,
  TreePineIcon,
} from 'lucide-react'
import type { PowerSaveMode } from '../../stores/appStore'
import { POWER_SAVE_MODE_LABELS } from '../../utils/powerSave'
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
import type { Species } from '../../db/schema'
import type { ActiveSheet } from './MapView'

interface MapHeaderActionsProps {
  userPosition: Position | null
  hasReturnPoint: boolean
  onLocate: () => void
  onOpenSheet: (sheet: ActiveSheet) => void
  onSaveReturnPoint: () => void
  mapLayerId: MapLayerId
  onChangeMapLayer: (id: MapLayerId) => void
  findingsCount: number
  isHeatmapView: boolean
  onToggleHeatmapView: () => void
  isSeasonalOverlayEnabled: boolean
  onToggleSeasonalOverlay: () => void
  seasonalOverlayDisabled: boolean
  speciesOptions: Species[]
  speciesFilterIds: Set<string>
  onToggleSpeciesFilter: (id: string) => void
  onClearSpeciesFilter: () => void
  powerSaveMode: PowerSaveMode
  onChangePowerSaveMode: (mode: PowerSaveMode) => void
  powerSaveActive: boolean
}

// Kontekstowe akcje mapy w górnym pasku (portal do App.tsx przez `headerActionsSlot`, patrz
// MapView.tsx) - dotąd żyły jako pływające przyciski w prawym dolnym rogu mapy, gdzie "Zlokalizuj
// mnie" i menu narzędzi nachodziły wizualnie na natywne kontrolki zoom Leaflet. Tylko FAB
// "Dodaj znalezisko" i przełącznik lista/mapa zostają przy mapie (patrz MapToolbar.tsx) - to
// jedyne dwie akcje używane w każdej wyprawie bez wyjątku, reszta trafia tutaj, do nagłówka.
// Stylistyka przycisków dopasowana do ciemnego tła nagłówka (text-primary-foreground), inna niż
// jasne/cienione przyciski `secondary` pływające nad samą mapą.
export function MapHeaderActions({
  userPosition,
  hasReturnPoint,
  onLocate,
  onOpenSheet,
  onSaveReturnPoint,
  mapLayerId,
  onChangeMapLayer,
  findingsCount,
  isHeatmapView,
  onToggleHeatmapView,
  isSeasonalOverlayEnabled,
  onToggleSeasonalOverlay,
  seasonalOverlayDisabled,
  speciesOptions,
  speciesFilterIds,
  onToggleSpeciesFilter,
  onClearSpeciesFilter,
  powerSaveMode,
  onChangePowerSaveMode,
  powerSaveActive,
}: MapHeaderActionsProps) {
  const heatmapDisabled = findingsCount < MIN_FINDINGS_FOR_HEATMAP
  const headerButtonClass =
    'flex size-8 shrink-0 items-center justify-center rounded-full text-primary-foreground/80 outline-none transition-[color,background-color,transform] hover:bg-primary-foreground/10 hover:text-primary-foreground focus-visible:ring-3 focus-visible:ring-primary-foreground/50 active:translate-y-px'

  return (
    <>
      <button type="button" onClick={onLocate} aria-label="Zlokalizuj mnie" className={headerButtonClass}>
        <CrosshairIcon className="size-4" />
      </button>
      <button
        type="button"
        onClick={() => onOpenSheet('spots')}
        aria-label="Grzybowiska"
        className={headerButtonClass}
      >
        <MapPinnedIcon className="size-4" />
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger render={<button type="button" aria-label="Więcej narzędzi mapy" className={headerButtonClass} />}>
          <MoreVerticalIcon className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent side="bottom" align="end" className="w-56">
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
          {speciesOptions.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuLabel className="flex items-center justify-between gap-2">
                  Gatunek
                  {speciesFilterIds.size > 0 && (
                    <button
                      type="button"
                      onClick={onClearSpeciesFilter}
                      className="text-xs font-normal text-primary underline underline-offset-2"
                    >
                      Wyczyść
                    </button>
                  )}
                </DropdownMenuLabel>
                {speciesOptions.map((species) => (
                  <DropdownMenuCheckboxItem
                    key={species.id}
                    checked={speciesFilterIds.has(species.id)}
                    onCheckedChange={() => onToggleSpeciesFilter(species.id)}
                  >
                    <FilterIcon />
                    {species.nameCommon}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuGroup>
            </>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuLabel className="flex items-center gap-1.5">
              <BatteryIcon className="size-3.5" />
              Oszczędzanie baterii {powerSaveActive && '(aktywne)'}
            </DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={powerSaveMode}
              onValueChange={(value) => onChangePowerSaveMode(value as PowerSaveMode)}
            >
              {(Object.keys(POWER_SAVE_MODE_LABELS) as PowerSaveMode[]).map((mode) => (
                <DropdownMenuRadioItem key={mode} value={mode}>
                  {POWER_SAVE_MODE_LABELS[mode]}
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
          <DropdownMenuCheckboxItem
            checked={isSeasonalOverlayEnabled}
            disabled={seasonalOverlayDisabled}
            onCheckedChange={onToggleSeasonalOverlay}
          >
            <SparklesIcon />
            {seasonalOverlayDisabled ? 'Nakładka sezonowości (brak historii)' : 'Nakładka sezonowości'}
          </DropdownMenuCheckboxItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => onOpenSheet('compass')}>
            <CompassIcon />
            Kompas
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onOpenSheet('szczecin-spots')}>
            <TreePineIcon />
            Szczecin i okolice
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onOpenSheet('offline-download')}>
            <DownloadIcon />
            Pobierz obszar offline
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
    </>
  )
}
