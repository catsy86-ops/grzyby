import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'motion/react'
import { XIcon } from 'lucide-react'
import type { Species } from '../../db/schema'
import { EdibilityBadge } from '../../components/EdibilityBadge'
import { getSeasonDotClass, isInSeason } from '../../utils/seasonFilter'

// Duży podgląd gatunku po dotknięciu zdjęcia na karcie Atlasu. Zamknięcie: przycisk X, Escape,
// dotknięcie tła albo przeciągnięcie arkusza w dół (jak natywny bottom sheet).
export function SpeciesPhotoSheet({ species, onClose }: { species: Species; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    closeRef.current?.focus()
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  // Portal do body - <main> ma własny kontekst warstw (z-0), więc arkusz renderowany w nim lądował
  // pod dolnym paskiem nawigacji, a tło nie przyciemniało nagłówka.
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center">
      <motion.div
        className="absolute inset-0 bg-black/60"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={species.nameCommon}
        className="paper-grain-surface relative flex max-h-[92dvh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl bg-popover shadow-[var(--shadow-sheet)] md:rounded-2xl"
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.6 }}
        onDragEnd={(_, info) => {
          if (info.offset.y > 120 || info.velocity.y > 600) onClose()
        }}
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 380, damping: 34 }}
      >
        <div className="relative aspect-[4/3] w-full shrink-0 bg-muted">
          <motion.img
            // Ten sam `layoutId` co zdjęcie na karcie w EncyclopediaView - motion animuje przejście
            // miniatury w duży nagłówek (i z powrotem przy zamknięciu).
            layoutId={`species-photo-${species.id}`}
            src={species.imageUrls[0]}
            alt={species.nameCommon}
            draggable={false}
            className="size-full object-cover"
          />
          <span aria-hidden="true" className="absolute top-2 left-1/2 h-1 w-12 -translate-x-1/2 rounded-full bg-white/70" />
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Zamknij"
            className="absolute top-3 right-3 flex size-10 items-center justify-center rounded-full bg-black/45 text-white outline-none backdrop-blur focus-visible:ring-3 focus-visible:ring-white/70"
          >
            <XIcon className="size-5" />
          </button>
        </div>
        <div className="flex flex-col gap-2 overflow-y-auto p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-heading-md font-semibold tracking-tight">{species.nameCommon}</h2>
            <EdibilityBadge edibility={species.edibility} />
          </div>
          <p className="-mt-1 text-sm italic text-muted-foreground">{species.nameLatin}</p>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className={`size-1.5 shrink-0 rounded-full ${getSeasonDotClass(species.season)}`} aria-hidden="true" />
            {species.season}
            {isInSeason(species.season) && <span className="font-medium text-primary">· w sezonie teraz</span>}
          </p>
          <p className="text-sm leading-relaxed text-foreground/80">{species.description}</p>
          <p className="text-xs text-muted-foreground">Siedlisko: {species.habitat}</p>
        </div>
      </motion.div>
    </div>,
    document.body,
  )
}
