import type { TreeCode } from '../data/forestCodes'
import type { Finding } from '../db/schema'

export interface TreeInsight {
  speciesId: string
  treeCode: TreeCode
  count: number
  total: number
}

// Poniżej tego progu "najczęściej pod bukiem (1 z 1)" byłoby przypadkiem, nie wzorcem.
export const MIN_FINDINGS_FOR_TREE_INSIGHT = 3

// Dla każdego gatunku z co najmniej kilkoma znaleziskami z zapisanym drzewostanem - drzewo, pod
// którym ten gatunek znajdujesz najczęściej, jeśli to co najmniej połowa przypadków. Posortowane
// od gatunków z największą liczbą takich znalezisk (najpewniejsze wzorce na górze).
export function computeTreeInsights(findings: Finding[], limit = 2): TreeInsight[] {
  const bySpecies = new Map<string, Map<TreeCode, number>>()
  for (const finding of findings) {
    const tree = finding.forestStand?.treeCode
    if (!finding.speciesId || !tree) continue
    const counts = bySpecies.get(finding.speciesId) ?? new Map<TreeCode, number>()
    counts.set(tree, (counts.get(tree) ?? 0) + 1)
    bySpecies.set(finding.speciesId, counts)
  }

  const insights: TreeInsight[] = []
  for (const [speciesId, counts] of bySpecies) {
    const total = [...counts.values()].reduce((sum, n) => sum + n, 0)
    if (total < MIN_FINDINGS_FOR_TREE_INSIGHT) continue
    const [treeCode, count] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]
    if (count * 2 >= total) insights.push({ speciesId, treeCode, count, total })
  }
  return insights.sort((a, b) => b.total - a.total).slice(0, limit)
}
