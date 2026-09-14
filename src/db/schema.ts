export type EdibilityStatus = 'jadalny' | 'warunkowo-jadalny' | 'niejadalny' | 'trujący' | 'śmiertelnie-trujący'

export interface Species {
  id: string
  nameCommon: string
  nameLatin: string
  edibility: EdibilityStatus
  description: string
  habitat: string
  season: string
  lookalikes: string[]
  imageUrls: string[]
  // Porady dot. czyszczenia, suszenia/mrożenia i przyrządzania - tylko dla gatunków jadalnych/
  // warunkowo-jadalnych (edibility). Zwięzłe wskazówki, nie pełne przepisy z odmierzonymi
  // składnikami - to atlas grzybów, nie książka kucharska.
  preparationTips?: string
  // Status ochrony prawnej w Polsce (Rozporządzenie Ministra Środowiska ws. ochrony gatunkowej
  // grzybów) - niezależny od `edibility` (gatunek trujący też może być chroniony, jak borowik
  // szatański). Brak pola = niechroniony wg stanu zweryfikowanego 2026-09-14 (Wikipedia PL).
  legalProtection?: string
}

export type ReactionSeverity = 'brak' | 'lekka' | 'ciężka'

export interface Finding {
  id?: number
  speciesId: string | null
  speciesNameGuess: string | null
  latitude: number | null
  longitude: number | null
  notes: string
  createdAt: number
  tripId?: number
  // Nazwane, zapisane miejsce (np. "grzybowisko pod lasem") - niezależne od `tripId` (jedna
  // wyprawa może dotknąć kilku grzybowisk, jedno grzybowisko odwiedzane jest w wielu wyprawach).
  spotId?: number
  weightGrams?: number
  // Śledzenie spożycia i ewentualnej reakcji - pomaga powiązać objawy zatrucia
  // z konkretnym znaleziskiem, zwłaszcza że toksyny niektórych gatunków działają
  // z opóźnieniem (nawet 6-24h).
  consumed?: boolean
  consumedAt?: number | null
  reactionSeverity?: ReactionSeverity | null
  reactionNotes?: string
}

// Zdjęcia trzymane w osobnej tabeli, żeby listy/mapa (findings.toArray()) nie musiały
// odczytywać dużych blobów tylko po to, by wyświetlić znaczniki czy tekst.
export interface Photo {
  id?: number
  findingId: number
  blob: Blob
  // Skompresowana miniatura (max 200px, JPEG) do szybkiego wyświetlania w listach/mapie
  // bez ładowania pełnego zdjęcia.
  thumbnailBlob: Blob
}

export interface Trip {
  id?: number
  startedAt: number
  endedAt: number | null
  name: string
  notes: string
}

// Osobiste "grzybowisko" - nazwane, stałe miejsce (w odróżnieniu od Trip, który jest pojedynczą,
// czasową wyprawą) odwiedzane wielokrotnie w czasie, np. "sosnowy zagajnik za rzeką".
export interface Spot {
  id?: number
  name: string
  latitude: number
  longitude: number
  notes: string
  createdAt: number
}
