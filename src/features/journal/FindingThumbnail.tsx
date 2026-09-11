import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { db } from '../../db/db'

export function FindingThumbnail({ findingId }: { findingId: number }) {
  const photo = useLiveQuery(() => db.photos.where('findingId').equals(findingId).first(), [findingId])
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

  if (!url) return null

  return (
    <img
      src={url}
      alt="Miniatura znaleziska"
      className="h-16 w-16 shrink-0 rounded object-cover"
    />
  )
}
