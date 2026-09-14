// Grupa kształtu owocnika - realny, pierwszy sygnał, po którym grzybiarz rozpoznaje grzyb z
// odległości, zanim przeczyta jakikolwiek opis (rurki/blaszki pod kapeluszem, lejek, plaster
// miodu smardza, kula purchawki). Osobna, statyczna mapa (nie pole w species.json) - to
// klasyfikacja morfologiczna, nie dana redakcyjna wymagająca weryfikacji źródłowej jak
// jadalność/ochrona prawna, więc nie ma potrzeby rozszerzać schematu/danych.
export type SpeciesShapeGroup = 'rurkowy' | 'blaszkowy' | 'lejkowaty' | 'siodlowy' | 'kulisty'

export const SHAPE_GROUP_LABEL: Record<SpeciesShapeGroup, string> = {
  rurkowy: 'Rurkowy (gąbczasty spód kapelusza)',
  blaszkowy: 'Blaszkowy (blaszki pod kapeluszem)',
  lejkowaty: 'Lejkowaty (fałdki zbiegające po trzonie)',
  siodlowy: 'Siodłowy (plaster miodu / pofałdowany kapelusz)',
  kulisty: 'Kulisty (bez podziału na kapelusz i trzon)',
}

const SPECIES_SHAPE_GROUP: Record<string, SpeciesShapeGroup> = {
  'borowik-szlachetny': 'rurkowy',
  'goryczak-zolciowy': 'rurkowy',
  'maslak-zwyczajny': 'rurkowy',
  'borowik-szatanski': 'rurkowy',
  'podgrzybek-brunatny': 'rurkowy',
  'kozlarz-babka': 'rurkowy',
  'muchomor-sromotnikowy': 'blaszkowy',
  'muchomor-jadowity': 'blaszkowy',
  'czubajka-kania': 'blaszkowy',
  'muchomor-czerwony': 'blaszkowy',
  'gaska-zielonka': 'blaszkowy',
  'opienka-miodowa': 'blaszkowy',
  'helmowka-jadowita': 'blaszkowy',
  'krowiak-podwiniety': 'blaszkowy',
  'pieprznik-jadalny': 'lejkowaty',
  'lisowka-pomaranczowa': 'lejkowaty',
  'smardz-jadalny': 'siodlowy',
  'piestrzenica-kasztanowata': 'siodlowy',
  'purchawka-olbrzymia': 'kulisty',
}

export function getSpeciesShapeGroup(speciesId: string): SpeciesShapeGroup | undefined {
  return SPECIES_SHAPE_GROUP[speciesId]
}
