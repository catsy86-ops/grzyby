import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { IdentifyView } from './IdentifyView'
import * as mushroomModel from '../../utils/mushroomModel'
import * as mushroomWorkerClient from '../../utils/mushroomWorkerClient'

vi.mock('../../utils/mushroomModel', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../utils/mushroomModel')>()
  return { ...actual, isModelAvailable: vi.fn(), loadDatasetReviewed: vi.fn() }
})

vi.mock('../../utils/mushroomWorkerClient', () => ({
  identifyMushroomInWorker: vi.fn(),
}))

function makeImageFile(name = 'grzyb.jpg') {
  return new File(['dane-zdjecia'], name, { type: 'image/jpeg' })
}

function selectFileInput(file: File) {
  const input = document.querySelector('input[type="file"]') as HTMLInputElement
  fireEvent.change(input, { target: { files: [file] } })
}

describe('IdentifyView', () => {
  beforeEach(() => {
    // Uwaga: celowo NIE przez vi.stubGlobal/vi.unstubAllGlobals - to zdmuchnęłoby też mock
    // matchMedia z vitest.setup.ts (ustawiony raz na plik testowy, nie przed każdym testem),
    // od czego zależy useAutoAnimate używany przez IdentifyView.
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-preview')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn().mockResolvedValue({ width: 224, height: 224 } as unknown as ImageBitmap),
    )
    // Domyślnie "zrecenzjonowany" w testach niezwiązanych z tą flagą - patrz opisane niżej testy
    // `datasetReviewed`, gdzie wartość jest jawnie nadpisywana.
    vi.mocked(mushroomModel.loadDatasetReviewed).mockResolvedValue(true)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.mocked(mushroomModel.isModelAvailable).mockReset()
    vi.mocked(mushroomModel.loadDatasetReviewed).mockReset()
    vi.mocked(mushroomWorkerClient.identifyMushroomInWorker).mockReset()
  })

  async function selectFileAndClickIdentify() {
    vi.mocked(mushroomModel.isModelAvailable).mockResolvedValue(true)
    render(<IdentifyView />)
    selectFileInput(makeImageFile())
    const button = await screen.findByRole('button', { name: /rozpoznaj gatunek/i })
    await waitFor(() => expect(button).toBeEnabled())
    fireEvent.click(button)
  }

  it('wybór pliku przez input ustawia podgląd zdjęcia', async () => {
    vi.mocked(mushroomModel.isModelAvailable).mockResolvedValue(true)
    render(<IdentifyView />)

    selectFileInput(makeImageFile())

    expect(await screen.findByAltText('Zdjęcie grzyba do rozpoznania')).toHaveAttribute(
      'src',
      'blob:mock-preview',
    )
  })

  it('odrzuca przeciągnięty plik, który nie jest obrazem', () => {
    vi.mocked(mushroomModel.isModelAvailable).mockResolvedValue(true)
    render(<IdentifyView />)

    const dropzone = screen.getByText(/lub przeciągnij zdjęcie tutaj/i).parentElement as HTMLElement
    const textFile = new File(['nie zdjecie'], 'notatka.txt', { type: 'text/plain' })
    fireEvent.drop(dropzone, { dataTransfer: { files: [textFile] } })

    expect(screen.queryByAltText('Zdjęcie grzyba do rozpoznania')).not.toBeInTheDocument()
  })

  it('pokazuje baner ostrzegawczy, gdy model nie jest dostępny', async () => {
    vi.mocked(mushroomModel.isModelAvailable).mockResolvedValue(false)
    render(<IdentifyView />)

    expect(await screen.findByText(/model rozpoznawania nie jest jeszcze zainstalowany/i)).toBeInTheDocument()
  })

  it('nie pokazuje banera ostrzegawczego, gdy model jest dostępny', async () => {
    vi.mocked(mushroomModel.isModelAvailable).mockResolvedValue(true)
    render(<IdentifyView />)

    await waitFor(() => expect(mushroomModel.isModelAvailable).toHaveBeenCalled())
    expect(screen.queryByText(/model rozpoznawania nie jest jeszcze zainstalowany/i)).not.toBeInTheDocument()
  })

  it('przycisk "Rozpoznaj gatunek" jest wyłączony, gdy model jest niedostępny', async () => {
    vi.mocked(mushroomModel.isModelAvailable).mockResolvedValue(false)
    render(<IdentifyView />)
    selectFileInput(makeImageFile())

    const button = await screen.findByRole('button', { name: /rozpoznaj gatunek/i })
    await waitFor(() => expect(button).toBeDisabled())
  })

  it('przycisk "Rozpoznaj gatunek" jest aktywny, gdy model jest dostępny', async () => {
    vi.mocked(mushroomModel.isModelAvailable).mockResolvedValue(true)
    render(<IdentifyView />)
    selectFileInput(makeImageFile())

    const button = await screen.findByRole('button', { name: /rozpoznaj gatunek/i })
    await waitFor(() => expect(button).toBeEnabled())
  })

  it('pokazuje ostrzeżenie o braku recenzji datasetu, gdy metadata.json tego nie potwierdza', async () => {
    vi.mocked(mushroomModel.isModelAvailable).mockResolvedValue(true)
    vi.mocked(mushroomModel.loadDatasetReviewed).mockResolvedValue(false)
    render(<IdentifyView />)

    expect(await screen.findByText(/nie przeszedł jeszcze formalnej, ręcznej recenzji/i)).toBeInTheDocument()
  })

  it('nie pokazuje ostrzeżenia o recenzji datasetu, gdy metadata.json ją potwierdza', async () => {
    vi.mocked(mushroomModel.isModelAvailable).mockResolvedValue(true)
    vi.mocked(mushroomModel.loadDatasetReviewed).mockResolvedValue(true)
    render(<IdentifyView />)

    await waitFor(() => expect(mushroomModel.loadDatasetReviewed).toHaveBeenCalled())
    expect(screen.queryByText(/nie przeszedł jeszcze formalnej, ręcznej recenzji/i)).not.toBeInTheDocument()
  })

  it('nie pokazuje ostrzeżenia o recenzji datasetu, gdy model w ogóle nie jest zainstalowany', async () => {
    vi.mocked(mushroomModel.isModelAvailable).mockResolvedValue(false)
    vi.mocked(mushroomModel.loadDatasetReviewed).mockResolvedValue(false)
    render(<IdentifyView />)

    await waitFor(() => expect(mushroomModel.loadDatasetReviewed).toHaveBeenCalled())
    expect(screen.queryByText(/nie przeszedł jeszcze formalnej, ręcznej recenzji/i)).not.toBeInTheDocument()
  })

  it('po kliknięciu "Rozpoznaj gatunek" renderuje wyniki z workera', async () => {
    vi.mocked(mushroomWorkerClient.identifyMushroomInWorker).mockResolvedValue([
      { species: null, labelRaw: 'borowik-szlachetny', confidence: 0.87 },
    ])

    await selectFileAndClickIdentify()

    expect((await screen.findAllByText(/borowik-szlachetny/, { exact: false })).length).toBeGreaterThan(0)
    expect(mushroomWorkerClient.identifyMushroomInWorker).toHaveBeenCalledOnce()
  })

  it('pokazuje komunikat błędu, gdy rozpoznanie w workerze zawiedzie', async () => {
    vi.mocked(mushroomWorkerClient.identifyMushroomInWorker).mockRejectedValue(new Error('worker padł'))

    await selectFileAndClickIdentify()

    expect(await screen.findByText(/nie udało się rozpoznać grzyba: worker padł/i)).toBeInTheDocument()
  })

  it('blokuje zmianę zdjęcia w trakcie trwającej analizy', async () => {
    let resolveIdentify: (value: mushroomModel.Prediction[]) => void = () => {}
    vi.mocked(mushroomWorkerClient.identifyMushroomInWorker).mockReturnValue(
      new Promise((resolve) => {
        resolveIdentify = resolve
      }),
    )

    await selectFileAndClickIdentify()

    const changePhotoButton = screen.getByRole('button', { name: /zmień zdjęcie/i })
    expect(changePhotoButton).toBeDisabled()

    resolveIdentify([])
    await waitFor(() => expect(changePhotoButton).toBeEnabled())
  })
})
