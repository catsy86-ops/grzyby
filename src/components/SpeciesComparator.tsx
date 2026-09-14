import type { Species } from '../db/schema'
import { EdibilityBadge } from './EdibilityBadge'
import { Dialog, DialogContent, DialogTitle } from './ui/dialog'

function ComparatorColumn({ species }: { species: Species }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
      {species.imageUrls[0] && (
        <img
          src={species.imageUrls[0]}
          alt={species.nameCommon}
          loading="lazy"
          className="h-28 w-full rounded-lg object-cover sm:h-40"
        />
      )}
      <p className="text-sm font-medium leading-tight">{species.nameCommon}</p>
      <p className="text-xs italic leading-tight text-muted-foreground">{species.nameLatin}</p>
      <EdibilityBadge edibility={species.edibility} />
      <dl className="mt-1 flex flex-col gap-1 text-xs">
        <div>
          <dt className="font-medium text-foreground/80">Siedlisko</dt>
          <dd className="text-muted-foreground">{species.habitat}</dd>
        </div>
        <div>
          <dt className="font-medium text-foreground/80">Sezon</dt>
          <dd className="text-muted-foreground">{species.season}</dd>
        </div>
        <div>
          <dt className="font-medium text-foreground/80">Rozpoznawanie</dt>
          <dd className="text-muted-foreground">{species.description}</dd>
        </div>
      </dl>
    </div>
  )
}

export function SpeciesComparator({
  speciesA,
  speciesB,
  open,
  onOpenChange,
}: {
  speciesA: Species
  speciesB: Species
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-[calc(100%-2rem)] overflow-y-auto sm:max-w-2xl">
        <DialogTitle>
          {speciesA.nameCommon} kontra {speciesB.nameCommon}
        </DialogTitle>
        <div className="flex gap-3">
          <ComparatorColumn species={speciesA} />
          <div className="w-px shrink-0 bg-border" aria-hidden="true" />
          <ComparatorColumn species={speciesB} />
        </div>
      </DialogContent>
    </Dialog>
  )
}
