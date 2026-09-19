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

// MAP-ROADMAP.md #6 - "udostępnianie znaleziska jako obraz". Apka jest offline-first bez
// własnego backendu, więc prawdziwy deep-link nie ma gdzie wskazywać - realistyczna wersja to
// dołączenie faktycznego zdjęcia znaleziska (już skompresowanego, patrz utils/imageUtils.ts) do
// tego samego natywnego arkusza `navigator.share`, obok tekstu. Web Share API Level 2 (pliki)
// ma węższe wsparcie niż samo `share({text})` - stąd `canShare({ files })`, nie tylko
// `typeof navigator.share === 'function'`, zanim spróbujemy dołączyć plik.
function canSharePhoto(file: File): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })
}

export async function shareFinding(finding: Finding, photoBlob?: Blob | null): Promise<'shared' | 'copied' | 'cancelled'> {
  const text = buildFindingShareText(finding)
  if (canShareFinding()) {
    const photoFile = photoBlob ? new File([photoBlob], 'znalezisko.jpg', { type: photoBlob.type || 'image/jpeg' }) : null
    try {
      if (photoFile && canSharePhoto(photoFile)) {
        await navigator.share({ title: 'Znalezisko z Łysego', text, files: [photoFile] })
      } else {
        await navigator.share({ title: 'Znalezisko z Łysego', text })
      }
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
