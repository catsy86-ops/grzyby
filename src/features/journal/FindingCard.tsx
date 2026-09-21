import { motion } from 'motion/react'
import { PencilIcon, Share2Icon, TrashIcon } from 'lucide-react'
import type { Finding, Species } from '../../db/schema'
import { EdibilityBadge, speciesCardClassName } from '../../components/EdibilityBadge'
import { Button } from '../../components/ui/button'
import { Card, CardContent } from '../../components/ui/card'
import { formatWeight } from '../../utils/tripStats'
import { computeDryingRatioPercent } from '../../utils/dryingRatio'
import { formatDateTime } from '../../utils/formatDate'
import { ConsumptionTracker } from './ConsumptionTracker'
import { FindingThumbnail } from './FindingThumbnail'

// Wydzielone z JournalView.tsx (Faza 27, redukcja rozmiaru pliku) - pojedyncza karta znaleziska
// w trybie widoku (nie edycji, patrz FindingEditForm.tsx dla tamtego trybu). Bez własnego stanu -
// czysta prezentacja nad `finding` plus trzy akcje z rodzica.
interface FindingCardProps {
  finding: Finding
  species: Species | undefined
  index: number
  onShare: (finding: Finding) => void
  onEdit: (finding: Finding) => void
  onDeleteRequest: (id: number | null) => void
}

export function FindingCard({ finding, species, index, onShare, onEdit, onDeleteRequest }: FindingCardProps) {
  const dryingPercent =
    finding.weightGrams != null && finding.driedWeightGrams != null
      ? computeDryingRatioPercent(finding.weightGrams, finding.driedWeightGrams)
      : null

  return (
    // Karta jest bezpośrednim dzieckiem kontenera z `useAutoAnimate` w JournalView.tsx
    // (transform-based pozycjonowanie przy sortowaniu/usuwaniu) - mikrointerakcja `whileTap`
    // (motion) idzie na wewnętrzny wrapper, nie na `Card`, żeby oba mechanizmy transformacji nie
    // kolidowały. hover:shadow (nie hover:-translate-y, celowo BEZ transform) - osobny transform z
    // hover kolidowałby z pozycjonowaniem useAutoAnimate.
    <Card
      size="sm"
      style={{ animationDelay: `${Math.min(index, 12) * 40}ms` }}
      className={speciesCardClassName(species?.edibility)}
    >
      <CardContent>
        <motion.div
          className="flex items-start gap-3"
          whileTap={{ scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        >
          {finding.id != null && <FindingThumbnail findingId={finding.id} />}
          <div className="flex flex-1 items-start justify-between">
            <div>
              {/* font-[550] (nie font-medium) - patrz ten sam wzorzec i uzasadnienie w
                  EncyclopediaView.tsx. */}
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <p className="font-[550]">{finding.speciesNameGuess ?? 'Nieokreślony gatunek'}</p>
                {species && <EdibilityBadge edibility={species.edibility} />}
              </div>
              <p className="text-xs text-muted-foreground">
                {formatDateTime(finding.createdAt)}
                {finding.latitude != null && finding.longitude != null && (
                  <>
                    {' '}
                    · {finding.latitude.toFixed(4)}, {finding.longitude.toFixed(4)}
                  </>
                )}
                {finding.weightGrams != null && <> · {formatWeight(finding.weightGrams)}</>}
                {finding.quantity != null && <> · {finding.quantity} szt.</>}
                {finding.driedWeightGrams != null && (
                  <>
                    {' '}
                    · suche {formatWeight(finding.driedWeightGrams)}
                    {dryingPercent != null && ` (${dryingPercent}%)`}
                  </>
                )}
              </p>
              {finding.notes && <p className="mt-1 text-sm text-foreground/80">{finding.notes}</p>}
              <ConsumptionTracker finding={finding} />
            </div>
            {/* Ikonowe przyciski zamiast podkreślonych linków tekstowych (poprawka z audytu UI) -
                realny cel dotyku (icon-sm, size-7) zamiast paska tekstu wysokości linii, spójne z
                ikonowymi akcjami reszty apki (np. TrashIcon w SpotManager.tsx). */}
            <div className="flex shrink-0 gap-1">
              <Button variant="ghost" size="icon-sm" aria-label="Udostępnij znalezisko" onClick={() => onShare(finding)}>
                <Share2Icon className="size-3.5" />
              </Button>
              <Button variant="ghost" size="icon-sm" aria-label="Edytuj znalezisko" onClick={() => onEdit(finding)}>
                <PencilIcon className="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Usuń znalezisko"
                className="text-destructive hover:text-destructive"
                onClick={() => onDeleteRequest(finding.id ?? null)}
              >
                <TrashIcon className="size-3.5" />
              </Button>
            </div>
          </div>
        </motion.div>
      </CardContent>
    </Card>
  )
}
