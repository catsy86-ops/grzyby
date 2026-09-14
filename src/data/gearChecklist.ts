export interface GearChecklistItem {
  id: string
  label: string
}

export interface GearChecklistCategory {
  category: string
  items: GearChecklistItem[]
}

// Statyczna lista sprzętu przed wyjściem na grzyby - bez zewnętrznych źródeł, zdroworozsądkowa
// checklista, edytowalna tu w jednym miejscu.
export const GEAR_CHECKLIST: GearChecklistCategory[] = [
  {
    category: 'Zbiór',
    items: [
      { id: 'kosz', label: 'Wiklinowy koszyk (nie worek foliowy - grzyby się zaparzą)' },
      { id: 'nozyk', label: 'Nożyk do grzybów' },
      { id: 'szczoteczka', label: 'Szczoteczka do czyszczenia na miejscu' },
    ],
  },
  {
    category: 'Nawigacja i bezpieczeństwo',
    items: [
      { id: 'telefon-naladowany', label: 'Naładowany telefon' },
      { id: 'powerbank', label: 'Powerbank' },
      { id: 'latarka', label: 'Latarka czołowa (na wypadek powrotu po zmroku)' },
      { id: 'apteczka', label: 'Mała apteczka' },
      { id: 'komus-info', label: 'Numer alarmowy 112 / Centrum Ostrych Zatruć zapisany' },
    ],
  },
  {
    category: 'Odzież i ochrona',
    items: [
      { id: 'wysokie-buty', label: 'Wysokie, wodoodporne buty' },
      { id: 'dlugie-spodnie', label: 'Długie spodnie (ochrona przed kleszczami)' },
      { id: 'spray-kleszcze', label: 'Spray na kleszcze/owady' },
      { id: 'kurtka-przeciwdeszczowa', label: 'Kurtka przeciwdeszczowa' },
    ],
  },
  {
    category: 'Prowiant',
    items: [
      { id: 'woda', label: 'Woda' },
      { id: 'przekaska', label: 'Coś do przekąszenia' },
    ],
  },
]
