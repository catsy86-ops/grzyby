import { Badge, type badgeVariants } from './ui/badge'
import type { VariantProps } from 'class-variance-authority'
import type { EdibilityStatus } from '../db/schema'

type BadgeVariant = VariantProps<typeof badgeVariants>['variant']

const STYLES: Record<EdibilityStatus, { label: string; variant: BadgeVariant }> = {
  jadalny: { label: 'Jadalny', variant: 'success' },
  'warunkowo-jadalny': { label: 'Warunkowo jadalny', variant: 'warning' },
  niejadalny: { label: 'Niejadalny', variant: 'secondary' },
  trujący: { label: 'Trujący', variant: 'caution' },
  'śmiertelnie-trujący': { label: 'Śmiertelnie trujący', variant: 'destructive-solid' },
}

export function EdibilityBadge({ edibility }: { edibility: EdibilityStatus }) {
  const style = STYLES[edibility]
  return (
    <Badge variant={style.variant} className="px-3 py-1 font-semibold">
      {style.label}
    </Badge>
  )
}

// Kolor "z krwi" jadalności, do użycia jako struktura karty (lewy pasek + delikatny odcień tła),
// nie tylko plakietka - najważniejsza informacja o karcie (bezpieczeństwo) ma być widoczna od
// razu przy skanowaniu listy wzrokiem, nie dopiero po przeczytaniu małej plakietki w rogu.
// Skala celowo powtarza kolory z badge.tsx (ta sama, ustalona 4-stopniowa skala jadalności).
const CARD_ACCENT: Record<EdibilityStatus, string> = {
  jadalny: 'border-l-green-500 bg-green-50/50 dark:border-l-green-500 dark:bg-green-950/20',
  'warunkowo-jadalny': 'border-l-yellow-500 bg-yellow-50/50 dark:border-l-yellow-500 dark:bg-yellow-950/20',
  niejadalny: 'border-l-border',
  trujący: 'border-l-orange-500 bg-orange-50/50 dark:border-l-orange-500 dark:bg-orange-950/20',
  'śmiertelnie-trujący': 'border-l-red-600 bg-red-50/60 dark:border-l-red-500 dark:bg-red-950/25',
}

export function edibilityCardAccentClass(edibility: EdibilityStatus) {
  return CARD_ACCENT[edibility]
}

// Bazowy className karty listy gatunku/znaleziska (stagger wejścia + obwódka jadalności + hover)
// - ten sam literał był osobno wklejony w JournalView.tsx i EncyclopediaView.tsx (poprawka z
// audytu UI); jedno miejsce do zmiany przy następnej korekcie tego wzorca zamiast dwóch.
export function speciesCardClassName(edibility: EdibilityStatus | undefined) {
  const accent = edibility ? edibilityCardAccentClass(edibility) : 'border-l-border'
  return `stagger-item border-l-4 transition-shadow duration-200 hover:shadow-md hover:shadow-primary/15 ${accent}`
}

// Ten sam kod koloru, ale jako wartość CSS (nie klasa Tailwind) - do użycia w SVG/Recharts,
// które przyjmują `fill` jako string koloru, nie `className`.
const CHART_COLOR: Record<EdibilityStatus, string> = {
  jadalny: 'var(--color-green-500)',
  'warunkowo-jadalny': 'var(--color-yellow-500)',
  niejadalny: 'var(--color-muted-foreground)',
  trujący: 'var(--color-orange-500)',
  'śmiertelnie-trujący': 'var(--color-red-600)',
}

export function edibilityChartColor(edibility: EdibilityStatus | undefined) {
  return edibility ? CHART_COLOR[edibility] : 'var(--color-muted-foreground)'
}
