// Eksport pojedynczego przypomnienia "sprawdź grzybowisko" jako plik .ics - w odróżnieniu od
// lokalnej notyfikacji (useSpotRevisitReminders.ts, wymaga otwartej apki żeby cokolwiek
// sprawdzić), wpis w kalendarzu telefonu przetrwa nawet gdy apka nie była uruchamiana miesiącami.
// Zdarzenie całodniowe (VALUE=DATE), bez cyklu powtarzania - to jednorazowy eksport bieżącego
// stanu flagi, nie subskrybowany kalendarz.
function formatIcsDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}${m}${d}`
}

function formatIcsTimestamp(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
}

// RFC 5545: DTEND całodniowego zdarzenia jest wyłączny (dzień PO ostatnim dniu zdarzenia).
function nextDay(date: Date): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + 1)
  return next
}

export function buildSpotRevisitIcs(spotName: string, revisitDate: Date, now: Date = new Date()): string {
  const uid = `grzyby-revisit-${revisitDate.getTime()}@grzyby.local`
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Grzybobranie//PL',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${formatIcsTimestamp(now)}`,
    `DTSTART;VALUE=DATE:${formatIcsDate(revisitDate)}`,
    `DTEND;VALUE=DATE:${formatIcsDate(nextDay(revisitDate))}`,
    `SUMMARY:Sprawdź grzybowisko: ${spotName}`,
    'DESCRIPTION:Przypomnienie z aplikacji Grzybobranie.',
    'END:VEVENT',
    'END:VCALENDAR',
  ]
  return lines.join('\r\n')
}
