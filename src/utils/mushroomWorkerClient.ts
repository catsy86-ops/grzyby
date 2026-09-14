import type { Prediction } from './mushroomModel'

// Jeden, leniwie tworzony worker na całą sesję - model TF.js raz załadowany w workerze zostaje
// tam (loadModel()/loadClassLabels() w mushroomModel.ts cache'ują w module scope workera),
// kolejne rozpoznania nie ładują modelu ponownie.
let worker: Worker | null = null

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL('../workers/mushroomWorker.ts', import.meta.url), { type: 'module' })
  }
  return worker
}

let nextRequestId = 0

// Wysyła ImageBitmap do workera (transferable - bez kopiowania) i czeka na dopasowaną po
// requestId odpowiedź, żeby równoległe wywołania (teoretycznie możliwe) nie pomieszały wyników.
export function identifyMushroomInWorker(bitmap: ImageBitmap): Promise<Prediction[]> {
  return new Promise((resolve, reject) => {
    const w = getWorker()
    const requestId = nextRequestId++

    function handleMessage(event: MessageEvent) {
      if (event.data.requestId !== requestId) return
      w.removeEventListener('message', handleMessage)
      w.removeEventListener('error', handleError)
      if (event.data.ok) resolve(event.data.predictions)
      else reject(new Error(event.data.error))
    }
    function handleError(event: ErrorEvent) {
      w.removeEventListener('message', handleMessage)
      w.removeEventListener('error', handleError)
      reject(new Error(event.message || 'Błąd workera rozpoznawania'))
    }

    w.addEventListener('message', handleMessage)
    w.addEventListener('error', handleError)
    w.postMessage({ requestId, bitmap }, [bitmap])
  })
}
