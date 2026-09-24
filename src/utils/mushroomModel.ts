import type * as TF from '@tensorflow/tfjs'
import speciesData from '../data/species.json'
import type { Species } from '../db/schema'

const MODEL_URL = '/models/model.json'
// Opcjonalny plik obok model.json z kolejnością etykiet wyjściowych modelu (np. eksport z Google
// Teachable Machine, gdzie klasy trzeba nazwać dokładnie tak jak `id` w species.json). Gdy go brak,
// zakładamy kolejność klas = kolejność gatunków w species.json (tak generuje ją scripts/train-model/train.py).
const METADATA_URL = '/models/metadata.json'
export const INPUT_SIZE = 224

export interface Prediction {
  species: Species | null
  labelRaw: string
  confidence: number
}

let modelPromise: Promise<TF.LayersModel> | null = null
let metadataPromise: Promise<ModelMetadata | null> | null = null

const DEFAULT_CLASS_LABELS: string[] = speciesData.map((s) => s.id)

interface ModelMetadata {
  labels?: unknown
  temperature?: unknown
  datasetReviewed?: unknown
}

async function fetchMetadata(): Promise<ModelMetadata | null> {
  if (!metadataPromise) {
    metadataPromise = (async () => {
      try {
        const response = await fetch(METADATA_URL)
        if (response.ok) return (await response.json()) as ModelMetadata
      } catch {
        // brak lub niepoprawny metadata.json - to oczekiwane dla modelu z train.py bez tego pliku
      }
      return null
    })()
  }
  return metadataPromise
}

// Odczytuje rzeczywistą kolejność klas modelu z metadata.json, jeśli jest dostępny i poprawny -
// w przeciwnym razie zakłada kolejność pozycyjną z species.json.
export async function loadClassLabels(): Promise<string[]> {
  const metadata = await fetchMetadata()
  if (metadata && Array.isArray(metadata.labels) && metadata.labels.every((l) => typeof l === 'string')) {
    return metadata.labels as string[]
  }
  return DEFAULT_CLASS_LABELS
}

// Temperatura z kalibracji (temperature scaling) dopasowanej w train.py na zbiorze walidacyjnym -
// bez niej surowy softmax małego, douczanego transfer-learningowo modelu bywa nadmiernie pewny
// swoich (czasem błędnych) predykcji, co czyni `LOW_CONFIDENCE_THRESHOLD` w PredictionCard.tsx
// mniej znaczącym niż powinien być. Brak pola (metadata.json z Teachable Machine, albo train.py
// sprzed dodania kalibracji) = temperatura 1, czyli brak skalowania (zachowanie sprzed zmiany).
export async function loadTemperature(): Promise<number> {
  const metadata = await fetchMetadata()
  if (metadata && typeof metadata.temperature === 'number' && metadata.temperature > 0) {
    return metadata.temperature
  }
  return 1
}

// `true` tylko gdy train.py (scripts/train-model/train.py) faktycznie przepuścił dataset przez
// scripts/prepare-dataset/review-gate.mjs przed treningiem - patrz komentarz przy zapisie tego
// pola w train.py. Brak pola w metadata.json (model wytrenowany starszą wersją skryptu, sprzed
// dodania bramki recenzji, albo eksport z Teachable Machine) = `false`, nie `true` - domyślne
// zaufanie byłoby dokładnie tym błędem, który ta flaga ma ujawniać w UI (patrz IdentifyView.tsx).
export async function loadDatasetReviewed(): Promise<boolean> {
  const metadata = await fetchMetadata()
  return metadata?.datasetReviewed === true
}

// Przeskalowuje już znormalizowany (sumujący się do 1) wektor prawdopodobieństw softmax o
// temperaturę T: softmax(log(p)/T). Dla wektora softmax `log(p)` różni się od prawdziwych logitów
// modelu tylko o stałą addytywną per-próbka (softmax jest niezmienniczy na przesunięcie o stałą),
// więc ten wzór daje dokładnie taki sam wynik jak temperature scaling na prawdziwych logitach, bez
// potrzeby budowania osobnego modelu zwracającego wyjście sprzed warstwy softmax.
export function applyTemperature(probs: ArrayLike<number>, temperature: number): number[] {
  const values = Array.from(probs)
  if (temperature === 1) return values
  const logits = values.map((p) => Math.log(Math.max(p, 1e-12)) / temperature)
  const max = Math.max(...logits)
  const exps = logits.map((l) => Math.exp(l - max))
  const sum = exps.reduce((a, b) => a + b, 0)
  return exps.map((e) => e / sum)
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
  const [model, labels, temperature] = await Promise.all([loadModel(), loadClassLabels(), loadTemperature()])

  // Test-time augmentation: uśrednia predykcję ze zdjęcia oryginalnego i jego lustrzanego odbicia
  // (poziomego) zamiast pojedynczego przebiegu - kapelusz grzyba nie ma "właściwej" orientacji
  // lewo-prawo, więc odbicie to darmowa druga próbka tego samego obiektu. Tani sposób (2x koszt
  // inferencji, nie 4-8x) na zmniejszenie wariancji pojedynczego, niepewnego odczytu przy tak
  // małym zbiorze treningowym - patrz docs/MODEL-TRAINING.md.
  const averagedProbs = tf.tidy(() => {
    const base = tf.browser.fromPixels(imageElement).resizeBilinear([INPUT_SIZE, INPUT_SIZE]).toFloat().div(255)
    const flipped = base.reverse(1) // oś 1 = szerokość dla tensora [wysokość, szerokość, kanały]
    const batch = tf.stack([base, flipped])
    const predictions = model.predict(batch) as TF.Tensor
    return tf.mean(predictions, 0)
  })

  const scores = await averagedProbs.data()
  averagedProbs.dispose()

  const calibrated = applyTemperature(scores as Float32Array, temperature)
  return rankPredictions(calibrated, 3, labels)
}
