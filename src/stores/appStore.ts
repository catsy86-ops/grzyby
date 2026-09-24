import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { db } from '../db/db'
import { DEFAULT_MAP_LAYER_ID, type MapLayerId } from '../data/mapLayers'

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
  navigationTargetSpotId: number | null
  setNavigationTargetSpotId: (id: number | null) => void
  forestMode: boolean
  setForestMode: (enabled: boolean) => void
  mapLayerId: MapLayerId
  setMapLayerId: (id: MapLayerId) => void
  powerSaveMode: PowerSaveMode
  setPowerSaveMode: (mode: PowerSaveMode) => void
  emergencyInfo: EmergencyInfo
  setEmergencyInfo: (info: EmergencyInfo) => void
  // Celowo NIE persystowane jako "włączone" między sesjami (patrz partialize niżej) - polityka
  // autoplay przeglądarek wymaga gestu użytkownika przy KAŻDYM ładowaniu strony, nie tylko przy
  // pierwszym włączeniu kiedykolwiek. Gdyby to przetrwało reload, przełącznik pokazywałby "gra",
  // a AudioContext cicho utknąłby zawieszony bez dźwięku aż do następnego kliknięcia gdziekolwiek.
  ambientAudioEnabled: boolean
  setAmbientAudioEnabled: (enabled: boolean) => void
  // Głośność za to persystowana - to preferencja, nie stan odtwarzania, i nie ma z autoplay nic
  // wspólnego.
  ambientAudioVolume: number
  setAmbientAudioVolume: (volume: number) => void
  // Kiedy użytkownik ostatnio zrobił pełny eksport JSON (jedyna forma backupu - apka jest 100%
  // offline, bez chmury) - patrz utils/backupReminder.ts i BackupReminderBanner. `null` = nigdy.
  lastExportAt: number | null
  setLastExportAt: (timestamp: number) => void
  // Zaznaczenia checklisty sprzętu (features/tools/GearChecklist.tsx) - przygotowania mogą trwać
  // dłużej niż jedna sesja, więc stan przetrwa zamknięcie apki, tak jak reszta appStore.
  gearChecklistChecked: string[]
  setGearChecklistChecked: (ids: string[]) => void
}

// Dane karty awaryjnej (patrz features/tools/EmergencyCard.tsx) - czysto lokalne (localStorage,
// jak reszta appStore), nigdy nie opuszczają urządzenia inaczej niż przez jawną akcję
// użytkownika (SMS/telefon). Puste stringi domyślnie, nie `undefined` - prostsze bindowanie do
// kontrolowanych <Input> bez `?? ''` w każdym miejscu użycia.
export interface EmergencyInfo {
  bloodType: string
  allergies: string
  contactName: string
  contactPhone: string
}

// 'auto' włącza oszczędzanie baterii samodzielnie poniżej progu z useBatteryStatus (patrz
// MapView) - użytkownik może to wymusić ('always', np. wie że nie ma ładowarki na cały dzień w
// lesie) lub całkiem wyłączyć ('never', np. woli maksymalną dokładność GPS-a mimo baterii).
export type PowerSaveMode = 'auto' | 'always' | 'never'

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
      navigationTargetSpotId: null,
      setNavigationTargetSpotId: (id) => set({ navigationTargetSpotId: id }),
      forestMode: false,
      setForestMode: (enabled) => set({ forestMode: enabled }),
      mapLayerId: DEFAULT_MAP_LAYER_ID,
      setMapLayerId: (id) => set({ mapLayerId: id }),
      powerSaveMode: 'auto',
      setPowerSaveMode: (mode) => set({ powerSaveMode: mode }),
      emergencyInfo: { bloodType: '', allergies: '', contactName: '', contactPhone: '' },
      setEmergencyInfo: (info) => set({ emergencyInfo: info }),
      ambientAudioEnabled: false,
      setAmbientAudioEnabled: (enabled) => set({ ambientAudioEnabled: enabled }),
      // Domyślnie cicho (10%) - to appka terenowa, dźwięk w tle nie może zagłuszać syntezatora
      // mowy ani alertów systemowych telefonu, więc startowa głośność jest niska, nie "połowa".
      ambientAudioVolume: 0.1,
      setAmbientAudioVolume: (volume) => set({ ambientAudioVolume: volume }),
      lastExportAt: null,
      setLastExportAt: (timestamp) => set({ lastExportAt: timestamp }),
      gearChecklistChecked: [],
      setGearChecklistChecked: (ids) => set({ gearChecklistChecked: ids }),
    }),
    {
      name: 'lysy-app-store',
      partialize: (state) => ({
        activeTripId: state.activeTripId,
        returnPoint: state.returnPoint,
        navigationTargetSpotId: state.navigationTargetSpotId,
        forestMode: state.forestMode,
        mapLayerId: state.mapLayerId,
        powerSaveMode: state.powerSaveMode,
        emergencyInfo: state.emergencyInfo,
        ambientAudioVolume: state.ambientAudioVolume,
        lastExportAt: state.lastExportAt,
        gearChecklistChecked: state.gearChecklistChecked,
      }),
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
