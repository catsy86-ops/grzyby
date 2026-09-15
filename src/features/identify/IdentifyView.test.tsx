import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { IdentifyView } from './IdentifyView'
import * as mushroomModel from '../../utils/mushroomModel'

vi.mock('../../utils/mushroomModel', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../utils/mushroomModel')>()
  return { ...actual, isModelAvailable: vi.fn() }
})

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
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.mocked(mushroomModel.isModelAvailable).mockReset()
  })

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
})
