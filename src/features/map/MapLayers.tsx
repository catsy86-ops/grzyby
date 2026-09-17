import { memo, useEffect, useMemo, useState } from 'react'
import type { MutableRefObject } from 'react'
import { Marker, Popup, useMap, useMapEvent } from 'react-leaflet'
import type L from 'leaflet'
import { TrashIcon } from 'lucide-react'
import { createClusterIcon, findingMarkerIconFor } from '../../components/icons/mapMarkerIcons'
import { EdibilityBadge } from '../../components/EdibilityBadge'
import speciesData from '../../data/species.json'
import { db } from '../../db/db'
import type { Finding, Species } from '../../db/schema'
import type { Position } from '../../utils/bearing'
import { clusterFindings } from '../../utils/clusterFindings'
import { formatDate } from '../../utils/formatDate'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from '../../components/ui/alert-dialog'

// Komponenty tego pliku to jedyna część feature'u Mapy realnie zależna od `useMap()`/
// `MapContainer` (wydzielone z MapView.tsx, Faza 19) - oddzielenie ich od reszty stanu/logiki
// zmniejsza powierzchnię, która wymaga środowiska testowego z Leaflet.

// Promień grupowania znalezisk w piksele ekranu - stały wizualny sens niezależnie od zoomu
// (patrz utils/clusterFindings.ts). Przy dużej historii zbiorów bez tego mapa renderowałaby
// setki nakładających się pinezek.
const CLUSTER_DISTANCE_PX = 48

const speciesById = new Map((speciesData as Species[]).map((s) => [s.id, s]))

// Pinezka pojedynczego znaleziska + jego popup - wydzielona z `FindingMarkersImpl`, bo od teraz
// nosi też własny stan potwierdzenia usunięcia (Faza "usuwanie pozycji z mapy"). Dotąd jedyną
// drogą do usunięcia znaleziska był Dziennik - w terenie, stojąc przy konkretnym miejscu na
// mapie, to nadmiarowy krok. Logika usuwania (transakcja findings+photos) lustrzana wobec
// `JournalView.handleDelete` - to samo znalezisko, ten sam wymóg skasowania powiązanego zdjęcia.
function FindingMarker({
  finding,
  species,
  position,
}: {
  finding: Finding
  species: Species | undefined
  position: [number, number]
}) {
  const [confirmDelete, setConfirmDelete] = useState(false)

  async function handleDelete() {
    await db.transaction('rw', db.findings, db.photos, async () => {
      await db.photos.where('findingId').equals(finding.id!).delete()
      await db.findings.delete(finding.id!)
    })
    setConfirmDelete(false)
  }

  return (
    <>
      <Marker position={position} icon={findingMarkerIconFor(species?.edibility)}>
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
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="mt-2 flex items-center gap-1 rounded text-xs text-destructive outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              <TrashIcon className="size-3.5" />
              Usuń znalezisko
            </button>
          </div>
        </Popup>
      </Marker>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogTitle>Usunąć znalezisko?</AlertDialogTitle>
          <AlertDialogDescription>
            {finding.speciesNameGuess ?? 'To znalezisko'} zostanie trwale usunięte razem ze zdjęciem. Tej operacji
            nie można cofnąć.
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-white hover:bg-destructive/90" onClick={handleDelete}>
              Tak, usuń
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

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
            <FindingMarker key={finding.id} finding={finding} species={species} position={[cluster.lat, cluster.lng]} />
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

export function RecenterOnLocate({
  position,
  suppressNextRef,
}: {
  position: Position | null
  // Gdy `MapContainer` remountuje się po celowym przejściu w konkretne miejsce (np. "Pokaż na
  // mapie" w SzczecinSpotsPanel, patrz MapView.tsx), ten efekt i tak odpala się na nowo (bo
  // nowa instancja `map` w deps), i bez tej flagi cichcem nadpisywałby świeżo ustawiony środek
  // mapy ostatnią znaną pozycją GPS. Flaga jest jednorazowa - konsumowana i czyszczona przy
  // pierwszym starcie efektu, więc kolejne, prawdziwe aktualizacje `recenterTarget` (przycisk
  // "namierz mnie", pierwszy odczyt GPS) działają jak dotychczas.
  suppressNextRef?: MutableRefObject<boolean>
}) {
  const map = useMap()
  useEffect(() => {
    if (!position) return
    if (suppressNextRef?.current) {
      suppressNextRef.current = false
      return
    }
    map.setView(position, 14)
  }, [position, map, suppressNextRef])
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
