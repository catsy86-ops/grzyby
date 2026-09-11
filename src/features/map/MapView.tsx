import { useEffect, useState } from 'react'
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvent } from 'react-leaflet'
import { useLiveQuery } from 'dexie-react-hooks'
import L from 'leaflet'
import { db } from '../../db/db'
import { getCurrentPosition } from '../../utils/geolocation'
import { AddFindingForm } from './AddFindingForm'

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

const DEFAULT_CENTER: [number, number] = [52.0693, 19.4803] // środek Polski

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

export function MapView() {
  const [userPosition, setUserPosition] = useState<[number, number] | null>(null)
  const [pinPosition, setPinPosition] = useState<[number, number] | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [locateError, setLocateError] = useState<string | null>(null)

  const findings = useLiveQuery(() => db.findings.toArray(), [])

  async function handleLocate() {
    setLocateError(null)
    try {
      const coords = await getCurrentPosition()
      setUserPosition([coords.latitude, coords.longitude])
    } catch (error) {
      setLocateError(error instanceof Error ? error.message : 'Nie udało się ustalić lokalizacji')
    }
  }

  useEffect(() => {
    handleLocate()
  }, [])

  const findingPosition = pinPosition ?? userPosition

  return (
    <div className="relative h-full w-full">
      <MapContainer center={DEFAULT_CENTER} zoom={6} className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          subdomains="abcd"
          maxZoom={20}
        />
        <RecenterOnLocate position={userPosition} />
        <MapClickHandler enabled={!showAddForm} onPick={setPinPosition} />
        {userPosition && (
          <Marker position={userPosition} icon={defaultIcon}>
            <Popup>Twoja pozycja</Popup>
          </Marker>
        )}
        {pinPosition && (
          <Marker position={pinPosition} icon={pinIcon}>
            <Popup>Wybrane miejsce znaleziska</Popup>
          </Marker>
        )}
        {findings?.map(
          (finding) =>
            finding.latitude != null &&
            finding.longitude != null && (
              <Marker key={finding.id} position={[finding.latitude, finding.longitude]} icon={defaultIcon}>
                <Popup>
                  <div className="text-sm">
                    <p className="font-semibold">{finding.speciesNameGuess ?? 'Nieokreślony gatunek'}</p>
                    <p>{new Date(finding.createdAt).toLocaleDateString('pl-PL')}</p>
                    {finding.notes && <p className="mt-1">{finding.notes}</p>}
                  </div>
                </Popup>
              </Marker>
            ),
        )}
      </MapContainer>

      <div className="absolute bottom-4 right-4 z-[1000] flex flex-col items-end gap-2">
        {locateError && (
          <p className="max-w-56 rounded bg-red-100 p-2 text-xs text-red-800 shadow">{locateError}</p>
        )}
        {!pinPosition && (
          <p className="max-w-56 rounded bg-white/90 p-2 text-xs text-gray-600 shadow">
            Stuknij na mapie, aby wybrać dokładne miejsce znaleziska (domyślnie Twoja pozycja)
          </p>
        )}
        <button
          onClick={handleLocate}
          className="rounded-full bg-white px-4 py-2 text-sm font-medium shadow hover:bg-gray-50"
        >
          Zlokalizuj mnie
        </button>
        <button
          onClick={() => setShowAddForm(true)}
          className="rounded-full bg-green-800 px-4 py-2 text-sm font-medium text-white shadow hover:bg-green-900"
        >
          + Dodaj znalezisko
        </button>
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
    </div>
  )
}
