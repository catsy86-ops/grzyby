import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useSpeechToText } from './useSpeechToText'

class FakeSpeechRecognition extends EventTarget {
  lang = ''
  continuous = false
  interimResults = false
  onresult: ((event: { results: { isFinal: boolean; 0: { transcript: string } }[]; resultIndex: number }) => void) | null =
    null
  onerror: ((event: { error: string }) => void) | null = null
  onend: (() => void) | null = null
  start = vi.fn()
  stop = vi.fn(() => this.onend?.())

  emitFinalResult(transcript: string) {
    this.onresult?.({ results: [{ isFinal: true, 0: { transcript } }], resultIndex: 0 })
  }

  emitError(error: string) {
    this.onerror?.({ error })
  }
}

describe('useSpeechToText', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('zgłasza brak wsparcia, gdy przeglądarka nie ma Web Speech API (Firefox)', () => {
    const { result } = renderHook(() => useSpeechToText(vi.fn()))
    expect(result.current.isSupported).toBe(false)
  })

  it('rozpoczyna i kończy nasłuchiwanie, przekazując finalny tekst do callbacku', () => {
    let instance: FakeSpeechRecognition | null = null
    function FakeSpeechRecognitionCtor(this: unknown) {
      instance = new FakeSpeechRecognition()
      return instance
    }
    vi.stubGlobal('window', Object.assign(window, { webkitSpeechRecognition: FakeSpeechRecognitionCtor }))

    const onFinalResult = vi.fn()
    const { result } = renderHook(() => useSpeechToText(onFinalResult))
    expect(result.current.isSupported).toBe(true)

    act(() => result.current.toggleListening())
    expect(result.current.isListening).toBe(true)
    expect(instance!.start).toHaveBeenCalledOnce()

    act(() => instance!.emitFinalResult('borowik szlachetny'))
    expect(onFinalResult).toHaveBeenCalledWith('borowik szlachetny')

    act(() => result.current.toggleListening())
    expect(instance!.stop).toHaveBeenCalledOnce()
    expect(result.current.isListening).toBe(false)
  })

  it('ustawia komunikat błędu i przerywa nasłuchiwanie, gdy rozpoznawanie zawiedzie', () => {
    let instance: FakeSpeechRecognition | null = null
    function FakeSpeechRecognitionCtor(this: unknown) {
      instance = new FakeSpeechRecognition()
      return instance
    }
    vi.stubGlobal('window', Object.assign(window, { webkitSpeechRecognition: FakeSpeechRecognitionCtor }))

    const { result } = renderHook(() => useSpeechToText(vi.fn()))
    expect(result.current.error).toBeNull()

    act(() => result.current.toggleListening())
    act(() => instance!.emitError('not-allowed'))

    expect(result.current.isListening).toBe(false)
    expect(result.current.error).toBe('Brak dostępu do mikrofonu - sprawdź uprawnienia aplikacji.')
  })
})
