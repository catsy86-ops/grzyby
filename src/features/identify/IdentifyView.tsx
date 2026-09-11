import { useEffect, useRef, useState } from 'react'
import { identifyMushroom, isModelAvailable, type Prediction } from '../../utils/mushroomModel'
import { PredictionCard } from './PredictionCard'

export function IdentifyView() {
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [predictions, setPredictions] = useState<Prediction[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [modelReady, setModelReady] = useState<boolean | null>(null)
  const imageRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    isModelAvailable().then(setModelReady)
  }, [])

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    setError(null)
    setPredictions(null)
    const url = URL.createObjectURL(file)
    setImageUrl(url)
  }

  async function handleIdentify() {
    if (!imageRef.current) return
    setLoading(true)
    setError(null)
    try {
      const results = await identifyMushroom(imageRef.current)
      setPredictions(results)
    } catch (err) {
      setError(
        err instanceof Error
          ? `Nie udało się rozpoznać grzyba: ${err.message}`
          : 'Nie udało się rozpoznać grzyba',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto flex h-full max-w-md flex-col gap-4 overflow-y-auto p-4">
      <h1 className="text-xl font-semibold">Rozpoznaj grzyb ze zdjęcia</h1>

      {modelReady === false && (
        <div className="rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
          Model rozpoznawania nie jest jeszcze zainstalowany w tej aplikacji (brak plików w{' '}
          <code>public/models</code>). Funkcja będzie działać po dodaniu wytrenowanego modelu TensorFlow.js.
        </div>
      )}

      <div className="rounded border-2 border-dashed border-gray-300 p-4 text-center">
        <input
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="mx-auto block text-sm"
        />
      </div>

      {imageUrl && (
        <div className="flex flex-col items-center gap-3">
          <img
            ref={imageRef}
            src={imageUrl}
            alt="Zdjęcie grzyba do rozpoznania"
            className="max-h-72 rounded shadow"
            crossOrigin="anonymous"
          />
          <button
            onClick={handleIdentify}
            disabled={loading || modelReady === false}
            className="rounded bg-green-800 px-5 py-2 text-sm font-medium text-white hover:bg-green-900 disabled:opacity-50"
          >
            {loading ? 'Analizuję...' : 'Rozpoznaj gatunek'}
          </button>
        </div>
      )}

      {error && <p className="rounded bg-red-100 p-3 text-sm text-red-800">{error}</p>}

      {predictions && (
        <div className="flex flex-col gap-3">
          <div className="rounded border border-red-300 bg-red-50 p-3 text-sm font-medium text-red-900">
            ⚠️ To nie jest profesjonalna weryfikacja. Nigdy nie spożywaj grzyba wyłącznie na podstawie
            wyniku tej aplikacji — w razie wątpliwości skonsultuj się z mikologiem lub punktem
            klasyfikacji grzybów (Sanepid).
          </div>
          {predictions.map((prediction, index) => (
            <PredictionCard key={prediction.labelRaw + index} prediction={prediction} rank={index + 1} />
          ))}
        </div>
      )}
    </div>
  )
}
