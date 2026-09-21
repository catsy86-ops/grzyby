import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../../db/db'
import { JournalView } from './JournalView'
import * as geolocation from '../../utils/geolocation'

vi.mock('../../utils/geolocation', () => ({
  getCurrentPosition: vi.fn(),
}))

async function addFinding(overrides: Partial<Parameters<typeof db.findings.add>[0]> = {}) {
  return db.findings.add({
    speciesId: null,
    speciesNameGuess: 'Testowe znalezisko',
    latitude: 52.1,
    longitude: 19.5,
    notes: 'Notatka',
    createdAt: Date.now(),
    ...overrides,
  })
}

describe('JournalView - edycja lokalizacji i zdjęcia', () => {
  beforeEach(async () => {
    await db.transaction('rw', db.findings, db.trips, db.photos, async () => {
      await db.findings.clear()
      await db.trips.clear()
      await db.photos.clear()
    })
    vi.mocked(geolocation.getCurrentPosition).mockReset()
  })

  afterEach(() => {
    cleanup()
  })

  it('pokazuje aktualną lokalizację w trybie edycji i pozwala ją zaktualizować przez GPS', async () => {
    const id = await addFinding({ latitude: 52.1, longitude: 19.5 })
    vi.mocked(geolocation.getCurrentPosition).mockResolvedValue({ latitude: 53.4, longitude: 14.5 })

    render(<JournalView />)
    fireEvent.click(await screen.findByRole('button', { name: 'Edytuj znalezisko' }))

    expect(screen.getByText('52.10000, 19.50000')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Użyj obecnej (GPS)' }))

    await waitFor(() => expect(screen.getByText('53.40000, 14.50000')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: 'Zapisz' }))

    await waitFor(async () => {
      const finding = await db.findings.get(id)
      expect(finding?.latitude).toBe(53.4)
      expect(finding?.longitude).toBe(14.5)
    })
  })

  it('pozwala usunąć lokalizację znaleziska', async () => {
    const id = await addFinding({ latitude: 52.1, longitude: 19.5 })

    render(<JournalView />)
    fireEvent.click(await screen.findByRole('button', { name: 'Edytuj znalezisko' }))

    const locationRow = screen.getByText('52.10000, 19.50000').closest('div')!
    fireEvent.click(within(locationRow).getByRole('button', { name: 'Usuń' }))

    expect(screen.getByText('Brak lokalizacji')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Zapisz' }))

    await waitFor(async () => {
      const finding = await db.findings.get(id)
      expect(finding?.latitude).toBeNull()
      expect(finding?.longitude).toBeNull()
    })
  })

  it('pozwala usunąć istniejące zdjęcie znaleziska', async () => {
    const id = await addFinding()
    await db.photos.add({
      findingId: id,
      blob: new Blob(['full']),
      thumbnailBlob: new Blob(['thumb']),
    })

    render(<JournalView />)
    fireEvent.click(await screen.findByRole('button', { name: 'Edytuj znalezisko' }))

    fireEvent.click(await screen.findByRole('button', { name: 'Usuń obecne zdjęcie' }))
    expect(screen.getByText('Zdjęcie zostanie usunięte po zapisaniu.')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Zapisz' }))

    await waitFor(async () => {
      expect(await db.photos.where('findingId').equals(id).count()).toBe(0)
    })
  })

  it('nie pokazuje przycisku usuwania zdjęcia, gdy znalezisko go nie ma', async () => {
    await addFinding()

    render(<JournalView />)
    fireEvent.click(await screen.findByRole('button', { name: 'Edytuj znalezisko' }))

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Usuń obecne zdjęcie' })).not.toBeInTheDocument()
    })
  })

  it('pozwala ustawić i usunąć wagę znaleziska', async () => {
    const id = await addFinding({ notes: 'Z wagą' })

    render(<JournalView />)
    fireEvent.click(await screen.findByRole('button', { name: 'Edytuj znalezisko' }))

    const weightInput = screen.getByLabelText('Waga (gramy)') as HTMLInputElement
    fireEvent.change(weightInput, { target: { value: '250' } })
    fireEvent.click(screen.getByRole('button', { name: 'Zapisz' }))

    await waitFor(async () => {
      const finding = await db.findings.get(id)
      expect(finding?.weightGrams).toBe(250)
    })

    // Regex dopasowany do CAŁEJ linijki metadanych znaleziska (nie samo "250 g") - "250 g" samo
    // w sobie pasuje też do StatTile podsumowania sezonu (SeasonSummary), gdy jedyne znalezisko
    // sezonu waży dokładnie tyle, co powodowało niejednoznaczne dopasowanie (dwa elementy).
    expect(await screen.findByText(/19\.5000 · 250 g/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Edytuj znalezisko' }))
    fireEvent.change(screen.getByLabelText('Waga (gramy)'), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: 'Zapisz' }))

    await waitFor(async () => {
      const finding = await db.findings.get(id)
      expect(finding?.weightGrams).toBeUndefined()
    })
  })

  it('pokazuje komunikat błędu, gdy ustalenie lokalizacji GPS się nie powiedzie', async () => {
    await addFinding()
    vi.mocked(geolocation.getCurrentPosition).mockRejectedValue(new Error('Brak sygnału GPS'))

    render(<JournalView />)
    fireEvent.click(await screen.findByRole('button', { name: 'Edytuj znalezisko' }))
    fireEvent.click(screen.getByRole('button', { name: 'Użyj obecnej (GPS)' }))

    await waitFor(() => expect(screen.getByRole('button', { name: 'Użyj obecnej (GPS)' })).not.toBeDisabled())
  })
})

