import { useEffect, useRef, useState } from 'react'

// Web Speech API - wspierane w Chrome/Android (prefiksowane `webkitSpeechRecognition`), brak
// wsparcia w Firefox i tylko częściowe/niepewne w Safari. Typ nie jest częścią lib.dom.d.ts w
// tym projekcie (brak @types/dom-speech-recognition), stąd minimalna ręczna deklaracja
// obejmująca tylko to, czego faktycznie używa ten hook.
interface SpeechRecognitionResultLike {
  isFinal: boolean
  0: { transcript: string }
}
interface SpeechRecognitionEventLike extends Event {
  resultIndex: number
  results: ArrayLike<SpeechRecognitionResultLike>
}
interface SpeechRecognitionLike extends EventTarget {
  lang: string
  continuous: boolean
  interimResults: boolean
  start: () => void
  stop: () => void
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onerror: ((event: Event) => void) | null
  onend: (() => void) | null
}
type SpeechRecognitionConstructor = new () => SpeechRecognitionLike

interface WindowWithSpeechRecognition extends Window {
  SpeechRecognition?: SpeechRecognitionConstructor
  webkitSpeechRecognition?: SpeechRecognitionConstructor
}

export interface UseSpeechToTextResult {
  isSupported: boolean
  isListening: boolean
  toggleListening: () => void
}

// Dyktowanie głosowe notatki/gatunku - w terenie, w rękawiczkach lub z rękami zajętymi
// koszykiem/nożem, wpisywanie tekstu na ekranie dotykowym jest niewygodne albo niemożliwe.
// `onFinalResult` dostaje wyłącznie ostateczny (nie "interim") rozpoznany tekst pojedynczej
// wypowiedzi - wołający decyduje, czy nadpisać, czy dopisać do istniejącej wartości pola.
// Całkowicie lokalne po stronie przeglądarki na Androidzie (silnik rozpoznawania systemowy) -
// nie jest to serwis apki, więc nie wprowadza nowej zależności sieciowej z jej strony.
export function useSpeechToText(onFinalResult: (text: string) => void): UseSpeechToTextResult {
  const [isListening, setIsListening] = useState(false)
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const onFinalResultRef = useRef(onFinalResult)
  useEffect(() => {
    onFinalResultRef.current = onFinalResult
  }, [onFinalResult])

  const Ctor =
    typeof window !== 'undefined'
      ? ((window as WindowWithSpeechRecognition).SpeechRecognition ??
        (window as WindowWithSpeechRecognition).webkitSpeechRecognition)
      : undefined
  const isSupported = Ctor != null

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop()
    }
  }, [])

  function toggleListening() {
    if (!Ctor) return

    if (isListening) {
      recognitionRef.current?.stop()
      return
    }

    const recognition = new Ctor()
    recognition.lang = 'pl-PL'
    recognition.continuous = false
    recognition.interimResults = false
    recognition.onresult = (event) => {
      const result = event.results[event.results.length - 1]
      if (result?.isFinal) onFinalResultRef.current(result[0].transcript.trim())
    }
    recognition.onerror = () => setIsListening(false)
    recognition.onend = () => setIsListening(false)

    recognitionRef.current = recognition
    recognition.start()
    setIsListening(true)
  }

  return { isSupported, isListening, toggleListening }
}
