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
}

export interface Finding {
  id?: number
  speciesId: string | null
  speciesNameGuess: string | null
  latitude: number | null
  longitude: number | null
  notes: string
  createdAt: number
  tripId?: number
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
