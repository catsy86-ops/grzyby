import type { Finding } from '../db/schema'

// Eksport znalezisk do GPX (GPS Exchange Format) - zaplanowany w ROADMAP Fazie 9, dotąd
// niezrobiony. Czysto lokalna funkcja (żadnej sieci/klucza API) generująca standardowy plik
// waypointów do otwarcia w Google Maps/Komoot/OsmAnd i innych aplikacjach turystycznych -
// naturalne rozszerzenie istniejącego eksportu PDF/JSON, tym razem z naciskiem na współrzędne,
// nie na treść dziennika.
function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export function buildGpx(findings: Finding[]): string {
  const waypoints = findings
    .filter((f) => f.latitude != null && f.longitude != null)
    .map((f) => {
      const name = escapeXml(f.speciesNameGuess ?? 'Znalezisko')
      const time = new Date(f.createdAt).toISOString()
      const description = f.notes ? `<desc>${escapeXml(f.notes)}</desc>` : ''
      return `  <wpt lat="${f.latitude}" lon="${f.longitude}">
    <name>${name}</name>
    <time>${time}</time>
    ${description}
  </wpt>`
    })
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Grzybobranie" xmlns="http://www.topografix.com/GPX/1/1">
${waypoints}
</gpx>
`
}

export function exportFindingsToGpx(findings: Finding[]): Blob {
  return new Blob([buildGpx(findings)], { type: 'application/gpx+xml' })
}
