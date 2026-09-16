import { useEffect, useRef, useState } from 'react'
import { useAutoAnimate } from '@formkit/auto-animate/react'
import { AnimatePresence, motion } from 'motion/react'
import { CameraIcon, Loader2Icon, TriangleAlertIcon } from 'lucide-react'
import { CameraMushroomIllustration } from '../../components/icons/illustrations'
import { isModelAvailable, type Prediction } from '../../utils/mushroomModel'
import { identifyMushroomInWorker } from '../../utils/mushroomWorkerClient'
import { PredictionCard } from './PredictionCard'
import { Alert, AlertDescription } from '../../components/ui/alert'
import { Button } from '../../components/ui/button'

export function IdentifyView() {
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [predictions, setPredictions] = useState<Prediction[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [modelReady, setModelReady] = useState<boolean | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
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

  function selectFile(file: File) {
    setError(null)
    setPredictions(null)
    const url = URL.createObjectURL(file)
    setImageUrl(url)
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    selectFile(file)
  }

  // Przerywana ramka wygląda jak strefa "przeciągnij i upuść" - dotąd nią nie była (tylko klik),
  // co na desktopie/tablecie z myszą było mylące (afordancja obiecywała coś, czego UI nie robiło).
  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setIsDragOver(false)
    const file = event.dataTransfer.files?.[0]
    if (file?.type.startsWith('image/')) selectFile(file)
  }

  async function handleIdentify() {
    if (!imageRef.current) return
    setLoading(true)
    setError(null)
    try {
      // Kompresja/pomiar - createImageBitmap jest tani (główny wątek), sama inferencja TF.js
      // liczy się w Web Workerze (patrz utils/mushroomWorkerClient.ts), żeby nie przycinać UI.
      const bitmap = await createImageBitmap(imageRef.current)
      const results = await identifyMushroomInWorker(bitmap)
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
    <div className="mx-auto flex h-full w-full max-w-md flex-col gap-4 overflow-y-auto p-4">
      <h1 className="text-xl font-semibold tracking-tight">Rozpoznaj grzyb ze zdjęcia</h1>

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

      <div
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragOver(true)
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        className={`rounded-lg border-2 border-dashed p-4 text-center transition-colors ${
          isDragOver ? 'border-primary bg-primary/5' : 'border-border'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="hidden"
        />
        {!imageUrl && (
          <CameraMushroomIllustration className="mx-auto mb-3 size-16 text-muted-foreground" />
        )}
        <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
          <CameraIcon />
          {imageUrl ? 'Zmień zdjęcie' : 'Wybierz lub zrób zdjęcie'}
        </Button>
        <p className="mt-2 text-xs text-muted-foreground">lub przeciągnij zdjęcie tutaj</p>
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
              Model jest w wersji alpha, trenowany na niewielkim, nieskuratorowanym zbiorze zdjęć —
              traktuj wynik jako bardzo zgrubną wskazówkę, nie potwierdzenie gatunku. To nie jest
              profesjonalna weryfikacja. Nigdy nie spożywaj grzyba wyłącznie na podstawie wyniku tej
              aplikacji — w razie wątpliwości skonsultuj się z mikologiem lub punktem klasyfikacji
              grzybów (Sanepid).
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
