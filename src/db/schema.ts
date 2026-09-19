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
  // Liczba sztuk znalezionych w tym jednym wpisie (np. cała kępka borowików podczas jednego
  // zbierania) - niezależne od `weightGrams` (część grzybiarzy waży zbiór, część liczy sztuki,
  // niektórzy oba). `undefined` = nie podano, nie zakłada się "1" - stary format Findingu (jedno
  // znalezisko = jedno zdarzenie) zostaje domyślnym, kompatybilnym stanem.
  quantity?: number
  // Waga po wysuszeniu - typowe u grzybiarzy suszących część zbioru. Niezależne od `weightGrams`
  // (świeża waga z dnia zbioru), dodawane zwykle później, po dokończeniu suszenia, stąd tylko w
  // formularzu edycji, nie przy dodawaniu znaleziska. Pozwala pokazać ubytek wagi (świeża→sucha).
  driedWeightGrams?: number
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
  // Opcjonalny czas planowanego powrotu - pozwala na lokalne przypomnienie "wyprawa się
  // przeciąga" (patrz hooks/useOverdueTripReminder.ts), przydatne przy samotnych wyprawach bez
  // zasięgu. `undefined`/`null` = użytkownik nie podał, brak przypomnienia.
  plannedReturnAt?: number | null
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
  // Miesiąc (1-12), w którym warto ponownie sprawdzić to miejsce w przyszłym sezonie (np.
  // znaleziono tu coś obiecującego, ale za wcześnie/za późno w sezonie na pełny wysyp) - patrz
  // utils/spotRevisit.ts. `undefined` = brak flagi, nie jest to indeksowane pole Dexie (nie ma
  // potrzeby zapytań "wszystkie oflagowane" poza jednym hookiem sprawdzającym cały zbiór).
  revisitMonth?: number
  // Kiedy flaga została ustawiona - potrzebne, żeby przypomnienie nie odpaliło się od razu, gdy
  // ktoś oflaguje grzybowisko w bieżącym miesiącu (patrz shouldRemindRevisit).
  revisitFlaggedAt?: number
}

// Punkt śladu GPS zebrany podczas aktywnej wyprawy (patrz hooks/useTripTrail.ts) - rysowany jako
// trasa na mapie, nie tylko punkt startu/powrotu. Zapisywany throttlowany do ok. co 20m, nie co
// tick GPS, żeby długa wyprawa nie zapchała bazy/pamięci tysiącami niemal identycznych punktów.
export interface TripTrailPoint {
  id?: number
  tripId: number
  latitude: number
  longitude: number
  createdAt: number
}
