export type SortOrder = 'newest' | 'oldest'

// `dateFrom`/`dateTo` to wartości natywnego `<input type="date">` (yyyy-mm-dd, strefa lokalna,
// pusty string = brak granicy). Górna granica jest inkluzywna do KOŃCA dnia (23:59:59.999) - bez
// tego znalezisko dodane w dniu wybranym jako "Do" zostałoby błędnie odfiltrowane (jego
// `createdAt` ma godzinę/minuty, nie tylko datę).
export function isWithinDateRange(createdAt: number, dateFrom: string, dateTo: string): boolean {
  if (dateFrom) {
    const fromMs = new Date(`${dateFrom}T00:00:00`).getTime()
    if (createdAt < fromMs) return false
  }
  if (dateTo) {
    const toMs = new Date(`${dateTo}T23:59:59.999`).getTime()
    if (createdAt > toMs) return false
  }
  return true
}
