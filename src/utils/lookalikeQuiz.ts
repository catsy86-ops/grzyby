import type { Species } from '../db/schema'

export interface QuizPair {
  target: Species
  decoy: Species
}

// Fiszki "odróżnij te dwa gatunki" na bazie już wypełnionego `lookalikes.ts`/species.json - zero
// nowej treści redakcyjnej. Pytanie zawsze w formie "który z tych to {target}?" (identyfikacja
// wizualna, wymaga zdjęcia), nie "który jest bezpieczny" - część par sobowtórów ma obie strony
// jadalne lub obie toksyczne, więc binarne pytanie o bezpieczeństwo nie zawsze miałoby jedną
// poprawną odpowiedź.
export function buildQuizPairs(species: Species[]): QuizPair[] {
  const pairs: QuizPair[] = []
  for (const target of species) {
    for (const decoyId of target.lookalikes) {
      const decoy = species.find((s) => s.id === decoyId)
      if (decoy && decoy.imageUrls[0] && target.imageUrls[0]) pairs.push({ target, decoy })
    }
  }
  return pairs
}

export function pickRandomPair(pairs: QuizPair[]): QuizPair | null {
  if (pairs.length === 0) return null
  return pairs[Math.floor(Math.random() * pairs.length)]
}
