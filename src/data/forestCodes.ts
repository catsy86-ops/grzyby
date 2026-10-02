// Słowniki kodów z Banku Danych o Lasach (nakładka "Drzewostany", data/mapLayers.ts) - te same
// skróty, które widać na mapie (np. "SO80" = sosna, 80 lat). Kody gatunków podrzędnych (DB.B,
// DB.S, OL.S...) sprowadzamy do rodzaju przed kropką: grzybom mikoryzowym zwykle wystarcza "dąb".

export type TreeCode =
  | 'SO'
  | 'SW'
  | 'JD'
  | 'MD'
  | 'DG'
  | 'BK'
  | 'DB'
  | 'GB'
  | 'BRZ'
  | 'OL'
  | 'OS'
  | 'TP'
  | 'LP'
  | 'JS'
  | 'KL'
  | 'JW'
  | 'WZ'
  | 'WB'
  | 'AK'

export const TREE_NAMES: Record<TreeCode, string> = {
  SO: 'Sosna',
  SW: 'Świerk',
  JD: 'Jodła',
  MD: 'Modrzew',
  DG: 'Daglezja',
  BK: 'Buk',
  DB: 'Dąb',
  GB: 'Grab',
  BRZ: 'Brzoza',
  OL: 'Olsza',
  OS: 'Osika',
  TP: 'Topola',
  LP: 'Lipa',
  JS: 'Jesion',
  KL: 'Klon',
  JW: 'Jawor',
  WZ: 'Wiąz',
  WB: 'Wierzba',
  AK: 'Robinia (akacja)',
}

// BDL zapisuje kody wielkimi literami, czasem z polskimi znakami ("ŚW") - normalizujemy do
// kluczy TREE_NAMES. Nieznany kod (rzadkie gatunki) zwraca null, a karta pokaże surowy skrót.
export function normalizeTreeCode(raw: string): TreeCode | null {
  const base = raw.trim().toUpperCase().split('.')[0].replace('Ś', 'S')
  return base in TREE_NAMES ? (base as TreeCode) : null
}

// Typy siedliskowe lasu - mówią o glebie i wilgotności, co dla grzybiarza bywa równie ważne jak
// gatunek drzewa (np. bór suchy vs. bór wilgotny).
const SITE_TYPE_NAMES: Record<string, string> = {
  BS: 'bór suchy',
  BŚW: 'bór świeży',
  BW: 'bór wilgotny',
  BB: 'bór bagienny',
  BMŚW: 'bór mieszany świeży',
  BMW: 'bór mieszany wilgotny',
  BMB: 'bór mieszany bagienny',
  LMŚW: 'las mieszany świeży',
  LMW: 'las mieszany wilgotny',
  LMB: 'las mieszany bagienny',
  LŚW: 'las świeży',
  LW: 'las wilgotny',
  OL: 'ols',
  OLJ: 'ols jesionowy',
  LŁ: 'las łęgowy',
  BG: 'bór górski',
  BWG: 'bór wysokogórski',
  BMG: 'bór mieszany górski',
  LMG: 'las mieszany górski',
  LG: 'las górski',
}

export function siteTypeName(raw: string): string | null {
  return SITE_TYPE_NAMES[raw.trim().toUpperCase()] ?? null
}
