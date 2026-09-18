import { useMemo, useRef, useState } from 'react'
import { Circle, MapContainer, Marker, Polyline, Popup, TileLayer } from 'react-leaflet'
import { useLiveQuery } from 'dexie-react-hooks'
import L from 'leaflet'
import {
  candidateMarkerIcon,
  carMarkerIcon,
  spotMarkerIcon,
  szczecinSpotMarkerIcon,
  userLocationIcon,
} from '../../components/icons/mapMarkerIcons'
import { db } from '../../db/db'
import { szczecinSpots } from '../../data/szczecinSpots'
import { getMapLayer } from '../../data/mapLayers'
import speciesData from '../../data/species.json'
import type { Species, Spot } from '../../db/schema'
import { useActiveTrip } from '../../stores/useActiveTrip'
import { useAppStore } from '../../stores/appStore'
import { useSunsetCountdown } from '../../hooks/useSunsetCountdown'
import { useMushroomOutlook } from '../../hooks/useMushroomOutlook'
import { useMapGeolocation } from '../../hooks/useMapGeolocation'
import { useBatteryStatus } from '../../hooks/useBatteryStatus'
import { isPowerSaveActive } from '../../utils/powerSave'
import { useReturnPointTracking } from '../../hooks/useReturnPointTracking'
import { useSpotNavigation } from '../../hooks/useSpotNavigation'
import { useTripTrail } from '../../hooks/useTripTrail'
import { AddFindingForm } from './AddFindingForm'
import { OfflineAreaDownload } from './OfflineAreaDownload'
import { SpotManager } from './SpotManager'
import { SzczecinSpotsPanel } from './SzczecinSpotsPanel'
import { FindingMarkers, FindingsHeatmap, MapClickHandler, MapInstanceCapture, RecenterOnLocate } from './MapLayers'
import { MapStatusBadges } from './MapStatusBadges'
import { MapOverlayMessages } from './MapOverlayMessages'
import { MapToolbar } from './MapToolbar'
import { FindingsListView } from './FindingsListView'
import { CompassPanel } from './CompassPanel'
import { Skeleton } from '../../components/ui/skeleton'

// Apka jest kierowana do mieszkańców Szczecina i okolic (nie ogólnopolska) - domyślny widok przy
// pierwszym otwarciu (przed ustaleniem pozycji GPS) to od razu miasto, nie środek geograficzny
// całej Polski w oddaleniu, w którym Szczecin jest ledwo widoczny.
const DEFAULT_CENTER: [number, number] = [53.4285, 14.5528] // Szczecin
const DEFAULT_ZOOM = 11

// Apka jest wyłącznie dla Szczecina i okolic (patrz komentarz nad DEFAULT_CENTER) - reszta
// Polski/świata na mapie nie ma tu żadnej wartości, tylko utrudnia trafienie z powrotem w swój
// region po przypadkowym zbyt dalekim przewinięciu/oddaleniu. Granice z marginesem wokół woj.
// zachodniopomorskiego (nie ostro po granicy administracyjnej), żeby grzybiarz blisko granicy
// województwa nie odbijał się od ściany na terenie, w którym realnie może się poruszać.
const REGION_BOUNDS: [[number, number], [number, number]] = [
  [52.4, 13.9], // SW
  [54.85, 17.1], // NE
]
const REGION_MIN_ZOOM = 8

// GPS/geolokalizacja przeglądarki czasem zwraca pozycję daleko poza obszarem, którym w ogóle
// zajmuje się apka (np. IP-based fallback zamiast realnego GPS-a, brak sygnału w budynku).
// Wcześniej taka pozycja bezwarunkowo przesuwała mapę (RecenterOnLocate) - z aktywnym
// `maxBounds` wyglądało to jak zawieszenie się na ścianie granicy regionu, myląco (użytkownik
// widział mapę "skaczącą" w stronę np. Wrocławia, zamiast zostać na Szczecinie). Pozycja spoza
// regionu jest teraz ignorowana przy auto-centrowaniu - mapa zostaje na dotychczasowym widoku
// (domyślnie Szczecin/Niebuszewo), zamiast próbować pokazać miejsce, którego i tak nie umie
// wyświetlić.
function isInsideRegion([lat, lng]: [number, number]): boolean {
  const [[swLat, swLng], [neLat, neLng]] = REGION_BOUNDS
  return lat >= swLat && lat <= neLat && lng >= swLng && lng <= neLng
}

