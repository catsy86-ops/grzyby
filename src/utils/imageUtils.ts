const THUMBNAIL_MAX_SIZE = 200
const THUMBNAIL_QUALITY = 0.75
// Zdjęcie "pełne" trzymane w db.photos.blob - skompresowane, nie surowy oryginał z aparatu
// (często 3-10 MB), żeby nie zapychać ograniczonej pamięci telefonu w terenie. 1600px starcza do
// pełnoekranowego podglądu na każdym telefonie.
const PHOTO_MAX_SIZE = 1600
const PHOTO_QUALITY = 0.85

async function resizeImage(file: Blob, maxSize: number, quality: number): Promise<Blob> {
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

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
    if (!blob) throw new Error('Nie udało się wygenerować miniatury')
    return blob
  } finally {
    bitmap.close()
  }
}

export async function createThumbnail(file: Blob, maxSize = THUMBNAIL_MAX_SIZE): Promise<Blob> {
  return resizeImage(file, maxSize, THUMBNAIL_QUALITY)
}

// Kompresuje zdjęcie ze zdjęcia z aparatu do rozsądnego rozmiaru przed zapisem w IndexedDB -
// oryginał nigdzie nie jest wyświetlany, więc trzymanie go 1:1 tylko marnuje miejsce.
export async function compressPhoto(file: Blob, maxSize = PHOTO_MAX_SIZE): Promise<Blob> {
  return resizeImage(file, maxSize, PHOTO_QUALITY)
}
