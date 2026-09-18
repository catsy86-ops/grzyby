// Cichy leśny "ambient" (szum wiatru w koronach drzew + ledwo słyszalny, ciepły dron) generowany
// w locie przez Web Audio API - żaden plik audio nie jest pobierany ani precache'owany. To
// świadoma decyzja, nie skrót: apka nie ma żadnego legalnego źródła nagrania do użycia, a
// syntetyczny dźwięk kosztuje zero bajtów w Service Workerze (który i tak cache'uje już ~18 MB
// kafli/modelu AI) i zero ryzyka licencyjnego. Moduł trzyma jeden globalny AudioContext -
// niezależnie od tego, ile komponentów w danej chwili renderuje UI odtwarzacza, dźwięk gra raz.

function getAudioContextConstructor(): (new () => AudioContext) | null {
  if (typeof window === 'undefined') return null
  return window.AudioContext ?? (window as unknown as { webkitAudioContext?: new () => AudioContext }).webkitAudioContext ?? null
}

export function isAmbientAudioSupported(): boolean {
  return getAudioContextConstructor() != null
}

let audioContext: AudioContext | null = null
let noiseSource: AudioBufferSourceNode | null = null
let droneOscillators: OscillatorNode[] = []
let masterGain: GainNode | null = null

// Szum Browna (zintegrowany szum biały) zamiast surowego szumu białego - brzmi jak miękki wiatr/
// fala, nie jak syczenie nienastrojonego radia. Bufor 4s pętlony w kółko: losowość szumu sprawia,
// że szew pętli jest niesłyszalny, więc nie trzeba dbać o idealne dopasowanie krawędzi jak przy
// dźwięku tonalnym.
function createWindNoiseBuffer(ctx: AudioContext): AudioBuffer {
  const durationSeconds = 4
  const length = Math.floor(ctx.sampleRate * durationSeconds)
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  let lastOut = 0
  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1
    lastOut = (lastOut + 0.02 * white) / 1.02
    data[i] = lastOut * 3.5
  }
  return buffer
}

function buildGraph(ctx: AudioContext, initialVolume: number) {
  masterGain = ctx.createGain()
  masterGain.gain.value = initialVolume
  masterGain.connect(ctx.destination)

  noiseSource = ctx.createBufferSource()
  noiseSource.buffer = createWindNoiseBuffer(ctx)
  noiseSource.loop = true
  const windFilter = ctx.createBiquadFilter()
  windFilter.type = 'lowpass'
  windFilter.frequency.value = 650
  const windGain = ctx.createGain()
  windGain.gain.value = 0.6
  noiseSource.connect(windFilter).connect(windGain).connect(masterGain)
  noiseSource.start()

  // Dwa lekko rozstrojone sinusy (110 Hz + 0.5% wyżej) - klasyczny "chorus" bez efektu, tylko
  // dwa oscylatory - dają ciepłą, ledwo wyczuwalną podściółkę pod szumem wiatru, nie melodię.
  droneOscillators = [110, 110 * 1.005].map((freq) => {
    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.value = freq
    const droneGain = ctx.createGain()
    droneGain.gain.value = 0.12
    osc.connect(droneGain).connect(masterGain!)
    osc.start()
    return osc
  })
}

// Wołane wyłącznie z bezpośredniej reakcji na gest użytkownika (kliknięcie przełącznika w
// odtwarzaczu) - polityka autoplay przeglądarek odblokowuje AudioContext tylko w takim wywołaniu.
export function startAmbientAudio(volume: number): void {
  if (audioContext) {
    void audioContext.resume()
    setAmbientVolume(volume)
    return
  }
  const Ctor = getAudioContextConstructor()
  if (!Ctor) return
  audioContext = new Ctor()
  buildGraph(audioContext, volume)
}

export function pauseAmbientAudio(): void {
  void audioContext?.suspend()
}

export function resumeAmbientAudio(): void {
  void audioContext?.resume()
}

export function stopAmbientAudio(): void {
  noiseSource?.stop()
  for (const osc of droneOscillators) osc.stop()
  noiseSource = null
  droneOscillators = []
  void audioContext?.close()
  audioContext = null
  masterGain = null
}

export function setAmbientVolume(volume: number): void {
  if (!masterGain || !audioContext) return
  // `setTargetAtTime` zamiast bezpośredniego przypisania `gain.value` - suwak głośności
  // przeciągany szybko nie strzela klikami/trzaskami przy skokowych zmianach wzmocnienia.
  masterGain.gain.setTargetAtTime(volume, audioContext.currentTime, 0.05)
}
