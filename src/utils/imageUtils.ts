const THUMBNAIL_MAX_SIZE = 200
const THUMBNAIL_QUALITY = 0.75

export async function createThumbnail(file: Blob, maxSize = THUMBNAIL_MAX_SIZE): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  try {
    const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height))
    const width = Math.round(bitmap.width * scale)
    const height = Math.round(bitmap.height * scale)

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Nie udało się utworzyć kontekstu canvas')
    ctx.drawImage(bitmap, 0, 0, width, height)

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', THUMBNAIL_QUALITY),
    )
    if (!blob) throw new Error('Nie udało się wygenerować miniatury')
    return blob
  } finally {
    bitmap.close()
  }
}
