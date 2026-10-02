import { useEffect, useState } from 'react'
import { Popup } from 'react-leaflet'
import { AlertTriangleIcon, TreePineIcon } from 'lucide-react'
import { getSpeciesForTree } from '../../data/speciesTrees'
import { fetchForestStand, formatStandAge, type ForestStand } from '../../utils/forestStand'
import type { Position } from '../../utils/bearing'
import type { Species } from '../../db/schema'

// Bez dopisków w nawiasie ("Lejkowiec dęty (Trąbka śmierci)") - pełne nazwy są w atlasie, a w
// wąskiej karcie na mapie rozdmuchiwały listę do kilkunastu linijek.
function shortName(species: Species) {
  return species.nameCommon.split(' (')[0]
}

type StandState = { status: 'loading' } | { status: 'error' } | { status: 'done'; stand: ForestStand | null }

// Karta "co tu rośnie" po dotknięciu mapy z włączoną nakładką Drzewostany - rozszyfrowuje kod
// wydzielenia z Banku Danych o Lasach (gatunek panujący, wiek, siedlisko) i podpowiada gatunki
// z atlasu typowe dla tego drzewa. MapView montuje ją z `key` = pozycja, więc każde nowe
// dotknięcie startuje od czystego stanu "loading".
export function ForestStandPopup({ position }: { position: Position }) {
  const [state, setState] = useState<StandState>({ status: 'loading' })

  useEffect(() => {
    const controller = new AbortController()
    fetchForestStand(position[0], position[1], controller.signal)
      .then((stand) => setState({ status: 'done', stand }))
      .catch(() => {
        if (!controller.signal.aborted) setState({ status: 'error' })
      })
    return () => controller.abort()
  }, [position])

  return (
    <Popup position={position} minWidth={240} maxWidth={280}>
      <div className="text-sm" aria-live="polite">
        <ForestStandContent state={state} />
      </div>
    </Popup>
  )
}

function ForestStandContent({ state }: { state: StandState }) {
  if (state.status === 'loading') return <p className="text-muted-foreground">Sprawdzam drzewostan…</p>
  if (state.status === 'error') {
    return <p>Nie udało się pobrać danych o drzewostanie - ta funkcja wymaga internetu.</p>
  }
  const { stand } = state
  if (!stand) return <p>Brak danych o drzewostanie w tym miejscu (poza lasem lub poza ewidencją).</p>

  const { edible, dangerous } = stand.treeCode ? getSpeciesForTree(stand.treeCode) : { edible: [], dangerous: [] }
  const details = [stand.siteType, stand.areaHa !== null ? `${stand.areaHa.toLocaleString('pl-PL')} ha` : null]
    .filter(Boolean)
    .join(' · ')

  return (
    <>
      <p className="flex items-center gap-1.5 font-semibold">
        <TreePineIcon className="size-4 shrink-0 text-primary" />
        {stand.treeName}
        {stand.age !== null && `, ${formatStandAge(stand.age)}`}
      </p>
      {details && <p className="mt-0.5 text-xs text-muted-foreground">{details}</p>}
      {edible.length > 0 && (
        <p className="mt-2">
          <span className="font-medium">Typowe dla tego drzewa: </span>
          {edible.map(shortName).join(', ')}
        </p>
      )}
      {dangerous.length > 0 && (
        <p className="mt-2 flex gap-1.5 text-destructive">
          <AlertTriangleIcon className="mt-0.5 size-4 shrink-0" />
          <span>
            <span className="font-medium">Uwaga, trujące: </span>
            {dangerous.map(shortName).join(', ')}
          </span>
        </p>
      )}
      {edible.length === 0 && dangerous.length === 0 && (
        <p className="mt-2 text-xs text-muted-foreground">Atlas nie wiąże żadnego gatunku z tym drzewem.</p>
      )}
      <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
        Dane: Bank Danych o Lasach. Lista z opisów siedlisk w atlasie - niepełna, nie zastępuje rozpoznania.
      </p>
    </>
  )
}
