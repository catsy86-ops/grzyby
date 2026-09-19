import type { Finding } from '../db/schema'

// Eksport do arkusza kalkulacyjnego (Excel/Arkusze Google) - obok istniejących JSON (pełny
// backup)/PDF (czytelny wydruk)/GPX (nawigacja). Ten sam zestaw pól co GPX/PDF, w formacie który
// łatwo dalej filtrować/sortować w arkuszu. Czysto lokalna funkcja, zero sieci.
const CSV_HEADER = ['Data', 'Gatunek', 'Ilość', 'Waga (g)', 'Notatki', 'Szerokość', 'Długość']

function escapeCsvField(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

export function buildCsv(findings: Finding[]): string {
  const rows = findings.map((f) =>
    [
      new Date(f.createdAt).toISOString(),
      f.speciesNameGuess ?? '',
      f.quantity != null ? String(f.quantity) : '',
      f.weightGrams != null ? String(f.weightGrams) : '',
      f.notes,
      f.latitude != null ? String(f.latitude) : '',
      f.longitude != null ? String(f.longitude) : '',
    ]
      .map(escapeCsvField)
      .join(','),
  )
  // BOM na początku, żeby Excel poprawnie rozpoznał UTF-8 (polskie znaki) zamiast zgadywać
  // lokalne kodowanie systemu.
  return '﻿' + [CSV_HEADER.join(','), ...rows].join('\n') + '\n'
}

export function exportFindingsToCsv(findings: Finding[]): Blob {
  return new Blob([buildCsv(findings)], { type: 'text/csv;charset=utf-8' })
}
