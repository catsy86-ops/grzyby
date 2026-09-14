import { useEffect, useRef, useState } from 'react'
import { useAutoAnimate } from '@formkit/auto-animate/react'
import { AnimatePresence, motion } from 'motion/react'
import { CameraIcon, Loader2Icon, TriangleAlertIcon } from 'lucide-react'
import { identifyMushroom, isModelAvailable, type Prediction } from '../../utils/mushroomModel'
import { PredictionCard } from './PredictionCard'
import { Alert, AlertDescription } from '../../components/ui/alert'
import { Button } from '../../components/ui/button'

export function IdentifyView() {
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [predictions, setPredictions] = useState<Prediction[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [modelReady, setModelReady] = useState<boolean | null>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [resultsListRef] = useAutoAnimate()

  useEffect(() => {
    isModelAvailable().then(setModelReady)
  }, [])

  // Sprząta poprzedni object URL przy każdej nowej selekcji zdjęcia i przy odmontowaniu komponentu.
  useEffect(() => {
    return () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl)
    }
  }, [imageUrl])

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
        <Alert variant="warning">
          <TriangleAlertIcon />
          <AlertDescription className="text-current">
            Model rozpoznawania nie jest jeszcze zainstalowany w tej aplikacji (brak plików w{' '}
            <code>public/models</code>). Funkcja będzie działać po dodaniu wytrenowanego modelu
            TensorFlow.js.
          </AlertDescription>
        </Alert>
      )}

      <div className="rounded-lg border-2 border-dashed border-border p-4 text-center">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="hidden"
        />
        <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
          <CameraIcon />
          {imageUrl ? 'Zmień zdjęcie' : 'Wybierz lub zrób zdjęcie'}
        </Button>
      </div>

      <AnimatePresence>
        {imageUrl && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.18 }}
            className="flex flex-col items-center gap-3"
          >
            <img
              ref={imageRef}
              src={imageUrl}
              alt="Zdjęcie grzyba do rozpoznania"
              className="max-h-72 rounded-lg shadow"
              crossOrigin="anonymous"
            />
            <Button onClick={handleIdentify} disabled={loading || modelReady === false}>
              {loading && <Loader2Icon className="animate-spin" />}
              {loading ? 'Analizuję...' : 'Rozpoznaj gatunek'}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <Alert variant="destructive-soft">
          <AlertDescription className="text-current">{error}</AlertDescription>
        </Alert>
      )}

      <div ref={resultsListRef} className="flex flex-col gap-3">
        {predictions && (
          <Alert variant="destructive-soft" className="font-medium">
            <TriangleAlertIcon />
            <AlertDescription className="text-current">
              To nie jest profesjonalna weryfikacja. Nigdy nie spożywaj grzyba wyłącznie na
              podstawie wyniku tej aplikacji — w razie wątpliwości skonsultuj się z mikologiem lub
              punktem klasyfikacji grzybów (Sanepid).
            </AlertDescription>
          </Alert>
        )}
        {predictions?.map((prediction, index) => (
          <PredictionCard key={prediction.labelRaw + index} prediction={prediction} rank={index + 1} />
        ))}
      </div>
    </div>
  )
}
