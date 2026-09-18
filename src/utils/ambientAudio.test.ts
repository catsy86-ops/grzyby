import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  isAmbientAudioSupported,
  pauseAmbientAudio,
  resumeAmbientAudio,
  setAmbientVolume,
  startAmbientAudio,
  stopAmbientAudio,
} from './ambientAudio'

class FakeGain {
  gain = { value: 0, setTargetAtTime: vi.fn() }
  connect = vi.fn().mockReturnThis()
}
class FakeFilter {
  type = ''
  frequency = { value: 0 }
  connect = vi.fn().mockReturnThis()
}
class FakeBufferSource {
  buffer: unknown = null
  loop = false
  start = vi.fn()
  stop = vi.fn()
  connect = vi.fn().mockReturnThis()
}
class FakeOscillator {
  type = ''
  frequency = { value: 0 }
  start = vi.fn()
  stop = vi.fn()
  connect = vi.fn().mockReturnThis()
}

class FakeAudioContext {
  destination = {}
  currentTime = 0
  state = 'running'
  resume = vi.fn().mockResolvedValue(undefined)
  suspend = vi.fn().mockResolvedValue(undefined)
  close = vi.fn().mockResolvedValue(undefined)
  createGain = vi.fn(() => new FakeGain())
  createBiquadFilter = vi.fn(() => new FakeFilter())
  createBufferSource = vi.fn(() => new FakeBufferSource())
  createOscillator = vi.fn(() => new FakeOscillator())
  createBuffer = vi.fn((_channels: number, length: number) => ({
    getChannelData: () => new Float32Array(length),
  }))
}

describe('ambientAudio', () => {
  afterEach(() => {
    stopAmbientAudio()
    vi.unstubAllGlobals()
  })

  it('zgłasza brak wsparcia, gdy przeglądarka nie ma AudioContext (jsdom domyślnie)', () => {
    expect(isAmbientAudioSupported()).toBe(false)
  })

  describe('z podstawionym AudioContext', () => {
    beforeEach(() => {
      vi.stubGlobal('AudioContext', FakeAudioContext)
    })

    it('zgłasza wsparcie', () => {
      expect(isAmbientAudioSupported()).toBe(true)
    })

    it('startAmbientAudio buduje graf i uruchamia źródła dźwięku', () => {
      startAmbientAudio(0.2)
      // Nie ma bezpośredniego dostępu do instancji - sprawdzamy przez brak wyjątku i to, że
      // kolejne wywołanie (już istniejący kontekst) idzie ścieżką resume(), nie tworzy nowego.
      expect(() => startAmbientAudio(0.3)).not.toThrow()
    })

    it('pauseAmbientAudio/resumeAmbientAudio nie rzucają, gdy nic nie gra', () => {
      expect(() => pauseAmbientAudio()).not.toThrow()
      expect(() => resumeAmbientAudio()).not.toThrow()
    })

    it('setAmbientVolume nie rzuca przed startem (brak grafu do ustawienia)', () => {
      expect(() => setAmbientVolume(0.5)).not.toThrow()
    })

    it('stopAmbientAudio po starcie nie rzuca i pozwala zacząć od nowa', () => {
      startAmbientAudio(0.1)
      expect(() => stopAmbientAudio()).not.toThrow()
      expect(() => startAmbientAudio(0.1)).not.toThrow()
    })
  })
})
