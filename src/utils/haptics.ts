import { useAppStore } from '../stores/appStore'

// `navigator.vibrate` - tanie, bardzo odczuwalne potwierdzenie na telefonie przy kluczowych
// akcjach (Faza C nowecos.md). Cicho no-op tam, gdzie API nie istnieje (desktop, iOS Safari) -
// to czysto kosmetyczne wzmocnienie, nie coś, na czym cokolwiek w aplikacji polega.
// Przełącznik "Wibracje" w menu Narzędzia - getState() (nie hook), bo wywołania są z handlerów.
function hapticsAllowed() {
  return useAppStore.getState().hapticsEnabled
}

export function vibrateSuccess() {
  if (hapticsAllowed()) navigator.vibrate?.(15)
}

// Dwa krótkie impulsy - odróżnialne bez patrzenia od pojedynczego "zapisano" (usunięcie/cofnięcie).
export function vibrateNotice() {
  if (hapticsAllowed()) navigator.vibrate?.([10, 60, 10])
}
