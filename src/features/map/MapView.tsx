import { useRef, useState } from 'react'
import { Circle, MapContainer, Marker, Popup, TileLayer } from 'react-leaflet'
import { useLiveQuery } from 'dexie-react-hooks'
import L from 'leaflet'
import { candidateMarkerIcon, carMarkerIcon, spotMarkerIcon, userLocationIcon } from '../../components/icons/mapMarkerIcons'
import { db } from '../../db/db'
import type { Spot } from '../../db/schema'
import { useActiveTrip } from '../../stores/useActiveTrip'
import { useSunsetCountdown } from '../../hooks/useSunsetCountdown'
import { useMushroomOutlook } from '../../hooks/useMushroomOutlook'
import { useMapGeolocation } from '../../hooks/useMapGeolocation'
import { useReturnPointTracking } from '../../hooks/useReturnPointTracking'
import { AddFindingForm } from './AddFindingForm'
import { OfflineAreaDownload } from './OfflineAreaDownload'
import { SpotManager } from './SpotManager'
import { FindingMarkers, MapClickHandler, MapInstanceCapture, RecenterOnLocate } from './MapLayers'
import { MapStatusBadges } from './MapStatusBadges'
import { MapOverlayMessages } from './MapOverlayMessages'
import { MapToolbar } from './MapToolbar'
import { FindingsListView } from './FindingsListView'
import { Skeleton } from '../../components/ui/skeleton'

const DEFAULT_CENTER: [number, number] = [52.0693, 19.4803] // środek Polski

// Dokładnie jeden arkusz/drawer może być otwarty naraz - zastępuje 3 niezależne boolean-y
// (`showAddForm`/`showOfflineDownload`/`showSpotManager`), które nic nie stało na przeszkodzie,
// by były `true` jednocześnie (dwa nałożone Drawer/Sheet). Eksportowany, bo `MapToolbar`
// przyjmuje callback otwierający konkretny arkusz.
export type ActiveSheet = 'add-finding' | 'offline-download' | 'spots' | null

export function MapView() {
  const [activeSheet, setActiveSheet] = useState<ActiveSheet>(null)
  const [pinPosition, setPinPosition] = useState<[number, number] | null>(null)
  const [isListView, setIsListView] = useState(false)
  const [tileLoadIssue, setTileLoadIssue] = useState(false)
  const mapRef = useRef<L.Map | null>(null)

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
        <MapContainer center={DEFAULT_CENTER} zoom={6} className="h-full w-full">
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
    </div>
  )
}
