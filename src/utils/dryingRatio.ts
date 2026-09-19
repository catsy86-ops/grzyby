// Procent masy pozostały po wysuszeniu (typowo grzyby tracą ok. 85-90% wagi) - czysty ułamek do
// pokazania obok wagi świeżej/suchej w karcie znaleziska (JournalView.tsx).
export function computeDryingRatioPercent(freshWeightGrams: number, driedWeightGrams: number): number | null {
  if (freshWeightGrams <= 0) return null
  return Math.round((driedWeightGrams / freshWeightGrams) * 100)
}
