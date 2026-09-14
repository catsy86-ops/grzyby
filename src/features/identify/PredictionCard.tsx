import { motion } from 'motion/react'
import type { Prediction } from '../../utils/mushroomModel'
import { EdibilityBadge } from '../../components/EdibilityBadge'
import { LookalikesWarning } from '../../components/LookalikesWarning'
import { Card, CardContent } from '../../components/ui/card'
import speciesData from '../../data/species.json'
import type { Species } from '../../db/schema'

const LOW_CONFIDENCE_THRESHOLD = 0.4

export function PredictionCard({ prediction, rank }: { prediction: Prediction; rank: number }) {
  const { species, confidence, labelRaw } = prediction
  const confidencePct = Math.round(confidence * 100)
  const isLowConfidence = confidence < LOW_CONFIDENCE_THRESHOLD

  if (isLowConfidence) {
    return (
      <Card size="sm" className="opacity-70">
        <CardContent>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              #{rank} {species?.nameCommon ?? labelRaw} — zbyt niska pewność
            </p>
            <span className="text-sm text-muted-foreground">{confidencePct}%</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Model nie jest wystarczająco pewny tego dopasowania. Traktuj to jako zgadywankę, nie
            identyfikację.
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
              #{rank} {species?.nameCommon ?? labelRaw}
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
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
