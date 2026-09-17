import { ExternalLinkIcon, MapIcon } from 'lucide-react'
import { szczecinSpots } from '../../data/szczecinSpots'
import { Button } from '../../components/ui/button'
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '../../components/ui/drawer'
import { useMediaQuery } from '../../hooks/useMediaQuery'

interface SzczecinSpotsPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onShowOnMap: (position: [number, number]) => void
}

// Lista kuratorowanych grzybowisk (patrz data/szczecinSpots.ts) - apka jest kierowana do
// mieszkańców Szczecina i okolic, więc obok mapy ogólnej dostają gotowy, zweryfikowany punkt
// startowy "gdzie w ogóle jechać", zamiast pustej mapy bez żadnej podpowiedzi.
export function SzczecinSpotsPanel({ open, onOpenChange, onShowOnMap }: SzczecinSpotsPanelProps) {
  const isWidePanel = useMediaQuery('(min-width: 1024px)')

  return (
    <Drawer open={open} showSwipeHandle={!isWidePanel} swipeDirection={isWidePanel ? 'right' : 'down'} onOpenChange={onOpenChange}>
      <DrawerContent className={isWidePanel ? undefined : 'mx-auto max-w-md'}>
        <DrawerHeader>
          <DrawerTitle>Szczecin i okolice</DrawerTitle>
          <DrawerDescription>
            Sprawdzone grzybowiska w regionie, ze źródłami - to punkt startowy, nie gwarancja
            znaleziska. Zawsze sprawdź aktualne zasady wejścia do lasu (rezerwaty, prywatne
            grunty).
          </DrawerDescription>
        </DrawerHeader>
        <div className="flex flex-col gap-3 overflow-y-auto px-4 pb-4">
          {szczecinSpots.map((spot) => (
            <div key={spot.id} className="rounded-xl border border-border p-3">
              <p className="font-[550]">{spot.name}</p>
              <p className="mt-1 text-sm text-foreground/80">{spot.description}</p>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <a
                  href={spot.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <ExternalLinkIcon className="size-3" />
                  Źródło: {spot.sourceLabel}
                </a>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onShowOnMap([spot.latitude, spot.longitude])
                    onOpenChange(false)
                  }}
                >
                  <MapIcon />
                  Pokaż na mapie
                </Button>
              </div>
            </div>
          ))}
        </div>
      </DrawerContent>
    </Drawer>
  )
}
