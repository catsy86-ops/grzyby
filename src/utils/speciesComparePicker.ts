// Wydzielone z SpeciesComparePicker.tsx - czysta funkcja, łatwa do przetestowania bez symulowania
// w jsdom realnego gestu zamknięcia Drawer (swipe/Escape/klik w tło), którego floating-ui-owy
// stos dismiss nie odtwarza się przewidywalnie w testach (BAZA-WIEDZY-AUDIT-ROADMAP.md Tier 1 pkt 6).
export function shouldResetSelectionOnClose(next: boolean, bothSelected: boolean): boolean {
  return !next && !bothSelected
}
