// Polska odmiana rzeczownika po liczebniku: 1 znalezisko, 2-4 znaleziska (poza 12-14), 5+ znalezisk.
export function pluralPl(count: number, one: string, few: string, many: string): string {
  if (count === 1) return one
  const lastDigit = count % 10
  const lastTwo = count % 100
  return lastDigit >= 2 && lastDigit <= 4 && (lastTwo < 12 || lastTwo > 14) ? few : many
}
