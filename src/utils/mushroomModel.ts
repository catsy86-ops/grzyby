import type * as TF from '@tensorflow/tfjs'
import speciesData from '../data/species.json'
import type { Species } from '../db/schema'

const MODEL_URL = '/models/model.json'
// Opcjonalny plik obok model.json z kolejnością etykiet wyjściowych modelu (np. eksport z Google
// Teachable Machine, gdzie klasy trzeba nazwać dokładnie tak jak `id` w species.json). Gdy go brak,
// zakładamy kolejność klas = kolejność gatunków w species.json (tak generuje ją scripts/train-model/train.py).
const METADATA_URL = '/models/metadata.json'
const INPUT_SIZE = 224

export interface Prediction {
  species: Species | null
  labelRaw: string
  confidence: number
}

let modelPromise: Promise<TF.LayersModel> | null = null
let labelsPromise: Promise<string[]> | null = null

const DEFAULT_CLASS_LABELS: string[] = speciesData.map((s) => s.id)

interface ModelMetadata {
  labels?: unknown
}

// Odczytuje rzeczywistą kolejność klas modelu z metadata.json, jeśli jest dostępny i poprawny -
// w przeciwnym razie zakłada kolejność pozycyjną z species.json.
export async function loadClassLabels(): Promise<string[]> {
  if (!labelsPromise) {
    labelsPromise = (async () => {
      try {
        const response = await fetch(METADATA_URL)
        if (response.ok) {
          const metadata = (await response.json()) as ModelMetadata
          if (Array.isArray(metadata.labels) && metadata.labels.every((l) => typeof l === 'string')) {
            return metadata.labels as string[]
          }
        }
      } catch {
        // brak lub niepoprawny metadata.json - to oczekiwane dla modelu z train.py
      }
      return DEFAULT_CLASS_LABELS
    })()
  }
  return labelsPromise
}

// TensorFlow.js jest ładowany dynamicznie (biblioteka ~1.5MB), by nie obciążać głównego pakietu
// aplikacji dla użytkowników, którzy nie korzystają z rozpoznawania zdjęć.
async function loadModel(): Promise<TF.LayersModel> {
  if (!modelPromise) {
    const tf = await import('@tensorflow/tfjs')
    modelPromise = tf.loadLayersModel(MODEL_URL)
  }
  return modelPromise
}

let modelAvailablePromise: Promise<boolean> | null = null

// Wynik cache'owany na czas życia strony - model.json nie zmienia się bez przeładowania apki
// (nowa wersja PWA = nowy service worker = nowy load strony), więc nie ma sensu odpytywać
// sieć/cache HTTP przy każdym wejściu na zakładkę "Rozpoznaj".
export async function isModelAvailable(): Promise<boolean> {
  if (!modelAvailablePromise) {
    modelAvailablePromise = (async () => {
      try {
        const response = await fetch(MODEL_URL, { method: 'HEAD' })
        return response.ok
      } catch {
        return false
      }
    })()
  }
  return modelAvailablePromise
}

// Czysta funkcja (bez zależności od TFJS/canvasu), żeby dało się ją przetestować w izolacji.
// `labels[i]` musi być `id` gatunku z species.json odpowiadającym i-temu wyjściu modelu.
export function rankPredictions(
  scores: ArrayLike<number>,
  topN = 3,
  labels: string[] = DEFAULT_CLASS_LABELS,
): Prediction[] {
  return Array.from(scores)
    .map((confidence, index) => {
      const speciesId = labels[index]
      const species = (speciesData as Species[]).find((s) => s.id === speciesId) ?? null
      return {
        species,
        labelRaw: speciesId ?? `klasa-${index}`,
        confidence,
      }
    })
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, topN)
}

// Przyjmuje ImageBitmap (do wywołania z Web Workera - patrz workers/mushroomWorker.ts, transferable
// bez kopiowania) albo HTMLImageElement (wywołanie bezpośrednio z głównego wątku) - `tf.browser.
// fromPixels` obsługuje oba typy natywnie.
export async function identifyMushroom(imageElement: HTMLImageElement | ImageBitmap): Promise<Prediction[]> {
  const tf = await import('@tensorflow/tfjs')
  const [model, labels] = await Promise.all([loadModel(), loadClassLabels()])

  const predictions = tf.tidy(() => {
    const tensor = tf.browser
      .fromPixels(imageElement)
      .resizeBilinear([INPUT_SIZE, INPUT_SIZE])
      .toFloat()
      .div(255)
      .expandDims(0)
    return model.predict(tensor) as TF.Tensor
  })

  const scores = await predictions.data()
  predictions.dispose()

  return rankPredictions(scores as Float32Array, 3, labels)
}
