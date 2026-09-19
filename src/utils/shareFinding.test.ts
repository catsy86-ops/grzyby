import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Finding } from '../db/schema'
import { buildFindingShareText, canShareFinding, shareFinding } from './shareFinding'

function finding(overrides: Partial<Finding> = {}): Finding {
  return {
    id: 1,
    speciesId: null,
    speciesNameGuess: 'Borowik szlachetny',
    latitude: null,
    longitude: null,
    notes: '',
    createdAt: new Date('2026-09-19T10:00:00').getTime(),
    ...overrides,
  }
}

describe('buildFindingShareText', () => {
  it('includes species, date, location and notes when present', () => {
    const text = buildFindingShareText(finding({ latitude: 53.4, longitude: 14.5, notes: 'Pod sosną' }))
    expect(text).toContain('Borowik szlachetny')
    expect(text).toContain('openstreetmap.org')
    expect(text).toContain('Pod sosną')
  })
})

describe('shareFinding', () => {
  const originalShare = navigator.share
  const originalCanShare = navigator.canShare
  const originalClipboard = navigator.clipboard

  afterEach(() => {
    Object.defineProperty(navigator, 'share', { value: originalShare, configurable: true })
    Object.defineProperty(navigator, 'canShare', { value: originalCanShare, configurable: true })
    Object.defineProperty(navigator, 'clipboard', { value: originalClipboard, configurable: true })
  })

  it('falls back to clipboard when Web Share API is unavailable', async () => {
    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true })
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })

    const result = await shareFinding(finding())
    expect(result).toBe('copied')
    expect(writeText).toHaveBeenCalledOnce()
  })

  it('shares text only when a photo is given but file sharing is unsupported', async () => {
    const share = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'share', { value: share, configurable: true })
    Object.defineProperty(navigator, 'canShare', { value: () => false, configurable: true })

    const photoBlob = new Blob(['fake'], { type: 'image/jpeg' })
    const result = await shareFinding(finding(), photoBlob)
    expect(result).toBe('shared')
    expect(share).toHaveBeenCalledWith(expect.not.objectContaining({ files: expect.anything() }))
  })

  it('attaches the photo as a file when file sharing is supported', async () => {
    const share = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'share', { value: share, configurable: true })
    Object.defineProperty(navigator, 'canShare', { value: () => true, configurable: true })

    const photoBlob = new Blob(['fake'], { type: 'image/jpeg' })
    const result = await shareFinding(finding(), photoBlob)
    expect(result).toBe('shared')
    expect(share).toHaveBeenCalledWith(expect.objectContaining({ files: expect.any(Array) }))
  })

  it('treats a user-cancelled share sheet as "cancelled", not an error', async () => {
    const abortError = Object.assign(new Error('cancelled'), { name: 'AbortError' })
    Object.defineProperty(navigator, 'share', { value: vi.fn().mockRejectedValue(abortError), configurable: true })

    const result = await shareFinding(finding())
    expect(result).toBe('cancelled')
  })
})

describe('canShareFinding', () => {
  it('reflects whether navigator.share exists', () => {
    expect(typeof canShareFinding()).toBe('boolean')
  })
})
