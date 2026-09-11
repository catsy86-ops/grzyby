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
  photoBlob: Blob | null
  latitude: number | null
  longitude: number | null
  notes: string
  createdAt: number
  tripId?: number
}

export interface Trip {
  id?: number
  startedAt: number
  endedAt: number | null
  name: string
  notes: string
}
