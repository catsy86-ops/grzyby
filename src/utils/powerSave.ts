import type { BatteryStatus } from '../hooks/useBatteryStatus'
import type { PowerSaveMode } from '../stores/appStore'

// Poniżej tego poziomu (i gdy telefon nie jest podłączony do ładowania) tryb 'auto' włącza
// oszczędzanie samodzielnie - 20% to typowy próg "niski poziom baterii" w samych systemach
// (Android/iOS pokazują wtedy własne ostrzeżenie), więc użytkownik i tak dostaje w tym momencie
// sygnał z systemu, że warto ograniczyć zużycie.
export const LOW_BATTERY_THRESHOLD = 0.2

// Wspólne etykiety trybu - używane zarówno w menu mapy (MapHeaderActions), jak i w sekcji
// "Aplikacja" Narzędzi (ToolsMenu), żeby oba miejsca prezentujące to samo ustawienie nie mogły
// rozjechać się w treści.
export const POWER_SAVE_MODE_LABELS: Record<PowerSaveMode, string> = {
  auto: 'Auto (poniżej 20% baterii)',
  always: 'Zawsze włączone',
  never: 'Wyłączone',
}

export function isPowerSaveActive(mode: PowerSaveMode, battery: BatteryStatus | null): boolean {
  if (mode === 'always') return true
  if (mode === 'never') return false
  // 'auto': bez wsparcia Battery Status API (Firefox/iOS) nie ma jak automatycznie wykryć niskiej
  // baterii - zamiast zgadywać, tryb po prostu nie włącza się sam (użytkownik może wymusić
  // 'always' ręcznie, jeśli wie że baterii mu zabraknie).
  if (!battery) return false
  return battery.level <= LOW_BATTERY_THRESHOLD && !battery.charging
}
