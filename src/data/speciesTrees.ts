import type { Species } from '../db/schema'
import type { TreeCode } from './forestCodes'
import speciesData from './species.json'

// Drzewa, pod którymi / na których dany gatunek z atlasu typowo rośnie - wyłącznie te, które
// pole `habitat` w species.json wymienia wprost (np. "zwłaszcza pod dębami, bukami i świerkami"
// albo "lasy sosnowe"). Gatunki opisane ogólnie ("lasy liściaste i iglaste", łąki, martwe drewno)
// celowo tu nie trafiają - nie dopowiadamy mikoryzy, której atlas nie podaje. Przy zmianie
// `habitat` w species.json trzeba zaktualizować też ten wpis.
export const SPECIES_TREES: Partial<Record<string, TreeCode[]>> = {
  'borowik-szlachetny': ['DB', 'BK', 'SW'],
  'goryczak-zolciowy': ['SO', 'SW'],
  'muchomor-sromotnikowy': ['DB', 'BK'],
  'muchomor-czerwony': ['BRZ', 'SW', 'SO'],
  'maslak-zwyczajny': ['SO'],
  'borowik-szatanski': ['DB', 'GB'],
  'gaska-zielonka': ['SO'],
  'podgrzybek-brunatny': ['SO', 'SW'],
  'kozlarz-babka': ['BRZ'],
  'piestrzenica-kasztanowata': ['SO'],
  'krowiak-podwiniety': ['BRZ'],
  'kozlarz-czerwony': ['TP', 'OS'],
  'maslak-zolty': ['MD'],
  'mleczaj-rydz': ['SO'],
  'plomiennica-zimowa': ['WB', 'TP'],
  'siedzun-sosnowy': ['SO'],
  'krasnoborowik-ceglastopory': ['BK', 'SW'],
  'kozlarz-pomaranczowozolty': ['BRZ'],
  'maslak-ziarnisty': ['SO'],
  'lejkowiec-dety': ['BK', 'DB'],
  'zolciak-siarkowy': ['WB', 'DB', 'AK'],
  'zaslonak-rudy': ['DB', 'BRZ'],
  'wlokniak-ceglasty': ['BK', 'LP'],
}

export interface SpeciesForTree {
  // Jadalne i warunkowo jadalne, bez gatunków chronionych (zbiór zabroniony).
  edible: Species[]
  // Trujące i śmiertelnie trujące - pokazywane zawsze, jako ostrzeżenie.
  dangerous: Species[]
}

export function getSpeciesForTree(tree: TreeCode): SpeciesForTree {
  const matching = (speciesData as Species[]).filter((species) => SPECIES_TREES[species.id]?.includes(tree))
  return {
    edible: matching.filter(
      (species) => (species.edibility === 'jadalny' || species.edibility === 'warunkowo-jadalny') && !species.legalProtection,
    ),
    dangerous: matching.filter((species) => species.edibility === 'trujący' || species.edibility === 'śmiertelnie-trujący'),
  }
}