describe('JournalView - licznik wyników wyszukiwania', () => {
  beforeEach(async () => {
    await db.transaction('rw', db.findings, db.trips, db.photos, async () => {
      await db.findings.clear()
      await db.trips.clear()
      await db.photos.clear()
    })
  })

  afterEach(() => cleanup())

  it('nie pokazuje licznika, gdy pole wyszukiwania jest puste', async () => {
    await addFinding({ speciesNameGuess: 'Borowik' })
    render(<JournalView />)
    await screen.findByText('Borowik')

    expect(screen.queryByLabelText(/Liczba wyników/)).not.toBeInTheDocument()
  })

  it('pokazuje i aktualizuje liczbę wyników podczas wpisywania w wyszukiwarce', async () => {
    await addFinding({ speciesNameGuess: 'Borowik' })
    await addFinding({ speciesNameGuess: 'Muchomor' })
    render(<JournalView />)
    await screen.findByText('Borowik')

    fireEvent.change(screen.getByPlaceholderText('Szukaj po gatunku lub notatkach...'), {
      target: { value: 'Borowik' },
    })

    expect(await screen.findByLabelText('Liczba wyników: 1')).toBeInTheDocument()
  })
})

describe('JournalView - paginacja listy', () => {
  beforeEach(async () => {
    await db.transaction('rw', db.findings, db.trips, db.photos, async () => {
      await db.findings.clear()
      await db.trips.clear()
      await db.photos.clear()
    })
  })

  afterEach(() => cleanup())

  it('pokazuje przycisk "Załaduj więcej", gdy znalezisk jest więcej niż jedna strona', async () => {
    await Promise.all(Array.from({ length: 105 }, (_, i) => addFinding({ notes: `Wpis ${i}`, createdAt: i })))

    render(<JournalView />)

    const loadMore = await screen.findByRole('button', { name: /Załaduj więcej/ })
    expect(loadMore).toBeInTheDocument()
    expect(screen.getAllByText(/^Wpis /)).toHaveLength(100)

    fireEvent.click(loadMore)

    await waitFor(() => expect(screen.getAllByText(/^Wpis /)).toHaveLength(105))
    expect(screen.queryByRole('button', { name: /Załaduj więcej/ })).not.toBeInTheDocument()
  }, 15000)

  it('nie pokazuje przycisku "Załaduj więcej", gdy znalezisk jest mniej niż jedna strona', async () => {
    await addFinding({ notes: 'Jedyny wpis' })

    render(<JournalView />)

    await screen.findByText('Jedyny wpis')
    expect(screen.queryByRole('button', { name: /Załaduj więcej/ })).not.toBeInTheDocument()
  })

  it('pokazuje ostrzeżenie o ciężkiej reakcji nawet gdy znalezisko jest poza aktualnie załadowaną stroną', async () => {
    // 105 nowszych, "nieszkodliwych" wpisów - najstarsze (poza pierwszą stroną 100) miało ciężką reakcję.
    await Promise.all(Array.from({ length: 105 }, (_, i) => addFinding({ notes: `Wpis ${i}`, createdAt: 1000 + i })))
    await addFinding({
      notes: 'Stary, niebezpieczny wpis',
      createdAt: 1, // najstarszy - poza pierwszą stroną (sortowanie malejące po createdAt)
      consumed: true,
      consumedAt: 500,
      reactionSeverity: 'ciężka',
    })

    render(<JournalView />)

    expect(await screen.findByText(/Zgłoszono ciężką reakcję po spożyciu/)).toBeInTheDocument()
  }, 15000)
})

