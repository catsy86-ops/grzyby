import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { db } from '../db/db'

export type ActiveTab = 'mapa' | 'rozpoznaj' | 'dziennik' | 'baza-wiedzy'

export interface ReturnPoint {
  latitude: number
  longitude: number
  savedAt: number
}

interface AppState {
  activeTab: ActiveTab
  setActiveTab: (tab: ActiveTab) => void
  activeTripId: number | null
  setActiveTripId: (id: number | null) => void
  returnPoint: ReturnPoint | null
  setReturnPoint: (point: ReturnPoint | null) => void
}

// activeTripId jest utrwalany, żeby zamknięcie/zabicie aplikacji w trakcie wyprawy w lesie
// (typowe przy słabej baterii/zasięgu) nie gubiło powiązania nowych znalezisk z wyprawą.
export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      activeTab: 'mapa',
      setActiveTab: (tab) => set({ activeTab: tab }),
      activeTripId: null,
      setActiveTripId: (id) => set({ activeTripId: id }),
      returnPoint: null,
      setReturnPoint: (point) => set({ returnPoint: point }),
    }),
    {
      name: 'lysy-app-store',
      partialize: (state) => ({ activeTripId: state.activeTripId, returnPoint: state.returnPoint }),
      onRehydrateStorage: () => () => {
        // Odłożone do makrotaska: onRehydrateStorage jest wywoływane synchronicznie
        // wewnątrz create(), zanim `useAppStore` poniżej zdąży zostać przypisany.
        setTimeout(() => reconcileActiveTripId(), 0)
      },
    },
  ),
)

// Jednorazowa weryfikacja po odtworzeniu stanu z localStorage: wskazywana wyprawa mogła
// zostać w międzyczasie zakończona lub usunięta (np. import danych z innego urządzenia).
// Celowo NIE jest to reaktywny efekt na wynik zapytania na żywo - w połączeniu z React
// StrictMode (podwójne montowanie w dev) i Dexie liveQuery prowadziło to do wyścigu, który
// natychmiast czyścił dopiero co ustawioną aktywną wyprawę.
export async function reconcileActiveTripId() {
  const tripId = useAppStore.getState().activeTripId
  if (tripId == null) return
  const trip = await db.trips.get(tripId)
  if (!trip || trip.endedAt != null) {
    useAppStore.setState({ activeTripId: null })
  }
}
