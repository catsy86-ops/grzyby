import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createThumbnail } from './imageUtils'

function mockBitmap(width: number, height: number) {
  return { width, height, close: vi.fn() }
}

describe('createThumbnail', () => {
  let getContextSpy: ReturnType<typeof vi.spyOn>
  let toBlobSpy: ReturnType<typeof vi.spyOn>
  let drawImage: ReturnType<typeof vi.fn>
  const resultBlob = new Blob(['thumb'], { type: 'image/jpeg' })

  beforeEach(() => {
    drawImage = vi.fn()
    getContextSpy = vi
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockReturnValue({ drawImage } as any)
    toBlobSpy = vi
      .spyOn(HTMLCanvasElement.prototype, 'toBlob')
      .mockImplementation((callback: BlobCallback) => callback(resultBlob))
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('skaluje w dół obraz większy niż maxSize, zachowując proporcje', async () => {
    const bitmap = mockBitmap(1000, 500)
    vi.stubGlobal('createImageBitmap', vi.fn(async () => bitmap))

    await createThumbnail(new Blob(['x']), 200)

    expect(drawImage).toHaveBeenCalledWith(bitmap, 0, 0, 200, 100)
    expect(bitmap.close).toHaveBeenCalled()
  })

  it('nie skaluje obrazu już mniejszego niż maxSize', async () => {
    const bitmap = mockBitmap(50, 100)
    vi.stubGlobal('createImageBitmap', vi.fn(async () => bitmap))

    const blob = await createThumbnail(new Blob(['x']), 200)

    expect(blob).toBe(resultBlob)
    expect(drawImage).toHaveBeenCalledWith(bitmap, 0, 0, 50, 100)
    expect(bitmap.close).toHaveBeenCalled()
  })

  it('rzuca błąd, gdy nie udało się utworzyć kontekstu canvas', async () => {
    getContextSpy.mockReturnValue(null)
    const bitmap = mockBitmap(50, 100)
    vi.stubGlobal('createImageBitmap', vi.fn(async () => bitmap))

    await expect(createThumbnail(new Blob(['x']), 200)).rejects.toThrow(
      'Nie udało się utworzyć kontekstu canvas',
    )
    expect(bitmap.close).toHaveBeenCalled()
  })

  it('rzuca błąd, gdy canvas.toBlob zwraca null', async () => {
    toBlobSpy.mockImplementation((callback: BlobCallback) => callback(null))
    const bitmap = mockBitmap(50, 100)
    vi.stubGlobal('createImageBitmap', vi.fn(async () => bitmap))

    await expect(createThumbnail(new Blob(['x']), 200)).rejects.toThrow(
      'Nie udało się wygenerować miniatury',
    )
    expect(bitmap.close).toHaveBeenCalled()
  })
})
