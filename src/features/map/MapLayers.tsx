import { memo, useEffect, useMemo, useState } from 'react'
import { Marker, Popup, useMap, useMapEvent } from 'react-leaflet'
import type L from 'leaflet'
import { createClusterIcon, findingMarkerIconFor } from '../../components/icons/mapMarkerIcons'
import { EdibilityBadge } from '../../components/EdibilityBadge'
import speciesData from '../../data/species.json'
import type { Finding, Species } from '../../db/schema'
import type { Position } from '../../utils/bearing'
import { clusterFindings } from '../../utils/clusterFindings'
import { formatDate } from '../../utils/formatDate'

// Komponenty tego pliku to jedyna część feature'u Mapy realnie zależna od `useMap()`/
// `MapContainer` (wydzielone z MapView.tsx, Faza 19) - oddzielenie ich od reszty stanu/logiki
// zmniejsza powierzchnię, która wymaga środowiska testowego z Leaflet.

// Promień grupowania znalezisk w piksele ekranu - stały wizualny sens niezależnie od zoomu
// (patrz utils/clusterFindings.ts). Przy dużej historii zbiorów bez tego mapa renderowałaby
// setki nakładających się pinezek.
const CLUSTER_DISTANCE_PX = 48

const speciesById = new Map((speciesData as Species[]).map((s) => [s.id, s]))

function FindingMarkersImpl({ findings }: { findings: Finding[] }) {
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

  // Odzyskanie pełnego obiektu Finding po id z tablicy przez `.find()` w renderze klastrów
  // byłoby O(liczba_widocznych_singli x liczba_wszystkich_findings) - przy tysiącach znalezisk
  // realny koszt. Indeks budowany raz na zmianę `findings`, odczyt O(1).
  const findingsById = useMemo(() => new Map(findings.map((f) => [f.id, f])), [findings])

  const clusters = useMemo(
    () => clusterFindings(points, (lat, lng) => map.project([lat, lng], zoom), CLUSTER_DISTANCE_PX),
    [points, map, zoom],
  )

  return (
    <>
      {clusters.map((cluster) => {
        if (cluster.points.length === 1) {
          const finding = findingsById.get(cluster.points[0].id)
          if (!finding) return null
          const species = finding.speciesId ? speciesById.get(finding.speciesId) : undefined
          return (
            <Marker
              key={finding.id}
              position={[cluster.lat, cluster.lng]}
              icon={findingMarkerIconFor(species?.edibility)}
            >
              <Popup>
                <div className="text-sm">
                  <p className="font-semibold">{finding.speciesNameGuess ?? 'Nieokreślony gatunek'}</p>
                  {species && (
                    <div className="mt-1">
                      <EdibilityBadge edibility={species.edibility} />
                    </div>
                  )}
                  <p className="mt-1">{formatDate(finding.createdAt)}</p>
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

// `findings` pochodzi ze stabilnej referencji `useLiveQuery` w MapView, więc bez memo cały ten
// komponent (i przeliczanie klastrów mimo `useMemo` w środku) re-renderowałby się przy każdym
// ticku GPS rodzica (kilka razy/s) - React.memo ucina to przy niezmienionej referencji `findings`.
export const FindingMarkers = memo(FindingMarkersImpl)

export function RecenterOnLocate({ position }: { position: Position | null }) {
  const map = useMap()
  useEffect(() => {
    if (position) {
      map.setView(position, 14)
    }
  }, [position, map])
  return null
}

export function MapClickHandler({
  enabled,
  onPick,
}: {
  enabled: boolean
  onPick: (position: Position) => void
}) {
  useMapEvent('click', (event) => {
    if (!enabled) return
    onPick([event.latlng.lat, event.latlng.lng])
  })
  return null
}

export function MapInstanceCapture({ onReady }: { onReady: (map: L.Map | null) => void }) {
  // `onReady` musi mieć stabilną referencję z wywołania - przekazywanie inline lambdy w
  // MapView odpalałoby ten efekt przy każdym renderze rodzica (czyli każdym ticku GPS).
  // Czyszczenie na `null` przy odmontowaniu jest konieczne - MapView potrafi odmontować całą
  // mapę (przełącznik widoku-listy), a bez tego `mapRef` zostawałby ze zniszczoną instancją
  // Leaflet, której metody (np. `getCenter()`, wywoływane przez OfflineAreaDownload) rzucają
  // wyjątkiem zamiast zwrócić coś sensownego.
  const map = useMap()
  useEffect(() => {
    onReady(map)
    return () => onReady(null)
  }, [map, onReady])
  return null
}
