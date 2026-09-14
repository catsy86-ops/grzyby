import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { db } from '../../db/db'
import { Skeleton } from '../../components/ui/skeleton'
import { Dialog, DialogContent, DialogTitle } from '../../components/ui/dialog'

export function FindingThumbnail({ findingId }: { findingId: number }) {
  const photo = useLiveQuery(async () => {
    const found = await db.photos.where('findingId').equals(findingId).first()
    return found ?? null
  }, [findingId])
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null)
  const [fullUrl, setFullUrl] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!photo) {
      setThumbnailUrl(null)
      return
    }
    const objectUrl = URL.createObjectURL(photo.thumbnailBlob)
    setThumbnailUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [photo])

  useEffect(() => {
    if (!open || !photo) {
      setFullUrl(null)
      return
    }
    const objectUrl = URL.createObjectURL(photo.blob)
    setFullUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [open, photo])

  if (photo === undefined) return <Skeleton className="h-16 w-16 shrink-0" />
  if (!thumbnailUrl) return null

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Powiększ zdjęcie znaleziska"
        className="h-16 w-16 shrink-0 overflow-hidden rounded"
      >
        <img src={thumbnailUrl} alt="Miniatura znaleziska" className="h-full w-full object-cover" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] p-2 sm:max-w-2xl">
          <DialogTitle className="sr-only">Zdjęcie znaleziska</DialogTitle>
          {fullUrl && <img src={fullUrl} alt="Zdjęcie znaleziska" className="max-h-[80vh] w-full rounded-lg object-contain" />}
        </DialogContent>
      </Dialog>
    </>
  )
}
