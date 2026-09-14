import type { ReactElement } from 'react'
import type { SpeciesShapeGroup } from '../../utils/speciesShape'

// Sylwetki grup morfologicznych - profil kapelusza+trzonu z fakturą spodu (rurki/blaszki/fałdki)
// w tym samym płaskim języku co Logo.tsx, ale CELOWO monochromatyczne (currentColor, dziedziczy
// text-muted-foreground) - to trzeci sygnał na karcie obok koloru jadalności (Plan B) i koloru
// sezonu (Plan C), więc nie może dostać własnego koloru, żeby nie dodać kolejnej rywalizującej
// palety. Kształt, nie barwa, niesie tu informację.

const commonProps = { viewBox: '0 0 24 24', width: 16, height: 16, 'aria-hidden': true } as const

function BoleteShapeIcon({ className }: { className?: string }) {
  return (
    <svg {...commonProps} className={className}>
      <path d="M4 9.5C4 6 7.5 3 12 3s8 3 8 6.5c0 .8-.5 1.2-1.2 1.2H5.2C4.5 10.7 4 10.3 4 9.5Z" fill="currentColor" />
      <path d="M6.5 12.2h11" stroke="var(--color-background)" strokeWidth="1" strokeDasharray="1.4 1.4" opacity="0.7" />
      <rect x="10.5" y="13" width="3" height="7" rx="1" fill="currentColor" opacity="0.6" />
    </svg>
  )
}

function GilledShapeIcon({ className }: { className?: string }) {
  return (
    <svg {...commonProps} className={className}>
      <path d="M4 9.8C4 6.2 7.5 3 12 3s8 3.2 8 6.8c0 .7-.5 1-1.1 1H5.1C4.5 10.8 4 10.5 4 9.8Z" fill="currentColor" />
      <path
        d="M6 11.2 12 10l6 1.2M6.6 12.5 12 11.4l5.4 1.1"
        stroke="var(--color-background)"
        strokeWidth="0.9"
        fill="none"
        opacity="0.75"
      />
      <rect x="10.5" y="13" width="3" height="7" rx="1" fill="currentColor" opacity="0.6" />
    </svg>
  )
}

function FunnelShapeIcon({ className }: { className?: string }) {
  return (
    <svg {...commonProps} className={className}>
      <path d="M3.5 7 12 5l8.5 2-3 5-5-1.2-5 1.2-3-5Z" fill="currentColor" />
      <path
        d="M9.5 9.5 12 19l2.5-9.5"
        stroke="var(--color-background)"
        strokeWidth="0.9"
        fill="none"
        opacity="0.75"
      />
      <path d="M11 12v7a1 1 0 0 0 2 0v-7" fill="currentColor" opacity="0.6" />
    </svg>
  )
}

function MorelShapeIcon({ className }: { className?: string }) {
  return (
    <svg {...commonProps} className={className}>
      <path d="M8 3.5c-2 0-3.5 2-3.5 4.5S6.5 13 8 13h8c1.5 0 3.5-2.5 3.5-5S18 3.5 16 3.5c-1.2 1-2.8 1-4 0-1.2 1-2.8 1-4 0Z" fill="currentColor" />
      <circle cx="8.3" cy="7" r="0.9" fill="var(--color-background)" opacity="0.75" />
      <circle cx="12" cy="6.3" r="0.9" fill="var(--color-background)" opacity="0.75" />
      <circle cx="15.7" cy="7" r="0.9" fill="var(--color-background)" opacity="0.75" />
      <circle cx="10" cy="9.5" r="0.9" fill="var(--color-background)" opacity="0.75" />
      <circle cx="14" cy="9.5" r="0.9" fill="var(--color-background)" opacity="0.75" />
      <rect x="10.7" y="13" width="2.6" height="7" rx="1" fill="currentColor" opacity="0.6" />
    </svg>
  )
}

function PuffballShapeIcon({ className }: { className?: string }) {
  return (
    <svg {...commonProps} className={className}>
      <circle cx="12" cy="13" r="8" fill="currentColor" />
      <circle cx="9" cy="10" r="0.9" fill="var(--color-background)" opacity="0.6" />
      <circle cx="14.5" cy="9" r="0.7" fill="var(--color-background)" opacity="0.6" />
      <circle cx="13" cy="14.5" r="0.8" fill="var(--color-background)" opacity="0.6" />
      <circle cx="9.5" cy="15.5" r="0.6" fill="var(--color-background)" opacity="0.6" />
    </svg>
  )
}

const SHAPE_ICON: Record<SpeciesShapeGroup, (props: { className?: string }) => ReactElement> = {
  rurkowy: BoleteShapeIcon,
  blaszkowy: GilledShapeIcon,
  lejkowaty: FunnelShapeIcon,
  siodlowy: MorelShapeIcon,
  kulisty: PuffballShapeIcon,
}

export function SpeciesShapeIcon({
  group,
  className,
}: {
  group: SpeciesShapeGroup
  className?: string
}) {
  const Icon = SHAPE_ICON[group]
  return <Icon className={className} />
}
