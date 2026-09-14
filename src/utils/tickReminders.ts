export const SPRAY_REMINDER_INTERVAL_MS = 3.5 * 60 * 60_000 // co 3-4h w trakcie wyprawy
export const TICK_CHECK_AFTER_DAYS = 14

// Czy pora przypomnieć o ponownym spryskaniu preparatem na kleszcze - `lastNotifiedAt` to
// znacznik czasu ostatniego przypomnienia (lub startu wyprawy, jeśli jeszcze żadnego nie było).
export function shouldRemindSpray(lastNotifiedAt: number, now: number): boolean {
  return now - lastNotifiedAt >= SPRAY_REMINDER_INTERVAL_MS
}

// Czy minęło wystarczająco dużo czasu od zakończenia wyprawy, żeby przypomnieć o kontroli
// skóry pod kątem ukąszeń kleszcza (rumień wędrujący pojawia się zwykle w ciągu 1-4 tygodni).
export function shouldRemindTickCheck(tripEndedAt: number, now: number): boolean {
  return now - tripEndedAt >= TICK_CHECK_AFTER_DAYS * 24 * 60 * 60_000
}
