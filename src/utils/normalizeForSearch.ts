// Ujednolica tekst przed porównaniem w wyszukiwarce - usuwa polskie (i inne) znaki diakrytyczne
// oraz różnice wielkości liter, żeby "gaska" znajdowało "Gąska" (BAZA-WIEDZY-AUDIT-ROADMAP.md
// Tier 1 pkt 3). Częste w terenie: szybkie pisanie na telefonie, autokorekta wyłączona/rękawiczki.
export function normalizeForSearch(value: string): string {
  return value
    .toLowerCase()
    // "ł" nie ma kanonicznej dekompozycji w Unicode (w przeciwieństwie do ą/ę/ć/ń/ś/ź/ż), więc
    // NFD niżej go nie tknie - trzeba podmienić ręcznie przed usunięciem znaków diakrytycznych.
    .replace(/ł/g, 'l')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}
