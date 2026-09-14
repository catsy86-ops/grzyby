import { renderToStaticMarkup } from 'react-dom/server'
import L from 'leaflet'
import type { ComponentType } from 'react'
import { CarIcon, MapPinnedIcon, PlusIcon } from 'lucide-react'

// Markery mapy zbudowane na jednym, wspólnym kształcie "kropli" (ten sam język co Logo.tsx -
// płaskie wypełnienie, tokeny motywu, biała obwódka) zamiast domyślnej niebieskiej pinezki
// Leaflet i emoji w divIcon. Wypełnienie koloru koduje typ miejsca (auto/grzybowisko/znalezisko),
// a nie tylko dekoruje - por. zasadę "struktura to informacja" z planu UI.
const PIN_PATH =
  'M12 0C5.9 0 1 4.9 1 11c0 7.8 11 18 11 18s11-10.2 11-18C23 4.9 18.1 0 12 0Z'
const PIN_VIEWBOX_W = 24
const PIN_VIEWBOX_H = 30

function MushroomGlyph({ size = 14, className }: { size?: number; className?: string }) {
  // Miniaturowa wersja kapelusza z Logo.tsx - jedyny glif zarezerwowany dla "to jest znalezisko
  // grzyba", odróżniający pinezkę znaleziska od generycznych ikon lucide użytych dla auta/miejsca.
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden="true">
      <path
        d="M12 3C7.5 3 4.5 6.3 4.5 9c0 .7.4 1 1 1h13c.6 0 1-.3 1-1C19.5 6.3 16.5 3 12 3Z"
        fill="currentColor"
      />
      <path
        d="M9.7 11h4.6l-.6 6.3a1.35 1.35 0 0 1-1.35 1.2h0a1.35 1.35 0 0 1-1.35-1.2L9.7 11Z"
        fill="currentColor"
        opacity="0.55"
      />
    </svg>
  )
}

function pinDivIcon({
  Glyph,
  fill,
  outline = false,
  size = 34,
}: {
  Glyph: ComponentType<{ size?: number; className?: string }>
  fill: string
  outline?: boolean
  size?: number
}) {
  const height = Math.round((size * PIN_VIEWBOX_H) / PIN_VIEWBOX_W)
  const html = renderToStaticMarkup(
    <span className="relative block drop-shadow-md" style={{ width: size, height }}>
      <svg viewBox={`0 0 ${PIN_VIEWBOX_W} ${PIN_VIEWBOX_H}`} width={size} height={height}>
        <path
          d={PIN_PATH}
          fill={outline ? 'var(--color-background)' : fill}
          stroke={outline ? fill : 'var(--color-background)'}
          strokeWidth={outline ? 2 : 1.5}
          strokeDasharray={outline ? '2.5 2.5' : undefined}
        />
      </svg>
      <span
        className="absolute inset-x-0 top-[15%] flex justify-center"
        style={{ color: outline ? fill : 'var(--color-background)' }}
      >
        <Glyph size={size * 0.4} />
      </span>
    </span>,
  )
  return L.divIcon({ html, className: '', iconSize: [size, height], iconAnchor: [size / 2, height] })
}

// Auto - lokalizacja zaparkowanego samochodu, punkt powrotu z lasu.
export const carMarkerIcon = pinDivIcon({ Glyph: CarIcon, fill: 'var(--color-foreground)' })

// Grzybowisko - zapisane, nazwane miejsce zbioru.
export const spotMarkerIcon = pinDivIcon({ Glyph: MapPinnedIcon, fill: 'var(--color-brand-accent)' })

// Zarejestrowane znalezisko - jedyna pinezka z glifem grzyba (nie generyczną ikoną), bo to
// jedyny typ markera, który dosłownie oznacza "tu rósł grzyb".
export const findingMarkerIcon = pinDivIcon({ Glyph: MushroomGlyph, fill: 'var(--color-primary)', size: 30 })

// Wybrane, jeszcze niezapisane miejsce nowego znaleziska - przerywana obwódka zamiast pełnego
// wypełnienia komunikuje "tymczasowe, do potwierdzenia" bez dodatkowego tekstu.
export const candidateMarkerIcon = pinDivIcon({
  Glyph: PlusIcon,
  fill: 'var(--color-primary)',
  outline: true,
  size: 34,
})

// Pozycja użytkownika - celowo NIE kropla/pinezka jak reszta markerów: to nie jest "miejsce",
// tylko "Ty teraz", więc dostaje osobny, powszechnie rozpoznawalny wzorzec map ("niebieska
// kropka") - pulsująca kropka zamiast pinu z glifem.
export const userLocationIcon = L.divIcon({
  html: `<span class="relative flex size-4 items-center justify-center">
    <span class="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-60"></span>
    <span class="relative inline-flex size-3 rounded-full border-2 border-background bg-primary shadow"></span>
  </span>`,
  className: '',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
})
