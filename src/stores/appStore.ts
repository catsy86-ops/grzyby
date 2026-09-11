import { create } from 'zustand'

export type ActiveTab = 'mapa' | 'rozpoznaj' | 'dziennik' | 'baza-wiedzy'

interface AppState {
  activeTab: ActiveTab
  setActiveTab: (tab: ActiveTab) => void
  activeTripId: number | null
  setActiveTripId: (id: number | null) => void
}

export const useAppStore = create<AppState>((set) => ({
  activeTab: 'mapa',
  setActiveTab: (tab) => set({ activeTab: tab }),
  activeTripId: null,
  setActiveTripId: (id) => set({ activeTripId: id }),
}))