// Dokładnie jeden arkusz/drawer może być otwarty naraz - zastępuje 3 niezależne boolean-y
// (`showAddForm`/`showOfflineDownload`/`showSpotManager`), które nic nie stało na przeszkodzie,
// by były `true` jednocześnie (dwa nałożone Drawer/Sheet). Eksportowany, bo `MapToolbar`
// przyjmuje callback otwierający konkretny arkusz.
export type ActiveSheet = 'add-finding' | 'offline-download' | 'spots' | 'szczecin-spots' | 'compass' | null

export function MapView() {
  const [activeSheet, setActiveSheet] = useState<ActiveSheet>(null)
  const [pinPosition, setPinPosition] = useState<[number, number] | null>(null)
  const [isListView, setIsListView] = useState(false)
  const [isHeatmapView, setIsHeatmapView] = useState(false)
  // Pusty zbiór = pokaż wszystkie gatunki (brak filtra). Filtr lokalny do widoku mapy (nie w
  // appStore) - lista widoku (FindingsListView) ma własne wyszukiwanie tekstowe, a to jest
  // osobna potrzeba: szybkie odfiltrowanie mapy do 1-2 gatunków przy dużej liczbie znalezisk.
  const [speciesFilterIds, setSpeciesFilterIds] = useState<Set<string>>(new Set())
  const [tileLoadIssue, setTileLoadIssue] = useState(false)
  const mapRef = useRef<L.Map | null>(null)
  // Cel startowej pozycji `MapContainer` - trzymany w stanie (nie tylko jako stała), bo
  // "Pokaż na mapie" w SzczecinSpotsPanel musi też zadziałać z widoku listy, gdzie MapContainer
  // jest odmontowany i `mapRef.current` to jeszcze `null` w chwili kliknięcia (patrz niżej).
  const [mapTarget, setMapTarget] = useState<{ center: [number, number]; zoom: number }>({
    center: DEFAULT_CENTER,
    zoom: DEFAULT_ZOOM,
  })
  // Gdy "Pokaż na mapie" remountuje `MapContainer` (patrz `onShowOnMap` niżej), `RecenterOnLocate`
  // remountuje się razem z nim i jego efekt odpaliłby się od nowa z ostatnią znaną pozycją GPS,
  // po cichu nadpisując środek mapy właśnie ustawiony na wybrane grzybowisko - znaleziony przez
  // /code-review po commicie f28ba90. Ta flaga każe mu pominąć dokładnie jedno, najbliższe
  // odpalenie efektu po takim przejściu.
  const suppressNextRecenterRef = useRef(false)

  const findings = useLiveQuery(() => db.findings.toArray(), [])
  const spots = useLiveQuery(() => db.spots.toArray(), [])
  const { activeTripId, activeTrip } = useActiveTrip()
  const powerSaveMode = useAppStore((s) => s.powerSaveMode)
  const setPowerSaveMode = useAppStore((s) => s.setPowerSaveMode)
  const batteryStatus = useBatteryStatus()
  const powerSaveActive = isPowerSaveActive(powerSaveMode, batteryStatus)
  const { userPosition, userAccuracyMeters, recenterTarget, locateError, isPositionStale, handleLocate, clearLocateError, reportError } =
    useMapGeolocation(powerSaveActive)
  const sunsetCountdown = useSunsetCountdown(userPosition)
  const mushroomOutlook = useMushroomOutlook(userPosition)
  // Błędy zapisu punktu powrotu (np. `getCurrentPosition()` w `handleSaveReturnPoint`) trafiają
  // do tego samego stosu komunikatów co błędy GPS przez `reportError` - jeden priorytetowy
  // komunikat w rogu mapy, nie dwa niezależne źródła prawdy.
  const { returnPoint, returnPointInfo, handleSaveReturnPoint, clearReturnPoint } = useReturnPointTracking(
    userPosition,
    reportError,
  )
  const { navigationTargetSpot, navigationInfo, setNavigationTargetSpotId, clearNavigationTarget } =
    useSpotNavigation(userPosition, spots)
  const { trailPoints } = useTripTrail(activeTripId, userPosition, powerSaveActive ? 50 : undefined)
  const mapLayerId = useAppStore((s) => s.mapLayerId)
  const setMapLayerId = useAppStore((s) => s.setMapLayerId)
  const activeMapLayer = getMapLayer(mapLayerId)

  const findingPosition = pinPosition ?? userPosition

  const speciesById = useMemo(() => new Map((speciesData as Species[]).map((s) => [s.id, s])), [])
  // Tylko gatunki faktycznie obecne wśród znalezisk trafiają do listy filtra - lista wszystkich
  // 19 gatunków z atlasu byłaby w większości pusta dla typowego użytkownika.
  const presentSpeciesOptions = useMemo(() => {
    const ids = new Set((findings ?? []).map((f) => f.speciesId).filter((id): id is string => id != null))
    return Array.from(ids)
      .map((id) => speciesById.get(id))
      .filter((s): s is Species => s != null)
      .sort((a, b) => a.nameCommon.localeCompare(b.nameCommon, 'pl'))
  }, [findings, speciesById])
  const filteredFindings = useMemo(() => {
    if (speciesFilterIds.size === 0) return findings
    return findings?.filter((f) => f.speciesId != null && speciesFilterIds.has(f.speciesId))
  }, [findings, speciesFilterIds])

  return (
    <div className="relative z-0 h-full w-full">
      {isListView ? (
        <FindingsListView findings={filteredFindings ?? []} spots={spots ?? []} userPosition={userPosition} />
      ) : (
        <MapContainer
          center={mapTarget.center}
          zoom={mapTarget.zoom}
          className="h-full w-full"
          maxBounds={REGION_BOUNDS}
          maxBoundsViscosity={1}
          minZoom={REGION_MIN_ZOOM}
        >
          <TileLayer
            key={activeMapLayer.id}
            attribution={activeMapLayer.attribution}
            url={activeMapLayer.urlTemplate}
            maxZoom={activeMapLayer.maxZoom}
            eventHandlers={{
              tileerror: () => {
                if (!navigator.onLine) setTileLoadIssue(true)
              },
              // Kafle mapy zaczęły znowu ładować się poprawnie (np. użytkownik wjechał w obszar
              // z cache) - dotąd `tileLoadIssue` znikał tylko po ręcznym "Rozumiem", mimo że
              // problem mógł już minąć.
              tileload: () => setTileLoadIssue(false),
            }}
          />
          <RecenterOnLocate
            position={recenterTarget && isInsideRegion(recenterTarget) ? recenterTarget : null}
            suppressNextRef={suppressNextRecenterRef}
          />
          <MapClickHandler enabled={activeSheet === null} onPick={setPinPosition} />
          <MapInstanceCapture
            onReady={(map) => {
              mapRef.current = map
            }}
          />
          {trailPoints.length > 1 && (
            <Polyline
              positions={trailPoints}
              pathOptions={{ color: 'var(--color-primary)', weight: 3, opacity: 0.7 }}
            />
          )}
          {userPosition && (
            <>
              {userAccuracyMeters != null && (
                <Circle
                  center={userPosition}
                  radius={userAccuracyMeters}
                  pathOptions={{ color: 'var(--color-primary)', weight: 1, fillOpacity: 0.1 }}
                />
              )}
              <Marker
                position={userPosition}
                icon={userLocationIcon}
                opacity={isPositionStale ? 0.45 : 1}
              >
                <Popup>
                  Twoja pozycja
                  {userAccuracyMeters != null && ` (dokładność ±${Math.round(userAccuracyMeters)} m)`}
                  {isPositionStale && ' — sygnał GPS mógł zostać utracony, pozycja może być nieaktualna.'}
                </Popup>
              </Marker>
            </>
          )}
          {pinPosition && (
            <Marker position={pinPosition} icon={candidateMarkerIcon}>
              <Popup>Wybrane miejsce znaleziska</Popup>
            </Marker>
          )}
          {returnPoint && (
            <Marker position={[returnPoint.latitude, returnPoint.longitude]} icon={carMarkerIcon}>
              <Popup>Zapisana pozycja auta</Popup>
            </Marker>
          )}
          {spots?.map((spot: Spot) => (
            <Marker key={spot.id} position={[spot.latitude, spot.longitude]} icon={spotMarkerIcon}>
              <Popup>
                <div className="text-sm">
                  <p className="font-semibold">{spot.name}</p>
                  {spot.notes && <p className="mt-1">{spot.notes}</p>}
                  <button
                    type="button"
                    onClick={() => setNavigationTargetSpotId(navigationTargetSpot?.id === spot.id ? null : spot.id!)}
                    className="mt-1.5 text-xs font-medium text-primary underline underline-offset-2"
                  >
                    {navigationTargetSpot?.id === spot.id ? 'Zakończ nawigację' : 'Nawiguj tutaj'}
                  </button>
                </div>
              </Popup>
            </Marker>
          ))}
          {filteredFindings &&
            (isHeatmapView ? (
              <FindingsHeatmap findings={filteredFindings} />
            ) : (
              <FindingMarkers findings={filteredFindings} />
            ))}
          {/* Kuratorowane grzybowiska "Szczecin i okolice" - zawsze widoczne na mapie (nie tylko
              przy otwartym SzczecinSpotsPanel), tak jak spoty użytkownika wyżej - to statyczna,
              mała lista (6 pozycji), więc brak sensu chować ją za dodatkowym przełącznikiem. */}
          {szczecinSpots.map((spot) => (
            <Marker key={spot.id} position={[spot.latitude, spot.longitude]} icon={szczecinSpotMarkerIcon}>
              <Popup>
                <div className="text-sm">
                  <p className="font-semibold">{spot.name}</p>
                  <p className="mt-1">{spot.description}</p>
                  <a href={spot.sourceUrl} target="_blank" rel="noreferrer" className="mt-1 block text-xs underline">
                    Źródło: {spot.sourceLabel}
                  </a>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      )}

      {findings === undefined && !isListView && (
        <div className="absolute inset-0 z-[999] flex flex-col items-center justify-center gap-2 bg-background/80">
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-3 w-32" />
        </div>
      )}

      {!isListView && (
        <MapStatusBadges
          activeTripName={activeTrip?.name ?? null}
          sunsetCountdown={sunsetCountdown}
          mushroomOutlook={mushroomOutlook}
          returnPoint={returnPoint}
          returnPointInfo={returnPointInfo}
          onClearReturnPoint={clearReturnPoint}
          navigationTargetSpot={navigationTargetSpot}
          navigationInfo={navigationInfo}
          onClearNavigationTarget={clearNavigationTarget}
          powerSaveActive={powerSaveActive}
          batteryLevel={batteryStatus?.level ?? null}
          isPositionStale={isPositionStale}
        />
      )}

      <div className="absolute bottom-4 right-4 z-[1000] flex flex-col items-end gap-2">
        {!isListView && (
          <MapOverlayMessages
            tileLoadIssue={tileLoadIssue}
            onDismissTileLoadIssue={() => setTileLoadIssue(false)}
            locateError={locateError}
            onDismissLocateError={clearLocateError}
            showPinHint={!pinPosition}
          />
        )}
        <MapToolbar
          userPosition={userPosition}
          hasReturnPoint={returnPoint != null}
          isListView={isListView}
          onToggleListView={() => setIsListView((v) => !v)}
          onLocate={() => {
            // "Zlokalizuj mnie" na pozycji spoza regionu apki cicho nic by nie zrobił (patrz
            // `isInsideRegion` wyżej) - bez komunikatu wyglądałoby to jak zawieszony przycisk,
            // więc tu jedyne miejsce, gdzie warto o tym jawnie poinformować (auto-recentrowanie
            // przy GPS-owym ticku ma zostać ciche, żeby nie zasypywać komunikatami w terenie).
            if (userPosition && !isInsideRegion(userPosition)) {
              reportError('Twoja pozycja jest poza obszarem Szczecina i okolic - mapa pokazuje tylko ten region.')
              return
            }
            handleLocate()
          }}
          onOpenSheet={setActiveSheet}
          onSaveReturnPoint={handleSaveReturnPoint}
          onAddFinding={() => setActiveSheet('add-finding')}
          mapLayerId={mapLayerId}
          onChangeMapLayer={setMapLayerId}
          findingsCount={filteredFindings?.length ?? 0}
          isHeatmapView={isHeatmapView}
          onToggleHeatmapView={() => setIsHeatmapView((v) => !v)}
          speciesOptions={presentSpeciesOptions}
          speciesFilterIds={speciesFilterIds}
          onToggleSpeciesFilter={(id) =>
            setSpeciesFilterIds((prev) => {
              const next = new Set(prev)
              if (next.has(id)) next.delete(id)
              else next.add(id)
              return next
            })
          }
          onClearSpeciesFilter={() => setSpeciesFilterIds(new Set())}
          powerSaveMode={powerSaveMode}
          onChangePowerSaveMode={setPowerSaveMode}
          powerSaveActive={powerSaveActive}
        />
      </div>

      {activeSheet === 'add-finding' && (
        <AddFindingForm
          initialPosition={findingPosition}
          onClose={(saved) => {
            setActiveSheet(null)
            if (saved) setPinPosition(null)
          }}
        />
      )}

      <OfflineAreaDownload
        open={activeSheet === 'offline-download'}
        onOpenChange={(open) => setActiveSheet(open ? 'offline-download' : null)}
        getCenter={() => {
          const center = mapRef.current?.getCenter()
          return center ? [center.lat, center.lng] : null
        }}
        activeLayer={activeMapLayer}
      />

      <SpotManager
        open={activeSheet === 'spots'}
        onOpenChange={(open) => setActiveSheet(open ? 'spots' : null)}
        pinPosition={pinPosition}
        navigationTargetSpotId={navigationTargetSpot?.id ?? null}
        onSetNavigationTargetSpotId={setNavigationTargetSpotId}
      />

      <SzczecinSpotsPanel
        open={activeSheet === 'szczecin-spots'}
        onOpenChange={(open) => setActiveSheet(open ? 'szczecin-spots' : null)}
        onShowOnMap={(position) => {
          // Tylko z widoku listy MapContainer faktycznie remountuje się (i razem z nim
          // RecenterOnLocate) - tylko wtedy grozi nadpisanie świeżo ustawionego celu ostatnią
          // pozycją GPS, więc tylko wtedy zbrojona jest flaga tłumiąca to jedno odpalenie efektu.
          // Gdy mapa już jest widoczna, MapContainer się nie remountuje (zmiana center/zoom w
          // propsach po zamontowaniu nic nie robi w react-leaflet), więc efekt się nie odpali.
          if (isListView) suppressNextRecenterRef.current = true
          setIsListView(false)
          // Z widoku listy MapContainer jest odmontowany, więc mapRef.current jest jeszcze `null`
          // w tej klatce - setView wtedy cicho by nic nie zrobił. mapTarget zapewnia poprawną
          // pozycję startową przy (re)montowaniu; setView obsługuje przypadek gdy mapa już żyje.
          setMapTarget({ center: position, zoom: 13 })
          mapRef.current?.setView(position, 13)
        }}
      />

      <CompassPanel
        open={activeSheet === 'compass'}
        onOpenChange={(open) => setActiveSheet(open ? 'compass' : null)}
        isPositionStale={isPositionStale}
        targets={[
          ...(returnPointInfo ? [{ label: 'Auto', ...returnPointInfo }] : []),
          ...(navigationTargetSpot && navigationInfo
            ? [{ label: navigationTargetSpot.name, ...navigationInfo }]
            : []),
        ]}
      />
    </div>
  )
}
