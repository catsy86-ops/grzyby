import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAppStore } from '../stores/appStore'
import * as ambientAudio from '../utils/ambientAudio'
import { useAmbientAudio } from './useAmbientAudio'

describe('useAmbientAudio', () => {
  beforeEach(() => {
    useAppStore.setState({ ambientAudioEnabled: false, ambientAudioVolume: 0.1 })
    vi.spyOn(ambientAudio, 'isAmbientAudioSupported').mockReturnValue(true)
    vi.spyOn(ambientAudio, 'startAmbientAudio').mockImplementation(() => {})
    vi.spyOn(ambientAudio, 'stopAmbientAudio').mockImplementation(() => {})
    vi.spyOn(ambientAudio, 'pauseAmbientAudio').mockImplementation(() => {})
    vi.spyOn(ambientAudio, 'resumeAmbientAudio').mockImplementation(() => {})
    vi.spyOn(ambientAudio, 'setAmbientVolume').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })
  })

  it('nie startuje dźwięku, gdy enabled=false (domyślny stan po każdym ładowaniu strony)', () => {
    renderHook(() => useAmbientAudio())
    expect(ambientAudio.startAmbientAudio).not.toHaveBeenCalled()
  })

  it('setEnabled(true) startuje dźwięk z bieżącą głośnością', () => {
    const { result, rerender } = renderHook(() => useAmbientAudio())

    act(() => result.current.setEnabled(true))
    rerender()

    expect(ambientAudio.startAmbientAudio).toHaveBeenCalledWith(0.1)
  })

  it('setVolume aktualizuje głośność bez restartu grafu audio', () => {
    useAppStore.setState({ ambientAudioEnabled: true })
    const { result, rerender } = renderHook(() => useAmbientAudio())
    vi.mocked(ambientAudio.startAmbientAudio).mockClear()

    act(() => result.current.setVolume(0.5))
    rerender()

    expect(ambientAudio.setAmbientVolume).toHaveBeenCalledWith(0.5)
    expect(ambientAudio.startAmbientAudio).not.toHaveBeenCalled()
  })

  it('pauzuje przy przejściu karty w tło i wznawia po powrocie', () => {
    useAppStore.setState({ ambientAudioEnabled: true })
    renderHook(() => useAmbientAudio())

    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true })
    act(() => document.dispatchEvent(new Event('visibilitychange')))
    expect(ambientAudio.pauseAmbientAudio).toHaveBeenCalledOnce()

    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })
    act(() => document.dispatchEvent(new Event('visibilitychange')))
    expect(ambientAudio.resumeAmbientAudio).toHaveBeenCalledOnce()
  })

  it('setEnabled(false) zatrzymuje dźwięk', () => {
    useAppStore.setState({ ambientAudioEnabled: true })
    const { result, rerender } = renderHook(() => useAmbientAudio())

    act(() => result.current.setEnabled(false))
    rerender()

    expect(ambientAudio.stopAmbientAudio).toHaveBeenCalled()
  })
})
