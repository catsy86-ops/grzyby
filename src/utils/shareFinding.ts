import type { Finding } from '../db/schema'
import { formatDate } from './formatDate'

// `navigator.share` (Web Share API) - dostępne w przeglądarkach mobilnych (Chrome/Safari na
// Androidzie/iOS) i w PWA zainstalowanej z ekranu głównego, otwiera natywny arkusz "Udostępnij"
// systemu (SMS, WhatsApp, Messenger...) zamiast wymuszać ręczny eksport pliku. Desktop Firefox i
// starsze przeglądarki go nie mają - stąd fallback do skopiowania tekstu do schowka.
export function canShareFinding(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function'
}

export function buildFindingShareText(finding: Finding): string {
  const lines = [
    `🍄 ${finding.speciesNameGuess ?? 'Nieokreślony gatunek'}`,
    `Znalezisko z ${formatDate(finding.createdAt)}`,
  ]
  if (finding.latitude != null && finding.longitude != null) {
    lines.push(`Lokalizacja: https://www.openstreetmap.org/?mlat=${finding.latitude}&mlon=${finding.longitude}#map=16/${finding.latitude}/${finding.longitude}`)
  }
  if (finding.notes) lines.push(finding.notes)
  return lines.join('\n')
}

export async function shareFinding(finding: Finding): Promise<'shared' | 'copied' | 'cancelled'> {
  const text = buildFindingShareText(finding)
  if (canShareFinding()) {
    try {
      await navigator.share({ title: 'Znalezisko z Łysego', text })
      return 'shared'
    } catch (err) {
      // Użytkownik zamknął natywny arkusz udostępniania - to nie błąd, nie ma czego zgłaszać.
      if (err instanceof Error && err.name === 'AbortError') return 'cancelled'
      throw err
    }
  }
  await navigator.clipboard.writeText(text)
  return 'copied'
}
