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
const MIN_MS_SINCE_FLAGGED = 300 * 24 * 60 * 60_000 // ~10 miesięcy - z zapasem poniżej pełnego roku

export function shouldRemindRevisit(revisitMonth: number, flaggedAt: number, now: number): boolean {
  const currentMonth = new Date(now).getMonth() + 1
  if (currentMonth !== revisitMonth) return false
  return now - flaggedAt >= MIN_MS_SINCE_FLAGGED
}
