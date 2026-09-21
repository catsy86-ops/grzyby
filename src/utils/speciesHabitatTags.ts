// Filtr atlasu po siedlisku (ROZBUDOWA-ROADMAP.md Część 3 pkt 7) - Species.habitat to dziś wolny
// tekst redakcyjny (species.json), nie ustrukturyzowane pole. Zamiast dopisywać nową treść
// (redakcyjna praca wymagająca weryfikacji użytkownika, patrz zasada z Fazy 25/26
// docs/ROADMAP.md), tagi wyciągane są dopasowaniem słów kluczowych z JUŻ istniejącego,
// zweryfikowanego opisu siedliska - to reorganizacja/prezentacja danych, nie nowa treść
// merytoryczna o jadalności/identyfikacji. Best-effort: gatunek, którego opis nie zawiera żadnego
// z tych słów (np. "wyłącznie pod modrzewiami" bez słowa "iglaste"), nie dostanie żadnego tagu -
// nadal widoczny w widoku "Wszystkie", po prostu nie pod żadnym chipem siedliska. Jeden gatunek
// może mieć więcej niż jeden tag (np. "lasy liściaste i iglaste").
export type HabitatTag = 'iglaste' | 'liściaste' | 'łąka'

export const HABITAT_TAG_LABELS: Record<HabitatTag, string> = {
  iglaste: 'Lasy iglaste',
  liściaste: 'Lasy liściaste',
  łąka: 'Łąki i otwarty teren',
}

export function getHabitatTags(habitat: string): HabitatTag[] {
  const lower = habitat.toLowerCase()
  const tags: HabitatTag[] = []
  if (lower.includes('iglast')) tags.push('iglaste')
  if (lower.includes('liściast')) tags.push('liściaste')
  if (lower.includes('łąk') || lower.includes('pastwisk') || lower.includes('trawnik')) tags.push('łąka')
  return tags
}

export function matchesHabitatTag(habitat: string, tag: HabitatTag | null): boolean {
  if (tag == null) return true
  return getHabitatTags(habitat).includes(tag)
}
