import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Prediction } from './mushroomModel'

class MockWorker {
  listeners: Record<string, ((event: any) => void)[]> = { message: [], error: [] }
  posted: { data: unknown; transfer?: Transferable[] }[] = []

  addEventListener(type: string, handler: (event: any) => void) {
    this.listeners[type].push(handler)
  }
  removeEventListener(type: string, handler: (event: any) => void) {
    this.listeners[type] = this.listeners[type].filter((h) => h !== handler)
  }
  postMessage(data: unknown, transfer?: Transferable[]) {
    this.posted.push({ data, transfer })
  }
  emitMessage(data: unknown) {
    for (const handler of this.listeners.message) handler({ data })
  }
  emitError(message: string) {
    for (const handler of this.listeners.error) handler({ message })
  }
}

describe('identifyMushroomInWorker', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  it('rozwiązuje obietnicę wynikami dopasowanymi po requestId', async () => {
    const instances: MockWorker[] = []
    vi.stubGlobal(
      'Worker',
      class {
        constructor() {
          const instance = new MockWorker()
          instances.push(instance)
          return instance as unknown as this
        }
      },
    )

    const { identifyMushroomInWorker } = await import('./mushroomWorkerClient')
    const bitmap = { close: vi.fn() } as unknown as ImageBitmap
    const predictions: Prediction[] = [{ species: null, labelRaw: 'a', confidence: 0.9 }]

    const promise = identifyMushroomInWorker(bitmap)
    const worker = instances[0]
    const sentRequestId = (worker.posted[0].data as { requestId: number }).requestId
    worker.emitMessage({ requestId: sentRequestId, ok: true, predictions })

    await expect(promise).resolves.toEqual(predictions)
  })

  it('odrzuca obietnicę błędem z workera', async () => {
    const instances: MockWorker[] = []
    vi.stubGlobal(
      'Worker',
      class {
        constructor() {
          const instance = new MockWorker()
          instances.push(instance)
          return instance as unknown as this
        }
      },
    )

    const { identifyMushroomInWorker } = await import('./mushroomWorkerClient')
    const bitmap = { close: vi.fn() } as unknown as ImageBitmap

    const promise = identifyMushroomInWorker(bitmap)
    const worker = instances[0]
    const sentRequestId = (worker.posted[0].data as { requestId: number }).requestId
    worker.emitMessage({ requestId: sentRequestId, ok: false, error: 'boom' })

    await expect(promise).rejects.toThrow('boom')
  })

  it('ignoruje wiadomości z niepasującym requestId', async () => {
    const instances: MockWorker[] = []
    vi.stubGlobal(
      'Worker',
      class {
        constructor() {
          const instance = new MockWorker()
          instances.push(instance)
          return instance as unknown as this
        }
      },
    )

    const { identifyMushroomInWorker } = await import('./mushroomWorkerClient')
    const bitmap = { close: vi.fn() } as unknown as ImageBitmap
    const predictions: Prediction[] = [{ species: null, labelRaw: 'right', confidence: 0.5 }]

    const promise = identifyMushroomInWorker(bitmap)
    const worker = instances[0]
    const sentRequestId = (worker.posted[0].data as { requestId: number }).requestId

    worker.emitMessage({ requestId: sentRequestId + 999, ok: true, predictions: [] })
    worker.emitMessage({ requestId: sentRequestId, ok: true, predictions })

    await expect(promise).resolves.toEqual(predictions)
  })
})
