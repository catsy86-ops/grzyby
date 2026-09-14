import { useEffect, useMemo, useRef, useState } from 'react'
import { Circle, MapContainer, Marker, Popup, TileLayer, useMap, useMapEvent } from 'react-leaflet'
import { useLiveQuery } from 'dexie-react-hooks'
import { AnimatePresence, motion } from 'motion/react'
import L from 'leaflet'
import { CarIcon, MapPinnedIcon, SunsetIcon, XIcon } from 'lucide-react'
import { db } from '../../db/db'
import type { Finding, Spot } from '../../db/schema'
import { useAppStore } from '../../stores/appStore'
import { clusterFindings } from '../../utils/clusterFindings'
import { formatDistance, getBearingDegrees, getCardinalDirection, getDistanceMeters } from '../../utils/bearing'
import { getCurrentPosition, watchPosition } from '../../utils/geolocation'
import { useActiveTrip } from '../../stores/useActiveTrip'
import { useSunsetCountdown } from '../../hooks/useSunsetCountdown'
import { AddFindingForm } from './AddFindingForm'
import { OfflineAreaDownload } from './OfflineAreaDownload'
import { SpotManager } from './SpotManager'
import { Alert, AlertDescription } from '../../components/ui/alert'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Skeleton } from '../../components/ui/skeleton'

import iconUrl from 'leaflet/dist/images/marker-icon.png'
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png'
import shadowUrl from 'leaflet/dist/images/marker-shadow.png'

const defaultIcon = L.icon({
  iconUrl,
  iconRetinaUrl,
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
})

const pinIcon = L.icon({
  iconUrl,
  iconRetinaUrl,
  shadowUrl,
  iconSize: [30, 49],
  iconAnchor: [15, 49],
  popupAnchor: [1, -40],
  className: 'hue-rotate-90', // wizualnie odróżnia wybrany pinezkę od pozycji użytkownika
})

const carIcon = L.divIcon({
  html: `<div class="flex size-8 items-center justify-center rounded-full border-2 border-white bg-foreground text-background shadow">🚗</div>`,
  className: '',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
})

const spotIcon = L.divIcon({
  html: `<div class="flex size-8 items-center justify-center rounded-full border-2 border-white bg-amber-600 text-white shadow">📍</div>`,
  className: '',
  iconSize: [32, 32],
  iconAnchor: [16, 28],
})

const DEFAULT_CENTER: [number, number] = [52.0693, 19.4803] // środek Polski

// Promień grupowania znalezisk w piksele ekranu - stały wizualny sens niezależnie od zoomu
// (patrz utils/clusterFindings.ts). Przy dużej historii zbiorów bez tego mapa renderowałaby
// setki nakładających się pinezek.
const CLUSTER_DISTANCE_PX = 48

function createClusterIcon(count: number) {
  return L.divIcon({
    html: `<div class="flex size-9 items-center justify-center rounded-full border-2 border-white bg-primary text-xs font-bold text-primary-foreground shadow">${count}</div>`,
    className: '',
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  })
}

function FindingMarkers({ findings }: { findings: Finding[] }) {
  const map = useMap()
  const [zoom, setZoom] = useState(() => map.getZoom())
  useMapEvent('zoomend', () => setZoom(map.getZoom()))

  const points = useMemo(
    () =>
      findings
        .filter((f) => f.id != null && f.latitude != null && f.longitude != null)
        .map((f) => ({ id: f.id!, lat: f.latitude!, lng: f.longitude! })),
    [findings],
  )

  const clusters = useMemo(
    () => clusterFindings(points, (lat, lng) => map.project([lat, lng], zoom), CLUSTER_DISTANCE_PX),
    [points, map, zoom],
  )

  return (
    <>
      {clusters.map((cluster) => {
        if (cluster.points.length === 1) {
          const finding = findings.find((f) => f.id === cluster.points[0].id)
          if (!finding) return null
          return (
            <Marker key={finding.id} position={[cluster.lat, cluster.lng]} icon={defaultIcon}>
              <Popup>
                <div className="text-sm">
                  <p className="font-semibold">{finding.speciesNameGuess ?? 'Nieokreślony gatunek'}</p>
                  <p>{new Date(finding.createdAt).toLocaleDateString('pl-PL')}</p>
                  {finding.notes && <p className="mt-1">{finding.notes}</p>}
                </div>
              </Popup>
            </Marker>
          )
        }
        const clusterKey = cluster.points
          .map((p) => p.id)
          .sort((a, b) => a - b)
          .join('-')
        return (
          <Marker
            key={`cluster-${clusterKey}`}
            position={[cluster.lat, cluster.lng]}
            icon={createClusterIcon(cluster.points.length)}
            eventHandlers={{
              click: () => map.setView([cluster.lat, cluster.lng], Math.min(zoom + 2, map.getMaxZoom() || zoom + 2)),
            }}
          />
        )
      })}
    </>
  )
}

