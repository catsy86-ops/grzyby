import { CompassIcon, NavigationIcon } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '../../components/ui/drawer'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import { useDeviceHeading } from '../../hooks/useDeviceHeading'
import { formatDistance, getCardinalDirection } from '../../utils/bearing'

interface CompassTarget {
  label: string
  distanceMeters: number
  bearingDegrees: number
}

interface CompassPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  targets: CompassTarget[]
}

const TICKS = Array.from({ length: 12 }, (_, i) => i * 30)
const CARDINAL_LABELS: Record<number, string> = { 0: 'N', 90: 'E', 180: 'S', 270: 'W' }

// Kompas offline (magnetometr/żyroskop przez DeviceOrientationEvent, patrz useDeviceHeading) -
// zero zależności sieciowej, więc działa identycznie bez zasięgu w lesie. Tarcza obraca się pod
// nieruchomą, stałą strzałką na górze (konwencja map-kompasów, nie odwrotnie) - użytkownik trzyma
// telefon przed sobą i czyta, w którą stronę fizycznie skierowana jest górna krawędź ekranu.
// Aktywne cele nawigacji (auto/grzybowisko z MapView) nakładają się jako osobne znaczniki na
// tarczy, obracające się razem z nią wg własnego azymutu względem użytkownika.
export function CompassPanel({ open, onOpenChange, targets }: CompassPanelProps) {
  const isWidePanel = useMediaQuery('(min-width: 1024px)')
  const { headingDegrees, permissionState, requestPermission } = useDeviceHeading()

  return (
    <Drawer
      open={open}
      showSwipeHandle={!isWidePanel}
      swipeDirection={isWidePanel ? 'right' : 'down'}
      onOpenChange={onOpenChange}
    >
      <DrawerContent className={isWidePanel ? undefined : 'mx-auto max-w-md'}>
        <DrawerHeader>
          <DrawerTitle className="flex items-center gap-2">
            <CompassIcon className="size-5" />
            Kompas
          </DrawerTitle>
          <DrawerDescription>
            Działa całkowicie offline - wykorzystuje wyłącznie czujnik kierunku urządzenia, bez
            połączenia z internetem.
          </DrawerDescription>
        </DrawerHeader>

        <div className="flex flex-col items-center gap-4 px-4 pb-6">
          {permissionState === 'unsupported' && (
            <p className="text-center text-sm text-muted-foreground">
              To urządzenie lub przeglądarka nie udostępnia czujnika kierunku (DeviceOrientationEvent).
              Kompas nie jest tu dostępny - skorzystaj z dystansu/kierunku pokazanego w plakietkach
              na mapie zamiast obracającej się tarczy.
            </p>
          )}

          {permissionState === 'prompt' && (
            <div className="flex flex-col items-center gap-3 py-6">
              <p className="text-center text-sm text-muted-foreground">
                iOS wymaga jawnej zgody na dostęp do czujnika kierunku urządzenia.
              </p>
              <Button onClick={() => void requestPermission()}>
                <CompassIcon />
                Włącz kompas
              </Button>
            </div>
          )}

          {permissionState === 'denied' && (
            <p className="text-center text-sm text-muted-foreground">
              Dostęp do czujnika kierunku został odrzucony. Włącz go w ustawieniach przeglądarki
              (Ustawienia → Safari → Motion &amp; Orientation Access) i wróć do tego ekranu.
            </p>
          )}

          {permissionState === 'granted' && (
            <>
              <div className="relative mt-2 size-64 max-w-full">
                {/* Stała strzałka wskazująca "przód urządzenia" - nie obraca się, tarcza pod nią
                    tak. */}
                <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-center">
                  <div className="size-0 border-x-8 border-b-[14px] border-x-transparent border-b-primary" />
                </div>

                <div
                  className="absolute inset-0 rounded-full border-2 border-border bg-card shadow-[var(--shadow-card)] transition-transform duration-150 ease-out"
                  style={{ transform: `rotate(${headingDegrees != null ? -headingDegrees : 0}deg)` }}
                >
                  {TICKS.map((angle) => (
                    <div
                      key={angle}
                      className="absolute inset-0 flex justify-center"
                      style={{ transform: `rotate(${angle}deg)` }}
                    >
                      <div
                        className={
                          angle % 90 === 0
                            ? 'mt-2 h-4 w-0.5 bg-foreground'
                            : 'mt-2.5 h-2.5 w-px bg-muted-foreground'
                        }
                      />
                      {CARDINAL_LABELS[angle] && (
                        <span
                          className="absolute top-6 text-sm font-semibold"
                          style={{ transform: `rotate(${-angle}deg)` }}
                        >
                          {CARDINAL_LABELS[angle]}
                        </span>
                      )}
                    </div>
                  ))}

                  {targets.map((target) => (
                    <div
                      key={target.label}
                      className="absolute inset-0 flex justify-center"
                      style={{ transform: `rotate(${target.bearingDegrees}deg)` }}
                    >
                      <NavigationIcon
                        className="mt-4 size-4 fill-primary text-primary"
                        style={{ transform: `rotate(${-target.bearingDegrees}deg)` }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="text-center">
                <p className="text-heading-md font-semibold tabular-nums">
                  {headingDegrees != null ? `${Math.round(headingDegrees)}°` : '—'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {headingDegrees != null ? getCardinalDirection(headingDegrees) : 'Oczekiwanie na odczyt czujnika...'}
                </p>
              </div>

              {targets.length > 0 && (
                <div className="flex w-full flex-col gap-1.5">
                  {targets.map((target) => (
                    <div
                      key={target.label}
                      className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
                    >
                      <span className="flex items-center gap-1.5 font-medium">
                        <NavigationIcon className="size-3.5 text-primary" />
                        {target.label}
                      </span>
                      <span className="text-muted-foreground">
                        {formatDistance(target.distanceMeters)} {getCardinalDirection(target.bearingDegrees)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  )
}
