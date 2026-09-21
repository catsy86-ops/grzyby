export interface WidgetStats {
  hasActiveTrip: boolean
  tripName?: string
  tripDurationLabel?: string
  findingsCount: number
  speciesCount: number
  // Ostatnia znana etykieta prognozy grzybowej (np. "Dobry czas na grzyby") - patrz
  // readCachedMushroomOutlookLabel w useMushroomOutlook.ts. Opcjonalne: brak, gdy apka nigdy nie
  // zdążyła pobrać prognozy (pierwsze uruchomienie, zawsze offline).
  mushroomOutlookLabel?: string
}

declare global {
  interface Window {
    // Wstrzykiwane przez natywną otoczkę Androida (WebView + addJavascriptInterface) -
    // patrz android/app/.../WidgetBridge.kt. Nie istnieje w zwykłej przeglądarce/PWA,
    // więc każde wywołanie musi być no-opem poza tą otoczką.
    AndroidWidget?: {
      updateStats: (statsJson: string) => void
    }
  }
}

export function pushWidgetStats(stats: WidgetStats): void {
  window.AndroidWidget?.updateStats(JSON.stringify(stats))
}