function RecenterOnLocate({ position }: { position: [number, number] | null }) {
  const map = useMap()
  useEffect(() => {
    if (position) {
      map.setView(position, 14)
    }
  }, [position, map])
  return null
}

function MapClickHandler({
  enabled,
  onPick,
}: {
  enabled: boolean
  onPick: (position: [number, number]) => void
}) {
  useMapEvent('click', (event) => {
    if (!enabled) return
    onPick([event.latlng.lat, event.latlng.lng])
  })
  return null
}

function MapInstanceCapture({ onReady }: { onReady: (map: L.Map) => void }) {
  const map = useMap()
  useEffect(() => {
    onReady(map)
  }, [map, onReady])
  return null
}

export function MapView() {
  const [userPosition, setUserPosition] = useState<[number, number] | null>(null)
  const [userAccuracyMeters, setUserAccuracyMeters] = useState<number | null>(null)
  // Cel ponownego wyśrodkowania mapy - celowo OSOBNY stan od `userPosition`: ten drugi aktualizuje
  // się kilka razy na sekundę z ciągłego GPS (watchPosition) i przenoszenie widoku mapy przy
  // każdym mikro-skoku współrzędnych byłoby irytujące, gdy użytkownik w tym czasie przegląda mapę.
  const [recenterTarget, setRecenterTarget] = useState<[number, number] | null>(null)
  const [pinPosition, setPinPosition] = useState<[number, number] | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [showOfflineDownload, setShowOfflineDownload] = useState(false)
  const [showSpotManager, setShowSpotManager] = useState(false)
  const [locateError, setLocateError] = useState<string | null>(null)
  const [tileLoadIssue, setTileLoadIssue] = useState(false)
  const mapRef = useRef<L.Map | null>(null)

  const findings = useLiveQuery(() => db.findings.toArray(), [])
  const spots = useLiveQuery(() => db.spots.toArray(), [])
  const { activeTrip } = useActiveTrip()
  const sunsetCountdown = useSunsetCountdown(userPosition)
  const returnPoint = useAppStore((s) => s.returnPoint)
  const setReturnPoint = useAppStore((s) => s.setReturnPoint)

  // Ciągłe śledzenie GPS (watchPosition) zamiast jednorazowego odpytania - pierwszy odczyt z
  // odbiornika bywa niedokładny, kolejne z tego samego strumienia szybko się poprawiają, a
  // użytkownik w ruchu (np. wracając przez las) widzi aktualizującą się pozycję bez ręcznego
  // odświeżania. Mapa centruje się automatycznie tylko przy pierwszym odczycie po wejściu na
  // zakładkę - kolejne aktualizacje przesuwają tylko marker/koło dokładności.
  useEffect(() => {
    let hasCenteredOnFirstFix = false
    const stopWatching = watchPosition(
      (position) => {
        const next: [number, number] = [position.latitude, position.longitude]
        setUserPosition(next)
        setUserAccuracyMeters(position.accuracyMeters)
        setLocateError(null)
        if (!hasCenteredOnFirstFix) {
          hasCenteredOnFirstFix = true
          setRecenterTarget(next)
        }
      },
      (message) => setLocateError(message),
    )
    return stopWatching
  }, [])

  function handleLocate() {
    setLocateError(null)
    if (userPosition) setRecenterTarget([userPosition[0], userPosition[1]])
  }

  async function handleSaveReturnPoint() {
    setLocateError(null)
    try {
      const coords = userPosition
        ? { latitude: userPosition[0], longitude: userPosition[1] }
        : await getCurrentPosition()
      setReturnPoint({ latitude: coords.latitude, longitude: coords.longitude, savedAt: Date.now() })
    } catch (error) {
      setLocateError(error instanceof Error ? error.message : 'Nie udało się ustalić lokalizacji')
    }
  }

  // Dystans/kierunek liczone wyłącznie z GPS (patrz utils/bearing.ts) - odświeżają się same przy
  // każdej aktualizacji userPosition (np. po "Zlokalizuj mnie" w trakcie powrotu przez las).
  const returnPointInfo = useMemo(() => {
    if (!returnPoint || !userPosition) return null
    const returnPosition: [number, number] = [returnPoint.latitude, returnPoint.longitude]
    return {
      distanceMeters: getDistanceMeters(userPosition, returnPosition),
      bearingDegrees: getBearingDegrees(userPosition, returnPosition),
    }
  }, [returnPoint, userPosition])

  const findingPosition = pinPosition ?? userPosition

  return (
    // z-0 tworzy nowy kontekst stackingu, żeby wewnętrzne z-[1000] (potrzebne, by przebić kontrolki
    // Leaflet) nie "wyciekały" ponad elementy portalowane do body poza tym drzewem (Drawer/Dialog).
    <div className="relative z-0 h-full w-full">
      <MapContainer center={DEFAULT_CENTER} zoom={6} className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://maps.wikimedia.org/osm-intl/{z}/{x}/{y}.png"
          maxZoom={19}
          eventHandlers={{
            tileerror: () => {
              if (!navigator.onLine) setTileLoadIssue(true)
            },
          }}
        />
        <RecenterOnLocate position={recenterTarget} />
        <MapClickHandler enabled={!showAddForm} onPick={setPinPosition} />
        <MapInstanceCapture onReady={(map) => { mapRef.current = map }} />
        {userPosition && (
          <>
            {userAccuracyMeters != null && (
              <Circle
                center={userPosition}
                radius={userAccuracyMeters}
                pathOptions={{ color: 'var(--color-primary)', weight: 1, fillOpacity: 0.1 }}
              />
            )}
            <Marker position={userPosition} icon={defaultIcon}>
              <Popup>
                Twoja pozycja
                {userAccuracyMeters != null && ` (dokładność ±${Math.round(userAccuracyMeters)} m)`}
              </Popup>
            </Marker>
          </>
        )}
        {pinPosition && (
          <Marker position={pinPosition} icon={pinIcon}>
            <Popup>Wybrane miejsce znaleziska</Popup>
          </Marker>
        )}
        {returnPoint && (
          <Marker position={[returnPoint.latitude, returnPoint.longitude]} icon={carIcon}>
            <Popup>Zapisana pozycja auta</Popup>
          </Marker>
        )}
        {spots?.map((spot: Spot) => (
          <Marker key={spot.id} position={[spot.latitude, spot.longitude]} icon={spotIcon}>
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

      {findings === undefined && (
        <div className="absolute inset-0 z-[999] flex flex-col items-center justify-center gap-2 bg-background/80">
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-3 w-32" />
        </div>
      )}

      <div className="absolute left-4 top-4 z-[1000] flex flex-col items-start gap-2">
        <AnimatePresence>
          {activeTrip && (
            <motion.div
              key="active-trip-badge"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
            >
              <Badge className="px-3 py-1.5 text-xs shadow">🥾 Aktywna wyprawa: {activeTrip.name}</Badge>
            </motion.div>
          )}
          {sunsetCountdown && (
            <motion.div
              key="sunset-countdown-badge"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
            >
              <Badge
                variant={sunsetCountdown.isUrgent ? 'destructive-solid' : 'secondary'}
                className="gap-1.5 px-3 py-1.5 text-xs shadow"
              >
                <SunsetIcon className="size-3.5" />
                Zmrok za {sunsetCountdown.label}
              </Badge>
            </motion.div>
          )}
          {returnPoint && (
            <motion.div
              key="return-point-badge"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
            >
              <Badge variant="secondary" className="gap-1.5 py-1.5 pl-3 pr-1.5 text-xs shadow">
                <CarIcon className="size-3.5" />
                {returnPointInfo
                  ? `Auto: ${formatDistance(returnPointInfo.distanceMeters)} ${getCardinalDirection(returnPointInfo.bearingDegrees)}`
                  : 'Auto zapisane'}
                <button
                  type="button"
                  onClick={() => setReturnPoint(null)}
                  aria-label="Usuń zapisaną pozycję auta"
                  className="ml-0.5 flex size-4 items-center justify-center rounded-full outline-none hover:bg-foreground/10 focus-visible:ring-2 focus-visible:ring-ring/50"
                >
                  <XIcon className="size-3" />
                </button>
              </Badge>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="absolute bottom-4 right-4 z-[1000] flex flex-col items-end gap-2">
        <AnimatePresence>
          {tileLoadIssue && (
            <motion.div
              key="tile-load-issue"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.18 }}
            >
              <Alert variant="destructive-soft" className="max-w-56 shadow">
                <AlertDescription className="text-current">
                  Brak zapisanych kafelków mapy dla tego obszaru offline. Pobierz obszar będąc online.
                </AlertDescription>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-1 h-auto p-0 text-xs underline"
                  onClick={() => setTileLoadIssue(false)}
                >
                  Rozumiem
                </Button>
              </Alert>
            </motion.div>
          )}
          {locateError && (
            <motion.div
              key="locate-error"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.18 }}
            >
              <Alert variant="destructive-soft" className="max-w-56 shadow">
                <AlertDescription className="text-current">{locateError}</AlertDescription>
              </Alert>
            </motion.div>
          )}
          {!pinPosition && (
            <motion.p
              key="pin-hint"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.18 }}
              className="max-w-56 rounded bg-card/90 p-2 text-xs text-muted-foreground shadow"
            >
              Stuknij na mapie, aby wybrać dokładne miejsce znaleziska (domyślnie Twoja pozycja)
            </motion.p>
          )}
        </AnimatePresence>
        <Button
          variant="secondary"
          className="rounded-full shadow"
          onClick={() => setShowOfflineDownload(true)}
        >
          Pobierz obszar offline
        </Button>
        <Button variant="secondary" className="rounded-full shadow" onClick={() => setShowSpotManager(true)}>
          <MapPinnedIcon className="size-4" />
          Grzybowiska
        </Button>
        <Button variant="secondary" className="rounded-full shadow" onClick={handleSaveReturnPoint}>
          <CarIcon className="size-4" />
          {returnPoint ? 'Zaktualizuj pozycję auta' : 'Zapisz pozycję auta'}
        </Button>
        <Button variant="secondary" className="rounded-full shadow" onClick={handleLocate}>
          Zlokalizuj mnie
        </Button>
        <Button className="rounded-full shadow" onClick={() => setShowAddForm(true)}>
          + Dodaj znalezisko
        </Button>
      </div>

      {showAddForm && (
        <AddFindingForm
          initialPosition={findingPosition}
          onClose={(saved) => {
            setShowAddForm(false)
            if (saved) setPinPosition(null)
          }}
        />
      )}

      <OfflineAreaDownload
        open={showOfflineDownload}
        onOpenChange={setShowOfflineDownload}
        getCenter={() => {
          const center = mapRef.current?.getCenter()
          return center ? [center.lat, center.lng] : null
        }}
      />

      <SpotManager open={showSpotManager} onOpenChange={setShowSpotManager} pinPosition={pinPosition} />
    </div>
  )
}