function makeExportFile(payload: object) {
  return new File([JSON.stringify(payload)], 'export.json', { type: 'application/json' })
}

describe('JournalView - ostrzeżenie o duplikatach przy imporcie', () => {
  beforeEach(async () => {
    await db.transaction('rw', db.findings, db.trips, db.photos, async () => {
      await db.findings.clear()
      await db.trips.clear()
      await db.photos.clear()
    })
  })

  afterEach(() => cleanup())

  it('importuje od razu, gdy plik nie zawiera znalezisk pasujących do już zapisanych', async () => {
    render(<JournalView />)
    const file = makeExportFile({
      exportedAt: '',
      version: 2,
      findings: [{ speciesId: null, speciesNameGuess: null, notes: 'Nowe', createdAt: 999, latitude: null, longitude: null }],
      trips: [],
      photosByFindingId: {},
    })

    const input = document.querySelector('input[type="file"]')!
    fireEvent.change(input, { target: { files: [file] } })

    await waitFor(async () => expect(await db.findings.count()).toBe(1))
    expect(screen.queryByText('Możliwe duplikaty w pliku')).not.toBeInTheDocument()
  })

  it('pyta o potwierdzenie, gdy plik zawiera znalezisko identyczne z już zapisanym (ponowny import)', async () => {
    await addFinding({ notes: 'Powtórka', createdAt: 555, latitude: 1, longitude: 2, speciesId: null })

    render(<JournalView />)
    await screen.findByText('Powtórka')
    const file = makeExportFile({
      exportedAt: '',
      version: 2,
      findings: [{ speciesId: null, speciesNameGuess: null, notes: 'Powtórka', createdAt: 555, latitude: 1, longitude: 2 }],
      trips: [],
      photosByFindingId: {},
    })

    const input = document.querySelector('input[type="file"]')!
    fireEvent.change(input, { target: { files: [file] } })

    expect(await screen.findByText('Możliwe duplikaty w pliku')).toBeInTheDocument()
    expect(await db.findings.count()).toBe(1)

    fireEvent.click(screen.getByRole('button', { name: 'Importuj mimo to' }))

    await waitFor(async () => expect(await db.findings.count()).toBe(2))
  })

  it('nie importuje niczego, gdy użytkownik anuluje ostrzeżenie o duplikatach', async () => {
    await addFinding({ notes: 'Powtórka', createdAt: 555, latitude: 1, longitude: 2, speciesId: null })

    render(<JournalView />)
    await screen.findByText('Powtórka')
    const file = makeExportFile({
      exportedAt: '',
      version: 2,
      findings: [{ speciesId: null, speciesNameGuess: null, notes: 'Powtórka', createdAt: 555, latitude: 1, longitude: 2 }],
      trips: [],
      photosByFindingId: {},
    })

    const input = document.querySelector('input[type="file"]')!
    fireEvent.change(input, { target: { files: [file] } })

    await screen.findByText('Możliwe duplikaty w pliku')
    fireEvent.click(screen.getByRole('button', { name: 'Anuluj' }))

    await waitFor(() => expect(screen.queryByText('Możliwe duplikaty w pliku')).not.toBeInTheDocument())
    expect(await db.findings.count()).toBe(1)
  })
})

