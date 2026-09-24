import { motion } from 'motion/react'
import { NotebookPenIcon } from 'lucide-react'
import type { Prediction } from '../../utils/mushroomModel'
import { EdibilityBadge } from '../../components/EdibilityBadge'
import { LookalikesWarning } from '../../components/LookalikesWarning'
import { Button } from '../../components/ui/button'
import { Card, CardContent } from '../../components/ui/card'
import speciesData from '../../data/species.json'
import type { Species } from '../../db/schema'
import { useAppStore } from '../../stores/appStore'

const LOW_CONFIDENCE_THRESHOLD = 0.4

// "inne" to opcjonalna klasa negatywna z train.py (patrz scripts/prepare-dataset/
// fetch-negative-images.mjs) - surowy label modelu nie jest gatunkiem, więc dostaje własny,
// czytelny dla użytkownika tekst zamiast pokazywania id klasy wprost.
const NOT_A_MUSHROOM_LABEL = 'inne'

function displayName(species: Prediction['species'], labelRaw: string): string {
  if (species) return species.nameCommon
  if (labelRaw === NOT_A_MUSHROOM_LABEL) return 'To raczej nie jest grzyb'
  return labelRaw
}

export function PredictionCard({ prediction, rank }: { prediction: Prediction; rank: number }) {
  const { species, confidence, labelRaw } = prediction
  const confidencePct = Math.round(confidence * 100)
  const isLowConfidence = confidence < LOW_CONFIDENCE_THRESHOLD
  const setActiveTab = useAppStore((s) => s.setActiveTab)
  const setPendingIdentifiedSpeciesId = useAppStore((s) => s.setPendingIdentifiedSpeciesId)

  // Przejmowane przez AddFindingForm po przełączeniu na Mapę (patrz MapView.tsx) - jedyny mostek
  // między wynikiem skanera a Dziennikiem, dotąd nazwa gatunku ginęła bezpowrotnie po analizie.
  function handleAddToJournal() {
    if (!species) return
    setPendingIdentifiedSpeciesId(species.id)
    setActiveTab('mapa')
  }

  // Twarde wstrzymanie wyniku poniżej progu, nie samo złagodzenie tonu - nazwa gatunku (nawet
  // podpisana jako "niepewna") to wciąż sugestia, którą przy klasyfikatorze jadalny/trujący łatwo
  // machinalnie zapamiętać mimo zastrzeżenia. Cisza (brak wskazanej nazwy) jest tu bezpieczniejsza
  // niż niepewna podpowiedź - patrz docs/MODEL-TRAINING.md.
  if (isLowConfidence) {
    return (
      <Card size="sm" className="opacity-70">
        <CardContent>
          <p className="text-sm text-muted-foreground">#{rank} — model nie jest wystarczająco pewny</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Zbyt niska pewność, by pokazać sugestię gatunku. Zrób wyraźniejsze zdjęcie (bliżej,
            lepsze światło, cały grzyb w kadrze) albo poproś o pomoc mikologa/punkt klasyfikacji
            grzybów (Sanepid).
          </p>
        </CardContent>
      </Card>
    )
  }

  // Najlepsze dopasowanie (#1, z wystarczającą pewnością) dostaje jednorazowy "pop" wejścia i
  // delikatną obwódkę - to moment "nagrody" po analizie zdjęcia, wart wyróżnienia z listy, nie
  // tylko kolejna karta. Pozostałe pozycje (#2, #3...) wchodzą bez ruchu, żeby nie rozpraszać.
  const isTopMatch = rank === 1

  return (
    <motion.div
      initial={isTopMatch ? { opacity: 0, scale: 0.94 } : false}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      <Card size="sm" className={isTopMatch ? 'ring-2 ring-primary/40' : undefined}>
        <CardContent>
          <div className="flex items-center justify-between">
            <p className="font-medium">
              #{rank} {displayName(species, labelRaw)}
            </p>
            <span className="text-sm text-muted-foreground">{confidencePct}%</span>
          </div>
          {species && (
            <>
              <p className="text-sm italic text-muted-foreground">{species.nameLatin}</p>
              <div className="mt-2">
                <EdibilityBadge edibility={species.edibility} />
              </div>
              <p className="mt-2 text-sm text-foreground/80">{species.description}</p>
              <LookalikesWarning species={species} allSpecies={speciesData as Species[]} />
              <Button type="button" variant="outline" size="sm" className="mt-3 w-full" onClick={handleAddToJournal}>
                <NotebookPenIcon />
                Dodaj do dziennika
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
