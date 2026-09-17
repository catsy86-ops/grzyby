import { useRef, useState } from 'react'
import { Circle, MapContainer, Marker, Popup, TileLayer } from 'react-leaflet'
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
import type { Spot } from '../../db/schema'
import { useActiveTrip } from '../../stores/useActiveTrip'
import { useSunsetCountdown } from '../../hooks/useSunsetCountdown'
import { useMushroomOutlook } from '../../hooks/useMushroomOutlook'
import { useMapGeolocation } from '../../hooks/useMapGeolocation'
import { useReturnPointTracking } from '../../hooks/useReturnPointTracking'
import { AddFindingForm } from './AddFindingForm'
import { OfflineAreaDownload } from './OfflineAreaDownload'
import { SpotManager } from './SpotManager'
import { SzczecinSpotsPanel } from './SzczecinSpotsPanel'
import { FindingMarkers, MapClickHandler, MapInstanceCapture, RecenterOnLocate } from './MapLayers'
import { MapStatusBadges } from './MapStatusBadges'
import { MapOverlayMessages } from './MapOverlayMessages'
import { MapToolbar } from './MapToolbar'
import { FindingsListView } from './FindingsListView'
import { Skeleton } from '../../components/ui/skeleton'

// Apka jest kierowana do mieszkańców Szczecina i okolic (nie ogólnopolska) - domyślny widok przy
// pierwszym otwarciu (przed ustaleniem pozycji GPS) to od razu miasto, nie środek geograficzny
// całej Polski w oddaleniu, w którym Szczecin jest ledwo widoczny.
const DEFAULT_CENTER: [number, number] = [53.4285, 14.5528] // Szczecin
const DEFAULT_ZOOM = 11

// Dokładnie jeden arkusz/drawer może być otwarty naraz - zastępuje 3 niezależne boolean-y
// (`showAddForm`/`showOfflineDownload`/`showSpotManager`), które nic nie stało na przeszkodzie,
// by były `true` jednocześnie (dwa nałożone Drawer/Sheet). Eksportowany, bo `MapToolbar`
// przyjmuje callback otwierający konkretny arkusz.
export type ActiveSheet = 'add-finding' | 'offline-download' | 'spots' | 'szczecin-spots' | null

export function MapView() {
  const [activeSheet, setActiveSheet] = useState<ActiveSheet>(null)
  const [pinPosition, setPinPosition] = useState<[number, number] | null>(null)
  const [isListView, setIsListView] = useState(false)
  const [tileLoadIssue, setTileLoadIssue] = useState(false)
  const mapRef = useRef<L.Map | null>(null)
  // Cel startowej pozycji `MapContainer` - trzymany w stanie (nie tylko jako stała), bo
  // "Pokaż na mapie" w SzczecinSpotsPanel musi też zadziałać z widoku listy, gdzie MapContainer
  // jest odmontowany i `mapRef.current` to jeszcze `null` w chwili kliknięcia (patrz niżej).
  const [mapTarget, setMapTarget] = useState<{ center: [number, number]; zoom: number }>({
    center: DEFAULT_CENTER,
    zoom: DEFAULT_ZOOM,
  })

  const findings = useLiveQuery(() => db.findings.toArray(), [])
  const spots = useLiveQuery(() => db.spots.toArray(), [])
  const { activeTrip } = useActiveTrip()
  const { userPosition, userAccuracyMeters, recenterTarget, locateError, isPositionStale, handleLocate, clearLocateError, reportError } =
    useMapGeolocation()
  const sunsetCountdown = useSunsetCountdown(userPosition)
  const mushroomOutlook = useMushroomOutlook(userPosition)
  // Błędy zapisu punktu powrotu (np. `getCurrentPosition()` w `handleSaveReturnPoint`) trafiają
  // do tego samego stosu komunikatów co błędy GPS przez `reportError` - jeden priorytetowy
  // komunikat w rogu mapy, nie dwa niezależne źródła prawdy.
  const { returnPoint, returnPointInfo, handleSaveReturnPoint, clearReturnPoint } = useReturnPointTracking(
    userPosition,
    reportError,
  )

  const findingPosition = pinPosition ?? userPosition

  return (
    <div className="relative z-0 h-full w-full">
      {isListView ? (
        <FindingsListView findings={findings ?? []} spots={spots ?? []} userPosition={userPosition} />
      ) : (
        <MapContainer center={mapTarget.center} zoom={mapTarget.zoom} className="h-full w-full">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
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
          <RecenterOnLocate position={recenterTarget} />
          <MapClickHandler enabled={activeSheet === null} onPick={setPinPosition} />
          <MapInstanceCapture
            onReady={(map) => {
              mapRef.current = map
            }}
          />
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
                </div>
              </Popup>
            </Marker>
          ))}
          {findings && <FindingMarkers findings={findings} />}
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
          onLocate={handleLocate}
          onOpenSheet={setActiveSheet}
          onSaveReturnPoint={handleSaveReturnPoint}
          onAddFinding={() => setActiveSheet('add-finding')}
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
      />

      <SpotManager
        open={activeSheet === 'spots'}
        onOpenChange={(open) => setActiveSheet(open ? 'spots' : null)}
        pinPosition={pinPosition}
      />

      <SzczecinSpotsPanel
        open={activeSheet === 'szczecin-spots'}
        onOpenChange={(open) => setActiveSheet(open ? 'szczecin-spots' : null)}
        onShowOnMap={(position) => {
          setIsListView(false)
          // Z widoku listy MapContainer jest odmontowany, więc mapRef.current jest jeszcze `null`
          // w tej klatce - setView wtedy cicho by nic nie zrobił. mapTarget zapewnia poprawną
          // pozycję startową przy (re)montowaniu; setView obsługuje przypadek gdy mapa już żyje.
          setMapTarget({ center: position, zoom: 13 })
          mapRef.current?.setView(position, 13)
        }}
      />
    </div>
  )
}
