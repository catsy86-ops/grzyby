import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { db } from '../../db/db'
import { Skeleton } from '../../components/ui/skeleton'

export function FindingThumbnail({ findingId }: { findingId: number }) {
  const photo = useLiveQuery(async () => {
    const found = await db.photos.where('findingId').equals(findingId).first()
    return found ?? null
  }, [findingId])
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!photo) {
      setUrl(null)
      return
    }
    const objectUrl = URL.createObjectURL(photo.thumbnailBlob)
    setUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [photo])

  if (photo === undefined) return <Skeleton className="h-16 w-16 shrink-0" />
  if (!url) return null

  return (
    <img
      src={url}
      alt="Miniatura znaleziska"
      className="h-16 w-16 shrink-0 rounded object-cover"
    />
  )
}
