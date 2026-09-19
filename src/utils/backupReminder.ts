// Apka jest 100% offline bez chmury (konta+sync celowo odłożone, patrz docs/ROADMAP.md) -
// jedyną formą backupu jest ręczny eksport JSON. Zgubiony/zbity telefon bez eksportu = utrata
// całej historii. Przypomnienie pojawia się dopiero gdy jest już co stracić i minęło rozsądnie
// dużo czasu, żeby nie nękać świeżego użytkownika od pierwszego dnia.
export const MIN_FINDINGS_FOR_BACKUP_REMINDER = 5
export const BACKUP_REMINDER_INTERVAL_MS = 30 * 24 * 60 * 60 * 1000

export function shouldRemindBackup(
  lastExportAt: number | null,
  findingsCount: number,
  now: number,
  snoozedUntil: number | null,
): boolean {
  if (findingsCount < MIN_FINDINGS_FOR_BACKUP_REMINDER) return false
  if (snoozedUntil != null && now < snoozedUntil) return false
  if (lastExportAt == null) return true
  return now - lastExportAt > BACKUP_REMINDER_INTERVAL_MS
}
