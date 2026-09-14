import { describe, expect, it } from 'vitest'
import { shouldRemindSpray, shouldRemindTickCheck, SPRAY_REMINDER_INTERVAL_MS, TICK_CHECK_AFTER_DAYS } from './tickReminders'

describe('shouldRemindSpray', () => {
  it('zwraca false, gdy minęło mniej niż interwał', () => {
    const now = 1_000_000
    expect(shouldRemindSpray(now - SPRAY_REMINDER_INTERVAL_MS + 1000, now)).toBe(false)
  })

  it('zwraca true, gdy minął cały interwał', () => {
    const now = 1_000_000
    expect(shouldRemindSpray(now - SPRAY_REMINDER_INTERVAL_MS, now)).toBe(true)
  })
})

describe('shouldRemindTickCheck', () => {
  it('zwraca false, gdy minęło mniej niż 14 dni', () => {
    const dayMs = 24 * 60 * 60_000
    const now = TICK_CHECK_AFTER_DAYS * dayMs
    expect(shouldRemindTickCheck(now - (TICK_CHECK_AFTER_DAYS - 1) * dayMs, now)).toBe(false)
  })

  it('zwraca true, gdy minęło 14 dni lub więcej', () => {
    const dayMs = 24 * 60 * 60_000
    const now = TICK_CHECK_AFTER_DAYS * dayMs
    expect(shouldRemindTickCheck(0, now)).toBe(true)
  })
})
