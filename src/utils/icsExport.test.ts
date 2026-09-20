import { describe, expect, it } from 'vitest'
import { buildSpotRevisitIcs } from './icsExport'

describe('buildSpotRevisitIcs', () => {
  it('generuje poprawny VEVENT całodniowy z DTEND dzień po DTSTART', () => {
    const ics = buildSpotRevisitIcs('Sosnowy zagajnik', new Date(2027, 8, 1), new Date(2026, 8, 1, 12))

    expect(ics).toContain('BEGIN:VCALENDAR')
    expect(ics).toContain('BEGIN:VEVENT')
    expect(ics).toContain('DTSTART;VALUE=DATE:20270901')
    expect(ics).toContain('DTEND;VALUE=DATE:20270902')
    expect(ics).toContain('SUMMARY:Sprawdź grzybowisko: Sosnowy zagajnik')
    expect(ics).toContain('END:VEVENT')
    expect(ics).toContain('END:VCALENDAR')
  })

  it('używa CRLF jako separatora linii (RFC 5545)', () => {
    const ics = buildSpotRevisitIcs('Test', new Date(2027, 0, 1))
    expect(ics).toContain('\r\n')
  })
})
