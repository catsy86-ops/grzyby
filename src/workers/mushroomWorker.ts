// Web Worker dla inferencji TF.js - `identifyMushroom()` liczyła wcześniej na głównym wątku
// (patrz utils/mushroomModel.ts), co dla większych modeli może przycinać UI (animacje, scroll)
// na czas predykcji. Worker dostaje ImageBitmap (transferable, zero kopiowania) i zwraca gotowe
// przewidywania - główny wątek zostaje wolny przez cały czas trwania inferencji.
import { identifyMushroom, type Prediction } from '../utils/mushroomModel'

interface IdentifyRequest {
  requestId: number
  bitmap: ImageBitmap
}

type IdentifyResponse =
  | { requestId: number; ok: true; predictions: Prediction[] }
  | { requestId: number; ok: false; error: string }

self.onmessage = async (event: MessageEvent<IdentifyRequest>) => {
  const { requestId, bitmap } = event.data
  try {
    const predictions = await identifyMushroom(bitmap)
    const response: IdentifyResponse = { requestId, ok: true, predictions }
    self.postMessage(response)
  } catch (err) {
    const response: IdentifyResponse = {
      requestId,
      ok: false,
      error: err instanceof Error ? err.message : 'Nieznany błąd rozpoznawania',
    }
    self.postMessage(response)
  } finally {
    bitmap.close()
  }
}
