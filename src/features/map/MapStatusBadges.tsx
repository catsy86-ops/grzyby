import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import {
  BatteryLowIcon,
  CarIcon,
  ChevronDownIcon,
  CloudRainIcon,
  InfoIcon,
  NavigationIcon,
  SunsetIcon,
  TriangleAlertIcon,
  XIcon,
} from 'lucide-react'
import { Badge } from '../../components/ui/badge'
import type { SunsetCountdown } from '../../hooks/useSunsetCountdown'
import type { MushroomOutlook } from '../../utils/mushroomWeather'
import type { ReturnPointInfo } from '../../hooks/useReturnPointTracking'
import type { SpotNavigationInfo } from '../../hooks/useSpotNavigation'
import type { ReturnPoint } from '../../stores/appStore'
import type { Spot } from '../../db/schema'
import { formatDistance, getCardinalDirection } from '../../utils/bearing'

interface MapStatusBadgesProps {
  activeTripName: string | null
  sunsetCountdown: SunsetCountdown | null
  mushroomOutlook: MushroomOutlook | null
  returnPoint: ReturnPoint | null
  returnPointInfo: ReturnPointInfo | null
  onClearReturnPoint: () => void
  navigationTargetSpot: Spot | null
  navigationInfo: SpotNavigationInfo | null
  onClearNavigationTarget: () => void
  powerSaveActive: boolean
  batteryLevel: number | null
  // Dystans/kierunek do auta i celu nawigacji liczone są z `userPosition` (patrz
  // useMapGeolocation) - gdy ten sam GPS nie odświeżył się od dłuższego czasu (zgubiony sygnał
  // pod gęstym listowiem), strzałka i dystans na plakietkach są tak samo "nieaktualne", nawet
  // jeśli liczbowo wyglądają normalnie. Bez tego ostrzeżenia użytkownik ufałby staremu
  // wskazaniu jak świeżemu.
  isPositionStale: boolean
}

