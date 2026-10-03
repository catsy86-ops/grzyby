import { useEffect, useState } from 'react'
import { loadClassLabels } from '../utils/mushroomModel'

// Etykiety klas modelu (metadata.json, cache'owane w mushroomModel.ts - jeden fetch na sesję).
// `null` do czasu rozstrzygnięcia - komponenty nic wtedy nie pokazują, zamiast mignąć
// komunikatem "skaner nie zna 45 gatunków".
export function useScannerLabels(): string[] | null {
  const [labels, setLabels] = useState<string[] | null>(null)
  useEffect(() => {
    let cancelled = false
    loadClassLabels()
      .then((l) => {
        if (!cancelled) setLabels(l)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])
  return labels
}