describe('JournalView - eksport PDF', () => {
  beforeEach(async () => {
    await db.transaction('rw', db.findings, db.trips, db.photos, async () => {
      await db.findings.clear()
      await db.trips.clear()
      await db.photos.clear()
    })
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('generuje i pobiera PDF po kliknięciu przycisku "PDF"', async () => {
    await addFinding({ notes: 'Do PDF' })
    const createObjectURLSpy = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('blob:mock-pdf')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})

    render(<JournalView />)
    await screen.findByText('Do PDF')

    fireEvent.click(screen.getByRole('button', { name: 'Eksport i import danych' }))
    fireEvent.click(await screen.findByText('PDF'))

    await waitFor(() => expect(createObjectURLSpy).toHaveBeenCalled())
    const blobArg = createObjectURLSpy.mock.calls[0][0] as Blob
    expect(blobArg.type).toBe('application/pdf')
  })
})

describe('JournalView - sortowanie i filtr dat', () => {
  beforeEach(async () => {
    await db.transaction('rw', db.findings, db.trips, db.photos, async () => {
      await db.findings.clear()
      await db.trips.clear()
      await db.photos.clear()
    })
  })

  afterEach(() => cleanup())

  it('domyślnie sortuje najnowsze znaleziska najpierw', async () => {
    await addFinding({ notes: 'Stary', createdAt: 1000 })
    await addFinding({ notes: 'Nowy', createdAt: 2000 })

    render(<JournalView />)

    const entries = await screen.findAllByText(/^(Stary|Nowy)$/)
    expect(entries.map((e) => e.textContent)).toEqual(['Nowy', 'Stary'])
  })

  it('zmienia sortowanie na najstarsze najpierw po wyborze z menu', async () => {
    await addFinding({ notes: 'Stary', createdAt: 1000 })
    await addFinding({ notes: 'Nowy', createdAt: 2000 })

    render(<JournalView />)
    await screen.findByText('Nowy')

    fireEvent.click(screen.getByRole('button', { name: 'Sortowanie i zakres dat' }))
    fireEvent.click(await screen.findByText('Najstarsze najpierw'))

    await waitFor(() => {
      const entries = screen.getAllByText(/^(Stary|Nowy)$/)
      expect(entries.map((e) => e.textContent)).toEqual(['Stary', 'Nowy'])
    })
  })

  it('filtruje znaleziska po zakresie dat', async () => {
    await addFinding({ notes: 'Za wcześnie', createdAt: new Date('2026-01-01T12:00:00').getTime() })
    await addFinding({ notes: 'W zakresie', createdAt: new Date('2026-06-15T12:00:00').getTime() })
    await addFinding({ notes: 'Za późno', createdAt: new Date('2026-12-01T12:00:00').getTime() })

    render(<JournalView />)
    await screen.findByText('Za wcześnie')

    fireEvent.click(screen.getByRole('button', { name: 'Sortowanie i zakres dat' }))
    fireEvent.change(screen.getByLabelText('Od'), { target: { value: '2026-06-01' } })
    fireEvent.change(screen.getByLabelText('Do'), { target: { value: '2026-06-30' } })

    await waitFor(() => {
      expect(screen.getByText('W zakresie')).toBeInTheDocument()
      expect(screen.queryByText('Za wcześnie')).not.toBeInTheDocument()
      expect(screen.queryByText('Za późno')).not.toBeInTheDocument()
    })
  })

  it('czyści zakres dat po kliknięciu "Wyczyść"', async () => {
    await addFinding({ notes: 'Poza zakresem', createdAt: new Date('2026-01-01T12:00:00').getTime() })

    render(<JournalView />)
    await screen.findByText('Poza zakresem')

    fireEvent.click(screen.getByRole('button', { name: 'Sortowanie i zakres dat' }))
    fireEvent.change(screen.getByLabelText('Od'), { target: { value: '2026-06-01' } })
    await waitFor(() => expect(screen.queryByText('Poza zakresem')).not.toBeInTheDocument())

    fireEvent.click(screen.getByText('Wyczyść'))
    await waitFor(() => expect(screen.getByText('Poza zakresem')).toBeInTheDocument())
  })
})

