import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAppStore } from '../../stores/appStore'
import * as ambientAudio from '../../utils/ambientAudio'
import { AmbientPlayer } from './AmbientPlayer'

describe('AmbientPlayer', () => {
  beforeEach(() => {
    useAppStore.setState({ ambientAudioEnabled: false, ambientAudioVolume: 0.2 })
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('nie renderuje się, gdy przeglądarka nie wspiera Web Audio API', () => {
    vi.spyOn(ambientAudio, 'isAmbientAudioSupported').mockReturnValue(false)
    const { container } = render(<AmbientPlayer />)
    expect(container).toBeEmptyDOMElement()
  })

  it('włącza ambient po kliknięciu przycisku play, wywołując startAmbientAudio', () => {
    vi.spyOn(ambientAudio, 'isAmbientAudioSupported').mockReturnValue(true)
    const startSpy = vi.spyOn(ambientAudio, 'startAmbientAudio').mockImplementation(() => {})
    vi.spyOn(ambientAudio, 'stopAmbientAudio').mockImplementation(() => {})

    render(<AmbientPlayer />)
    fireEvent.click(screen.getByRole('button', { name: 'Włącz ambient leśny' }))

    expect(startSpy).toHaveBeenCalledWith(0.2)
  })

  it('suwak głośności aktualizuje appStore.ambientAudioVolume', () => {
    vi.spyOn(ambientAudio, 'isAmbientAudioSupported').mockReturnValue(true)
    vi.spyOn(ambientAudio, 'setAmbientVolume').mockImplementation(() => {})

    render(<AmbientPlayer />)
    fireEvent.change(screen.getByLabelText('Głośność ambientu'), { target: { value: '0.7' } })

    expect(useAppStore.getState().ambientAudioVolume).toBe(0.7)
  })
})
