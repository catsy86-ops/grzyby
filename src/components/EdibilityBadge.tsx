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
