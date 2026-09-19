import { describe, expect, it } from 'vitest'
import { BACKUP_REMINDER_INTERVAL_MS, shouldRemindBackup } from './backupReminder'

const NOW = 1_700_000_000_000

describe('shouldRemindBackup', () => {
  it('does not remind below the minimum findings threshold', () => {
    expect(shouldRemindBackup(null, 4, NOW, null)).toBe(false)
  })

  it('reminds when there is never been an export and enough findings', () => {
    expect(shouldRemindBackup(null, 5, NOW, null)).toBe(true)
  })

  it('does not remind when the last export is recent', () => {
    expect(shouldRemindBackup(NOW - 1000, 10, NOW, null)).toBe(false)
  })

  it('reminds when the last export is older than the interval', () => {
    expect(shouldRemindBackup(NOW - BACKUP_REMINDER_INTERVAL_MS - 1, 10, NOW, null)).toBe(true)
  })

  it('respects an active snooze', () => {
    expect(shouldRemindBackup(null, 10, NOW, NOW + 1000)).toBe(false)
  })

  it('reminds again once the snooze has expired', () => {
    expect(shouldRemindBackup(null, 10, NOW, NOW - 1000)).toBe(true)
  })
})
