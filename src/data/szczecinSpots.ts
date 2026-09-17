import rawSpots from './szczecinSpots.json'

// Kuratorowana, statyczna lista sprawdzonych grzybowisk w okolicach Szczecina (patrz
// SzczecinSpotsPanel.tsx) - w odróżnieniu od db.spots (Spot) to NIE są miejsca użytkownika,
// tylko zweryfikowane źródłowo (Wikipedia, lokalne portale turystyczne) publiczne lokalizacje,
// wspólne dla wszystkich instalacji apki, nieedytowalne z poziomu UI.
export interface SzczecinSpot {
  id: string
  name: string
  latitude: number
  longitude: number
  description: string
  sourceLabel: string
  sourceUrl: string
}

export const szczecinSpots: SzczecinSpot[] = rawSpots