// Pasek plakietek stanu (lewy górny róg mapy) - czysto prezentacyjny, wydzielony z MapView
// (Faza 19). Każda plakietka animuje wejście/wyjście niezależnie (AnimatePresence), więc
// pojawianie/znikanie jednej nie przeskakuje pozostałych.
export function MapStatusBadges({
  activeTripName,
  sunsetCountdown,
  mushroomOutlook,
  returnPoint,
  returnPointInfo,
  onClearReturnPoint,
  navigationTargetSpot,
  navigationInfo,
  onClearNavigationTarget,
  powerSaveActive,
  batteryLevel,
  isPositionStale,
}: MapStatusBadgesProps) {
  const [expanded, setExpanded] = useState(false)
  const activeCount = [
    activeTripName,
    sunsetCountdown,
    mushroomOutlook,
    returnPoint,
    navigationTargetSpot,
    powerSaveActive,
  ].filter(Boolean).length

  if (activeCount === 0) return null

  // Przy jednej aktywnej plakietce zwijanie tylko dodałoby zbędne kliknięcie bez realnej
  // korzyści dla widoczności mapy (i tak zajmuje jeden rząd) - próg zwijania od 2 w górę, tam
  // gdzie stos plakietek realnie zaczyna zasłaniać mapę na małym ekranie.
  const collapsible = activeCount > 1
  const showBadges = !collapsible || expanded

  return (
    // Prawy górny róg, nie lewy - Leaflet umieszcza swoje natywne kontrolki zoom (+/-) domyślnie
    // w lewym górnym rogu (topleft), więc plakietki tam nachodziły na nie wizualnie. Prawy górny
    // róg jest wolny (menu narzędzi/FAB są w prawym dolnym, patrz MapToolbar.tsx).
    <div className="absolute right-4 top-4 z-[1000] flex flex-col items-end gap-2">
      {collapsible && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          aria-label={expanded ? 'Zwiń informacje o warunkach' : `Pokaż ${activeCount} informacje o warunkach`}
          className="flex items-center gap-1.5 rounded-full bg-card/95 px-3 py-1.5 text-xs font-medium text-foreground shadow-[var(--shadow-card)] outline-none backdrop-blur supports-[backdrop-filter]:bg-card/80 focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <InfoIcon className="size-3.5 text-muted-foreground" />
          {activeCount}
          <ChevronDownIcon className={`size-3.5 text-muted-foreground transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </button>
      )}
      {showBadges && (
        <AnimatePresence>
          {activeTripName && (
            <motion.div
              key="active-trip-badge"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
            >
              <Badge className="px-3 py-1.5 text-xs shadow">🥾 Aktywna wyprawa: {activeTripName}</Badge>
            </motion.div>
          )}
          {sunsetCountdown && (
            <motion.div
              key="sunset-countdown-badge"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
            >
              <Badge
                variant={sunsetCountdown.isUrgent ? 'destructive-solid' : 'secondary'}
                className="gap-1.5 px-3 py-1.5 text-xs shadow"
              >
                <SunsetIcon className="size-3.5" />
                Zmrok za {sunsetCountdown.label}
              </Badge>
            </motion.div>
          )}
          {mushroomOutlook && (
            <motion.div
              key="mushroom-outlook-badge"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
            >
              <Badge
                variant={mushroomOutlook.score === 'dobry' ? 'secondary' : 'outline'}
                className="gap-1.5 px-3 py-1.5 text-xs shadow"
              >
                <CloudRainIcon className="size-3.5" />
                {mushroomOutlook.label}
              </Badge>
            </motion.div>
          )}
          {powerSaveActive && (
            <motion.div
              key="power-save-badge"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
            >
              <Badge variant="outline" className="gap-1.5 px-3 py-1.5 text-xs shadow">
                <BatteryLowIcon className="size-3.5" />
                Oszczędzanie baterii{batteryLevel != null && ` (${Math.round(batteryLevel * 100)}%)`}
              </Badge>
            </motion.div>
          )}
          {returnPoint && (
            <motion.div
              key="return-point-badge"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
            >
              <Badge variant="secondary" className="gap-1.5 py-1.5 pl-3 pr-1.5 text-xs shadow">
                <CarIcon className="size-3.5" />
                {returnPointInfo
                  ? `Auto: ${formatDistance(returnPointInfo.distanceMeters)} ${getCardinalDirection(returnPointInfo.bearingDegrees)}`
                  : 'Auto zapisane'}
                {returnPointInfo && isPositionStale && (
                  <TriangleAlertIcon
                    className="size-3.5 text-amber-500"
                    aria-label="Sygnał GPS mógł zostać utracony - dystans/kierunek do auta mogą być nieaktualne"
                  />
                )}
                <button
                  type="button"
                  onClick={onClearReturnPoint}
                  aria-label="Usuń zapisaną pozycję auta"
                  className="ml-0.5 flex size-4 items-center justify-center rounded-full outline-none hover:bg-foreground/10 focus-visible:ring-2 focus-visible:ring-ring/50"
                >
                  <XIcon className="size-3" />
                </button>
              </Badge>
            </motion.div>
          )}
          {navigationTargetSpot && (
            <motion.div
              key="spot-navigation-badge"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
            >
              <Badge variant="secondary" className="gap-1.5 py-1.5 pl-3 pr-1.5 text-xs shadow">
                <NavigationIcon className="size-3.5" />
                {navigationInfo
                  ? `${navigationTargetSpot.name}: ${formatDistance(navigationInfo.distanceMeters)} ${getCardinalDirection(navigationInfo.bearingDegrees)}`
                  : navigationTargetSpot.name}
                {navigationInfo && isPositionStale && (
                  <TriangleAlertIcon
                    className="size-3.5 text-amber-500"
                    aria-label="Sygnał GPS mógł zostać utracony - dystans/kierunek do celu mogą być nieaktualne"
                  />
                )}
                <button
                  type="button"
                  onClick={onClearNavigationTarget}
                  aria-label="Zakończ nawigację do grzybowiska"
                  className="ml-0.5 flex size-4 items-center justify-center rounded-full outline-none hover:bg-foreground/10 focus-visible:ring-2 focus-visible:ring-ring/50"
                >
                  <XIcon className="size-3" />
                </button>
              </Badge>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  )
}