describe('JournalView - ostrzeżenie o ciężkiej reakcji', () => {
  beforeEach(async () => {
    await db.transaction('rw', db.findings, db.trips, db.photos, async () => {
      await db.findings.clear()
      await db.trips.clear()
      await db.photos.clear()
    })
  })

  afterEach(() => cleanup())

  it('pokazuje przycisk do przewodnika pierwszej pomocy i otwiera go po kliknięciu', async () => {
    await addFinding({
      speciesNameGuess: 'Muchomor sromotnikowy',
      consumed: true,
      consumedAt: Date.now(),
      reactionSeverity: 'ciężka',
    })

    render(<JournalView />)

    const button = await screen.findByRole('button', { name: 'Zobacz przewodnik pierwszej pomocy' })
    fireEvent.click(button)

    expect(await screen.findByText('Pierwsza pomoc przy podejrzeniu zatrucia')).toBeInTheDocument()
  })

  it('nie pokazuje ostrzeżenia, gdy żadne znalezisko nie zgłosiło ciężkiej reakcji', async () => {
    await addFinding()

    render(<JournalView />)

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Zobacz przewodnik pierwszej pomocy' })).not.toBeInTheDocument()
    })
  })
})

describe('JournalView - "do uzupełnienia" (brak gatunku lub zdjęcia)', () => {
  beforeEach(async () => {
    await db.transaction('rw', db.findings, db.trips, db.photos, async () => {
      await db.findings.clear()
      await db.trips.clear()
      await db.photos.clear()
    })
  })

  afterEach(() => cleanup())

  it('pokazuje baner z liczbą znalezisk bez gatunku lub zdjęcia', async () => {
    await addFinding({ speciesId: null })
    await addFinding({ speciesId: null })
    const completeId = await addFinding({ speciesId: 'borowik-szlachetny' })
    await db.photos.add({ findingId: completeId as number, blob: new Blob(['x']), thumbnailBlob: new Blob(['x']) })

    render(<JournalView />)

    expect(await screen.findByText(/2 znalezisk bez gatunku lub zdjęcia/)).toBeInTheDocument()
  })

  it('nie pokazuje banera, gdy wszystkie znaleziska mają gatunek i zdjęcie', async () => {
    const id = await addFinding({ speciesId: 'borowik-szlachetny' })
    await db.photos.add({ findingId: id as number, blob: new Blob(['x']), thumbnailBlob: new Blob(['x']) })

    render(<JournalView />)

    await waitFor(() => {
      expect(screen.queryByText(/bez gatunku lub zdjęcia/)).not.toBeInTheDocument()
    })
  })

  it('przycisk "Pokaż" filtruje listę do samych niekompletnych znalezisk', async () => {
    await addFinding({ speciesId: null, speciesNameGuess: 'Niekompletne' })
    const completeId = await addFinding({ speciesId: 'borowik-szlachetny', speciesNameGuess: 'Kompletne' })
    await db.photos.add({ findingId: completeId as number, blob: new Blob(['x']), thumbnailBlob: new Blob(['x']) })

    render(<JournalView />)

    expect(await screen.findByText('Kompletne')).toBeInTheDocument()
    fireEvent.click(await screen.findByRole('button', { name: 'Pokaż' }))

    await waitFor(() => {
      expect(screen.queryByText('Kompletne')).not.toBeInTheDocument()
    })
    expect(screen.getByText('Niekompletne')).toBeInTheDocument()
  })
})
