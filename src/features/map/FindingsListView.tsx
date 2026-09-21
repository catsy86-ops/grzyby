import { motion } from 'motion/react'
import { MapPinnedIcon } from 'lucide-react'
import { EdibilityBadge, speciesCardClassName } from '../../components/EdibilityBadge'
import { EmptyBasketIllustration, EmptySearchIllustration } from '../../components/icons/illustrations'
import { Card, CardContent } from '../../components/ui/card'
import speciesData from '../../data/species.json'
import type { Finding, Spot, Species } from '../../db/schema'
import type { Position } from '../../utils/bearing'
import { describeBearing, getBearingInfo, getDistanceMeters } from '../../utils/bearing'
import { formatDate } from '../../utils/formatDate'

const speciesById = new Map((speciesData as Species[]).map((s) => [s.id, s]))

interface FindingsListViewProps {
  findings: Finding[]
  spots: Spot[]
  userPosition: Position | null
}

// Alternatywa dla samej mapy jako lista - z dwóch powodów naraz (Faza 19): dostępność (osoby
// niekorzystające z mapy wzrokowo/klawiaturą+czytnikiem ekranu nie mają dziś ŻADNEGO sposobu na
// przejrzenie znalezisk/grzybowisk z widoku Mapy - Dziennik pokazuje znaleziska, ale bez
// kontekstu przestrzennego "gdzie to jest względem mnie teraz") oraz praktyczny przypadek
// "słabo widać ekran w pełnym słońcu w terenie", gdzie tekst czyta się łatwiej niż małe pinezki.
export function FindingsListView({ findings, spots, userPosition }: FindingsListViewProps) {
  const located = findings.filter((f) => f.latitude != null && f.longitude != null)
  const sorted = userPosition
    ? [...located].sort((a, b) => {
        const distA = getDistanceMeters(userPosition, [a.latitude!, a.longitude!])
        const distB = getDistanceMeters(userPosition, [b.latitude!, b.longitude!])
        return distA - distB
      })
    : located

  function describePosition(position: Position) {
    if (!userPosition) return null
    return describeBearing(getBearingInfo(userPosition, position))
  }

  return (
    <div className="h-full overflow-y-auto p-4">
      <h2 className="mb-3 text-sm font-semibold text-muted-foreground">
        Grzybowiska ({spots.length})
      </h2>
      <div className="mb-4 flex flex-col gap-2">
        {spots.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col items-center gap-2 py-6 text-center text-muted-foreground"
          >
            <EmptyBasketIllustration className="size-12 text-muted-foreground" />
            <p className="text-sm">Brak zapisanych grzybowisk.</p>
          </motion.div>
        )}
        {spots.map((spot, index) => {
          const description = describePosition([spot.latitude, spot.longitude])
          return (
            <Card
              key={spot.id}
              size="sm"
              style={{ animationDelay: `${Math.min(index, 12) * 40}ms` }}
              className="stagger-item transition-shadow duration-200 hover:shadow-md hover:shadow-primary/15"
            >
              <CardContent>
                <motion.div
                  className="flex items-center gap-3"
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-accent/10 text-brand-accent">
                    <MapPinnedIcon className="size-4" />
                  </span>
                  <div>
                    <p className="text-sm font-medium">{spot.name}</p>
                    {description && <p className="text-xs text-muted-foreground">{description}</p>}
                  </div>
                </motion.div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <h2 className="mb-3 text-sm font-semibold text-muted-foreground">
        Znaleziska na mapie ({sorted.length})
      </h2>
      <div className="flex flex-col gap-2">
        {sorted.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col items-center gap-2 py-6 text-center text-muted-foreground"
          >
            <EmptySearchIllustration className="size-12 text-muted-foreground" />
            <p className="text-sm">Brak znalezisk z zapisaną lokalizacją.</p>
          </motion.div>
        )}
        {sorted.map((finding, index) => {
          const species = finding.speciesId ? speciesById.get(finding.speciesId) : undefined
          const description = describePosition([finding.latitude!, finding.longitude!])
          return (
            <Card
              key={finding.id}
              size="sm"
              style={{ animationDelay: `${Math.min(index, 12) * 40}ms` }}
              className={speciesCardClassName(species?.edibility)}
            >
              <CardContent>
                <motion.div
                  className="flex items-start justify-between gap-2"
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                >
                  <div>
                    <p className="text-sm font-medium">{finding.speciesNameGuess ?? 'Nieokreślony gatunek'}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(finding.createdAt)}
                      {description && ` · ${description}`}
                    </p>
                  </div>
                  {species && <EdibilityBadge edibility={species.edibility} />}
                </motion.div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
