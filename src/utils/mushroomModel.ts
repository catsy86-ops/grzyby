import type * as TF from '@tensorflow/tfjs'
import speciesData from '../data/species.json'
import type { Species } from '../db/schema'

const MODEL_URL = '/models/model.json'
const INPUT_SIZE = 224

export interface Prediction {
  species: Species | null
  labelRaw: string
  confidence: number
}

let modelPromise: Promise<TF.LayersModel> | null = null

// Kolejność klas musi odpowiadać etykietom, na których wytrenowano model (public/models/model.json).
// Do uzupełnienia po treningu / eksporcie modelu.
const CLASS_LABELS: string[] = speciesData.map((s) => s.id)

// TensorFlow.js jest ładowany dynamicznie (biblioteka ~1.5MB), by nie obciążać głównego pakietu
// aplikacji dla użytkowników, którzy nie korzystają z rozpoznawania zdjęć.
async function loadModel(): Promise<TF.LayersModel> {
  if (!modelPromise) {
    const tf = await import('@tensorflow/tfjs')
    modelPromise = tf.loadLayersModel(MODEL_URL)
  }
  return modelPromise
}

export async function isModelAvailable(): Promise<boolean> {
  try {
    const response = await fetch(MODEL_URL, { method: 'HEAD' })
    return response.ok
  } catch {
    return false
  }
}

export async function identifyMushroom(imageElement: HTMLImageElement): Promise<Prediction[]> {
  const tf = await import('@tensorflow/tfjs')
  const model = await loadModel()

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

  const results: Prediction[] = Array.from(scores as Float32Array)
    .map((confidence, index) => {
      const speciesId = CLASS_LABELS[index]
      const species = (speciesData as Species[]).find((s) => s.id === speciesId) ?? null
      return {
        species,
        labelRaw: speciesId ?? `klasa-${index}`,
        confidence,
      }
    })
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 3)

  return results
}
