// `navigator.vibrate` - tanie, bardzo odczuwalne potwierdzenie na telefonie przy kluczowych
// akcjach (Faza C nowecos.md). Cicho no-op tam, gdzie API nie istnieje (desktop, iOS Safari) -
// to czysto kosmetyczne wzmocnienie, nie coś, na czym cokolwiek w aplikacji polega.
export function vibrateSuccess() {
  navigator.vibrate?.(15)
}

// Dwa krótkie impulsy - odróżnialne bez patrzenia od pojedynczego "zapisano" (usunięcie/cofnięcie).
export function vibrateNotice() {
  navigator.vibrate?.([10, 60, 10])
}
