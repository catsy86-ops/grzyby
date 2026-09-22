import type { Species } from '../db/schema'
import speciesJson from './species.json'

// Jedna, współdzielona stała zamiast `speciesData as Species[]` powtarzanego osobno w każdym
// pliku Bazy Wiedzy (BAZA-WIEDZY-AUDIT-ROADMAP.md Tier 1 pkt 1) - ten sam wzorzec co
// `szczecinSpots.ts` obok.
export const ALL_SPECIES = speciesJson as Species[]
