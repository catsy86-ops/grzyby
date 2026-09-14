// Formatuje liczbę sekund jako "MM:SS" (dwucyfrowe minuty/sekundy) do wyświetlenia w timerze.
export function formatCountdown(totalSeconds: number): string {
  const clamped = Math.max(0, Math.round(totalSeconds))
  const minutes = Math.floor(clamped / 60)
  const seconds = clamped % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}
