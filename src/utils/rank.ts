export interface RankTier {
  id: string
  label: string
  minFindings: number
}

// Progi oparte wyłącznie na liczbie znalezisk - ten sam metryk, którego już używają odznaki
// "Kolekcjoner"/"Mistrz grzybiarz"/"Legenda lasu" (10/50/100), więc ranga i odznaki opowiadają tę
// samą historię, nie dwie konkurencyjne miary postępu.
export const RANK_TIERS: RankTier[] = [
  { id: 'nowicjusz', label: 'Nowicjusz', minFindings: 0 },
  { id: 'zbieracz', label: 'Zbieracz', minFindings: 5 },
  { id: 'doswiadczony', label: 'Doświadczony grzybiarz', minFindings: 20 },
  { id: 'mistrz-lasu', label: 'Mistrz lasu', minFindings: 50 },
  { id: 'legenda', label: 'Legenda grzybobrania', minFindings: 100 },
]

export interface RankProgress {
  tier: RankTier
  nextTier: RankTier | null
  findingsCount: number
  // Ile znalezisk brakuje do progu następnej rangi - `null`, gdy osiągnięto najwyższą (nie ma do
  // czego dążyć, pasek postępu byłby zawsze pełny i bez sensu).
  findingsToNextTier: number | null
}

export function computeRank(findingsCount: number): RankProgress {
  let tier = RANK_TIERS[0]
  for (const candidate of RANK_TIERS) {
    if (findingsCount >= candidate.minFindings) tier = candidate
  }
  const nextTier = RANK_TIERS[RANK_TIERS.indexOf(tier) + 1] ?? null
  return {
    tier,
    nextTier,
    findingsCount,
    findingsToNextTier: nextTier ? nextTier.minFindings - findingsCount : null,
  }
}
