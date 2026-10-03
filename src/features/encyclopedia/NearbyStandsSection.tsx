import { useState } from 'react'
import { Loader2Icon, NavigationIcon, TreesIcon } from 'lucide-react'
import { toast } from 'sonner'
import { db } from '../../db/db'
import type { Species } from '../../db/schema'
import { TREE_NAMES } from '../../data/forestCodes'
import { SPECIES_TREES } from '../../data/speciesTrees'
import { useAppStore } from '../../stores/appStore'
import { formatDistance } from '../../utils/bearing'
import { formatStandAge } from '../../utils/forestStand'
import { buildStandSpot, DEFAULT_SEARCH_RADIUS_M, searchMatchingStands, type MatchingStand } from '../../utils/forestStandSearch'
import { getCurrentPosition } from '../../utils/geolocation'
import { Button } from '../../components/ui/button'
import { ToggleGroup, ToggleGroupItem } from '../../components/ui/toggle-group'

const MAX_RESULTS = 8
const AGE_FILTERS = [
  { value: '0', label: 'Dowolny wiek' },
  { value: '40', label: '40+ lat' },
  { value: '80', label: '80+ lat' },
]

type Status = 'idle' | 'loading' | 'ready' | 'error'

interface NearbyStandsSectionProps {
  species: Species
  // Wywoływane po wybraniu celu nawigacji - asystent zamyka się i apka przechodzi na Mapę.
  onNavigate: () => void
}

// "Gdzie szukać" (Faza 29, pkt 2): najbliższe wydzielenia leśne z drzewami, pod którymi gatunek
// rośnie według atlasu (data/speciesTrees.ts). Wyszukiwanie tylko na wyraźne żądanie - wysyła
// pozycję do BDL, ta sama zasada prywatności co drzewostan przy znalezisku (nic w tle).
export function NearbyStandsSection({ species, onNavigate }: NearbyStandsSectionProps) {
  const trees = SPECIES_TREES[species.id] ?? []
  const [minAge, setMinAge] = useState('0')
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)
  const [stands, setStands] = useState<MatchingStand[]>([])
  const setNavigationTargetSpotId = useAppStore((s) => s.setNavigationTargetSpotId)
  const setActiveTab = useAppStore((s) => s.setActiveTab)

  if (trees.length === 0) {
    return (
      <div>
        <p className="text-xs font-medium text-muted-foreground">Gdzie szukać</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Atlas nie wiąże tego gatunku z konkretnymi drzewami, więc nie ma czego szukać w danych o drzewostanach.
        </p>
      </div>
    )
  }

  async function search() {
    setStatus('loading')
    setError(null)
    try {
      const coords = await getCurrentPosition().catch(() => {
        throw new Error('Nie udało się ustalić pozycji (GPS).')
      })
      const result = await searchMatchingStands(coords.latitude, coords.longitude, trees, {
        minAge: Number(minAge) || undefined,
      }).catch(() => {
        throw new Error('Bank Danych o Lasach nie odpowiada - sprawdź połączenie i spróbuj ponownie.')
      })
      setStands(result)
      setStatus('ready')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Wyszukiwanie nie powiodło się.')
      setStatus('error')
    }
  }

  // Cel nawigacji w apce to zawsze grzybowisko - wydzielenie zapisujemy jako grzybowisko (zostaje
  // offline na mapie) i od razu ustawiamy je jako cel. Ponowny wybór tego samego wydzielenia
  // używa istniejącego wpisu zamiast tworzyć duplikat.
  async function navigateTo(stand: MatchingStand) {
    try {
      const existing = await db.spots
        .filter((s) => s.latitude === stand.latitude && s.longitude === stand.longitude)
        .first()
      const spotId =
        existing?.id ??
(await db.spots.add(buildStandSpot(stand, species)))
      setNavigationTargetSpotId(spotId)
      setActiveTab('mapa')
      toast.success('Zapisano jako grzybowisko i ustawiono nawigację')
      onNavigate()
    } catch {
      toast.error('Nie udało się zapisać grzybowiska.')
    }
  }

  const treeNames = trees.map((code) => TREE_NAMES[code].toLowerCase()).join(', ')
  const visible = stands.slice(0, MAX_RESULTS)

  return (
    <div className="flex flex-col gap-2">
      <div>
        <p className="text-xs font-medium text-muted-foreground">Gdzie szukać</p>
        <p className="mt-1 text-sm text-foreground/80">
          Drzewostany z gatunkiem panującym: {treeNames} - w promieniu {formatDistance(DEFAULT_SEARCH_RADIUS_M)} od
          Ciebie.
        </p>
      </div>

      <ToggleGroup
        value={[minAge]}
        onValueChange={(next) => next[0] && setMinAge(next[0])}
        variant="outline"
        size="sm"
        aria-label="Minimalny wiek drzewostanu"
      >
        {AGE_FILTERS.map((f) => (
          <ToggleGroupItem key={f.value} value={f.value}>
            {f.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      <Button type="button" variant="outline" size="sm" className="self-start" disabled={status === 'loading'} onClick={search}>
        {status === 'loading' ? <Loader2Icon className="animate-spin" /> : <TreesIcon />}
        {status === 'loading' ? 'Szukam...' : 'Szukaj drzewostanów w pobliżu'}
      </Button>
      <p className="text-[11px] text-muted-foreground">
        Wyszukiwanie wysyła Twoją pozycję do Banku Danych o Lasach. Dane obejmują głównie lasy państwowe.
      </p>

      {status === 'error' && error && <p className="text-sm text-destructive">{error}</p>}
      {status === 'ready' && stands.length === 0 && (
        <p className="text-sm text-muted-foreground">Brak pasujących drzewostanów w pobliżu.</p>
      )}
      {visible.length > 0 && (
        <ul className="flex flex-col gap-1" aria-label="Najbliższe pasujące drzewostany">
          {visible.map((stand) => (
            <li key={stand.id || `${stand.latitude},${stand.longitude}`} className="flex items-center justify-between gap-2 rounded-lg border border-border p-2">
              <div className="text-sm">
                <p className="font-medium">
                  {stand.treeName}
                  {stand.age != null && <span className="font-normal text-muted-foreground"> · {formatStandAge(stand.age)}</span>}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDistance(stand.distanceM)}
                  {stand.siteType && ` · ${stand.siteType}`}
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={() => navigateTo(stand)}>
                <NavigationIcon />
                Prowadź
              </Button>
            </li>
          ))}
        </ul>
      )}
      {stands.length > MAX_RESULTS && (
        <p className="text-xs text-muted-foreground">
          Pokazano {MAX_RESULTS} najbliższych z {stands.length}.
        </p>
      )}
    </div>
  )
}
