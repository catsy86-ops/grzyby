import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../../db/db'
import { FindingThumbnail } from './FindingThumbnail'

async function clearPhotos() {
  await db.photos.clear()
}

describe('FindingThumbnail', () => {
  const createdUrls: string[] = []
  const revokedUrls: string[] = []

  beforeEach(async () => {
    await clearPhotos()
    createdUrls.length = 0
    revokedUrls.length = 0
    vi.stubGlobal(
      'URL',
      Object.assign(URL, {
        createObjectURL: vi.fn((_blob: Blob) => {
          const url = `blob:mock-${createdUrls.length}`
          createdUrls.push(url)
          return url
        }),
        revokeObjectURL: vi.fn((url: string) => {
          revokedUrls.push(url)
        }),
      }),
    )
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('nie renderuje obrazu, gdy znalezisko nie ma zdjęcia', async () => {
    render(<FindingThumbnail findingId={1} />)

    await waitFor(() => {
      expect(screen.queryByRole('img')).not.toBeInTheDocument()
    })
  })

  it('renderuje miniaturę, gdy znalezisko ma zdjęcie', async () => {
    const thumbnailBlob = new Blob(['thumb'], { type: 'image/jpeg' })
    await db.photos.add({ findingId: 2, blob: new Blob(['full']), thumbnailBlob })

    render(<FindingThumbnail findingId={2} />)

    const img = await screen.findByRole('img')
    expect(img).toHaveAttribute('src', createdUrls[0])
  })

  it('zwalnia object URL po odmontowaniu', async () => {
    const thumbnailBlob = new Blob(['thumb'], { type: 'image/jpeg' })
    await db.photos.add({ findingId: 3, blob: new Blob(['full']), thumbnailBlob })

    const { unmount } = render(<FindingThumbnail findingId={3} />)
    await screen.findByRole('img')
    const url = createdUrls[0]

    unmount()

    expect(revokedUrls).toContain(url)
  })

  it('otwiera podgląd pełnego zdjęcia po kliknięciu miniatury', async () => {
    const thumbnailBlob = new Blob(['thumb'], { type: 'image/jpeg' })
    const fullBlob = new Blob(['full'], { type: 'image/jpeg' })
    await db.photos.add({ findingId: 4, blob: fullBlob, thumbnailBlob })

    render(<FindingThumbnail findingId={4} />)
    const trigger = await screen.findByRole('button', { name: 'Powiększ zdjęcie znaleziska' })

    fireEvent.click(trigger)

    const fullImg = await screen.findByAltText('Zdjęcie znaleziska')
    expect(fullImg).toHaveAttribute('src', createdUrls[1])
  })
})
