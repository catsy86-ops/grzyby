export const MONTH_NAMES = [
  'styczeń', 'luty', 'marzec', 'kwiecień', 'maj', 'czerwiec',
  'lipiec', 'sierpień', 'wrzesień', 'październik', 'listopad', 'grudzień',
]

export function monthLabel(month: number): string {
  return MONTH_NAMES[month - 1] ?? String(month)
}

// Przypomnienie odpala się tylko wtedy, gdy bieżący miesiąc zgadza się z oflagowanym I minął co
// najmniej rok kalendarzowy różnicy w sekundach od chwili oznaczenia - bez tego drugiego warunku
// przypomnienie strzeliłoby natychmiast, gdy ktoś oflagował grzybowisko w bieżącym miesiącu
// ("sprawdź to za rok", nie "sprawdź to teraz, właśnie to zrobiłeś").
export const MIN_MS_SINCE_FLAGGED = 300 * 24 * 60 * 60_000 // ~10 miesięcy - z zapasem poniżej pełnego roku

export function shouldRemindRevisit(revisitMonth: number, flaggedAt: number, now: number): boolean {
  const currentMonth = new Date(now).getMonth() + 1
  if (currentMonth !== revisitMonth) return false
  return now - flaggedAt >= MIN_MS_SINCE_FLAGGED
}

// Ta sama logika "co najmniej ~10 miesięcy od oflagowania", tylko zwracająca konkretną datę
// zamiast boola - używana do eksportu .ics (utils/icsExport.ts), gdzie potrzebny jest jeden
// konkretny dzień w kalendarzu, nie tylko warunek "czy teraz". Pierwszy dzień oflagowanego
// miesiąca w najbliższym roku spełniającym próg `MIN_MS_SINCE_FLAGGED`.
export function nextRevisitDate(revisitMonth: number, flaggedAt: number): Date {
  const flaggedYear = new Date(flaggedAt).getFullYear()
  const candidate = new Date(flaggedYear, revisitMonth - 1, 1)
  if (candidate.getTime() - flaggedAt < MIN_MS_SINCE_FLAGGED) {
    return new Date(flaggedYear + 1, revisitMonth - 1, 1)
  }
  return candidate
}
