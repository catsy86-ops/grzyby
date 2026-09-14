import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import { db } from '../../db/db'
import type { Photo } from '../../db/schema'
import { Skeleton } from '../../components/ui/skeleton'
import { Dialog, DialogContent, DialogTitle } from '../../components/ui/dialog'
import { Button } from '../../components/ui/button'

export function FindingThumbnail({ findingId }: { findingId: number }) {
  const photos = useLiveQuery(() => db.photos.where('findingId').equals(findingId).toArray(), [findingId])
  const firstPhoto = photos?.[0]
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    if (!firstPhoto) {
      setThumbnailUrl(null)
      return
    }
    const objectUrl = URL.createObjectURL(firstPhoto.thumbnailBlob)
    setThumbnailUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [firstPhoto])

  if (photos === undefined) return <Skeleton className="h-16 w-16 shrink-0" />
  if (!thumbnailUrl || photos.length === 0) return null

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setActiveIndex(0)
          setOpen(true)
        }}
        aria-label={photos.length > 1 ? `Powiększ zdjęcia znaleziska (${photos.length})` : 'Powiększ zdjęcie znaleziska'}
        className="relative h-16 w-16 shrink-0 overflow-hidden rounded outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <img src={thumbnailUrl} alt="Miniatura znaleziska" className="h-full w-full object-cover" />
        {photos.length > 1 && (
          <span className="absolute bottom-0.5 right-0.5 rounded bg-black/70 px-1 text-[10px] font-medium text-white">
            +{photos.length - 1}
          </span>
        )}
      </button>

      <FindingPhotoLightbox
        photos={photos}
        open={open}
        onOpenChange={setOpen}
        activeIndex={activeIndex}
        onActiveIndexChange={setActiveIndex}
      />
    </>
  )
}

function FindingPhotoLightbox({
  photos,
  open,
  onOpenChange,
  activeIndex,
  onActiveIndexChange,
}: {
  photos: Photo[]
  open: boolean
  onOpenChange: (open: boolean) => void
  activeIndex: number
  onActiveIndexChange: (index: number) => void
}) {
  const activePhoto = photos[activeIndex]
  const [fullUrl, setFullUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !activePhoto) {
      setFullUrl(null)
      return
    }
    const objectUrl = URL.createObjectURL(activePhoto.blob)
    setFullUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [open, activePhoto])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100%-2rem)] p-2 sm:max-w-2xl">
        <DialogTitle className="sr-only">Zdjęcie znaleziska</DialogTitle>
        <div className="relative">
          {fullUrl && (
            <img src={fullUrl} alt="Zdjęcie znaleziska" className="max-h-[80vh] w-full rounded-lg object-contain" />
          )}
          {photos.length > 1 && (
            <>
              <Button
                type="button"
                variant="secondary"
                size="icon"
                aria-label="Poprzednie zdjęcie"
                className="absolute left-1 top-1/2 -translate-y-1/2 rounded-full shadow"
                onClick={() => onActiveIndexChange((activeIndex - 1 + photos.length) % photos.length)}
              >
                <ChevronLeftIcon className="size-4" />
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="icon"
                aria-label="Następne zdjęcie"
                className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full shadow"
                onClick={() => onActiveIndexChange((activeIndex + 1) % photos.length)}
              >
                <ChevronRightIcon className="size-4" />
              </Button>
              <p className="mt-1 text-center text-xs text-muted-foreground">
                {activeIndex + 1} / {photos.length}
              </p>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
