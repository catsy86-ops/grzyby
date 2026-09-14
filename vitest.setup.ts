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
