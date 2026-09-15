import 'fake-indexeddb/auto'
import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

// jsdom nie implementuje matchMedia - potrzebne przez next-themes (ThemeProvider), sonner
// (Toaster) i useMediaQuery (SpotManager i inne miejsca responsywne wg szerokości ekranu).
// Globalny mock zamiast dublowania go w każdym pliku testowym, który renderuje coś z tego
// łańcucha zależności - `matches: false` jako bezpieczny domyślny stan (np. "wąski ekran").
vi.stubGlobal(
  'matchMedia',
  vi.fn((query: string) => ({
    matches: false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
  })),
)

// jsdom nie implementuje ResizeObserver - potrzebne przez Leaflet (MapContainer wywołuje
// `invalidateSize`/nasłuchuje zmian rozmiaru kontenera przy inicjalizacji). Bez tego mocka
// renderowanie komponentów mapy (MapView, MapLayers) w testach rzuca wyjątkiem przy montowaniu,
// zanim jakikolwiek test zdąży cokolwiek sprawdzić.
class ResizeObserverMock {
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
}
vi.stubGlobal('ResizeObserver', ResizeObserverMock)

// jsdom nie implementuje Web Animations API (`Element.prototype.animate`) - z ResizeObserver
// zdefiniowanym wyżej, @formkit/auto-animate (Dziennik, wyniki Rozpoznawania) zaczyna faktycznie
// próbować animować DOM przy każdej zmianie listy, co bez tego poniższego minimalnego fejku
// kończy się `TypeError: el.animate is not a function` przy montowaniu/odmontowaniu w testach.
// Zwraca obiekt zgodny z tym, czego auto-animate faktycznie używa: `addEventListener('finish', ...)`
// - zdarzenie 'finish' emitowane od razu w mikrotasku, żeby biblioteka posprzątała po sobie.
if (typeof Element !== 'undefined' && !Element.prototype.animate) {
  Element.prototype.animate = function animate() {
    const target = new EventTarget()
    queueMicrotask(() => target.dispatchEvent(new Event('finish')))
    return Object.assign(target, {
      cancel: () => {},
      finish: () => {},
      play: () => {},
      pause: () => {},
    })
  } as typeof Element.prototype.animate
}
