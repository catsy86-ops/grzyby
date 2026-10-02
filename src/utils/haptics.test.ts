import { afterEach, describe, expect, it, vi } from 'vitest'
import { useAppStore } from '../stores/appStore'
import { vibrateNotice, vibrateSuccess } from './haptics'

describe('haptics', () => {
  afterEach(() => {
    useAppStore.setState({ hapticsEnabled: true })
    vi.unstubAllGlobals()
  })

  it('wibruje, gdy wibracje są włączone', () => {
    const vibrate = vi.fn()
    vi.stubGlobal('navigator', { vibrate })
    vibrateSuccess()
    vibrateNotice()
    expect(vibrate).toHaveBeenCalledTimes(2)
  })

  it('nie wibruje po wyłączeniu w ustawieniach', () => {
    const vibrate = vi.fn()
    vi.stubGlobal('navigator', { vibrate })
    useAppStore.setState({ hapticsEnabled: false })
    vibrateSuccess()
    vibrateNotice()
    expect(vibrate).not.toHaveBeenCalled()
  })
})
