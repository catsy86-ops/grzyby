import { useEffect } from 'react'
import { useAppStore } from '../stores/appStore'
import {
  isAmbientAudioSupported,
  pauseAmbientAudio,
  resumeAmbientAudio,
  setAmbientVolume,
  startAmbientAudio,
  stopAmbientAudio,
} from '../utils/ambientAudio'

export interface UseAmbientAudioResult {
  isSupported: boolean
  enabled: boolean
  setEnabled: (enabled: boolean) => void
  volume: number
  setVolume: (volume: number) => void
}

// Muzyka/ambient w tle - zawsze wyłączona przy starcie apki (patrz appStore.ts,
// `ambientAudioEnabled` celowo nie jest persystowane), włączana wyłącznie przez `setEnabled(true)`
// wywołane bezpośrednio z kliknięcia w AmbientPlayer.tsx - to jedyne miejsce, które faktycznie
// odblokowuje AudioContext gestem użytkownika. Pauza (nie pełne zatrzymanie) gdy karta w tle,
// tym samym wzorcem co pauza GPS w useMapGeolocation.ts - dźwięk w zablokowanym telefonie w
// kieszeni nie ma sensu i tylko drenowałby baterię.
export function useAmbientAudio(): UseAmbientAudioResult {
  const enabled = useAppStore((s) => s.ambientAudioEnabled)
  const setEnabled = useAppStore((s) => s.setAmbientAudioEnabled)
  const volume = useAppStore((s) => s.ambientAudioVolume)
  const setVolume = useAppStore((s) => s.setAmbientAudioVolume)

  useEffect(() => {
    if (!enabled) {
      stopAmbientAudio()
      return
    }
    startAmbientAudio(volume)

    function handleVisibilityChange() {
      if (document.visibilityState === 'hidden') pauseAmbientAudio()
      else resumeAmbientAudio()
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      stopAmbientAudio()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- głośność aktualizowana osobnym
    // efektem niżej, żeby przeciąganie suwaka nie restartowało całego grafu audio od zera
  }, [enabled])

  useEffect(() => {
    if (enabled) setAmbientVolume(volume)
  }, [enabled, volume])

  return { isSupported: isAmbientAudioSupported(), enabled, setEnabled, volume, setVolume }
}
