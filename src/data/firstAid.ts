// Statyczna treść bezpieczeństwa - zero zależności od sieci/API, zgodna z ogólnymi zaleceniami
// toksykologicznymi przy podejrzeniu zatrucia grzybami (m.in. opóźnione działanie amatoksyn,
// patrz opis muchomora sromotnikowego w species.json). To ogólny przewodnik, NIE zastępuje
// pomocy medycznej - każdy punkt prowadzi do kontaktu z lekarzem/ratownikami, nie leczenia w domu.

export interface FirstAidStep {
  title: string
  description: string
}

export const FIRST_AID_STEPS: FirstAidStep[] = [
  {
    title: 'Zadzwoń po pomoc natychmiast',
    description:
      'Zadzwoń pod 112 lub skontaktuj się z Centrum Ostrych Zatruć - nie czekaj na nasilenie objawów. Część trucizn grzybowych (np. amatoksyny) daje pierwsze objawy dopiero po 6-24h, gdy narządy wewnętrzne mogą już być uszkodzone - im szybsza pomoc, tym większa szansa na skuteczne leczenie.',
  },
  {
    title: 'Nie wywołuj wymiotów na własną rękę',
    description:
      'Nie prowokuj wymiotów ani nie podawaj niczego "na przeczyszczenie" bez wyraźnego polecenia dyspozytora/lekarza - w niektórych przypadkach może to zaszkodzić bardziej niż pomóc.',
  },
  {
    title: 'Zachowaj resztki grzybów i pokaż wpis z Dziennika',
    description:
      'Nie wyrzucaj resztek zjedzonych grzybów, obierzyn ani opakowań - to najważniejsza wskazówka do identyfikacji gatunku przez toksykologa. Jeśli znalezisko jest zapisane w Dzienniku (zdjęcie, gatunek, lokalizacja), pokaż je ratownikom lub lekarzowi.',
  },
  {
    title: 'Zanotuj szczegóły',
    description:
      'Co dokładnie zjedzono, ile mniej więcej, o której godzinie, i o której godzinie pojawiły się pierwsze objawy - te informacje bardzo pomagają w szybkiej diagnozie i doborze leczenia.',
  },
  {
    title: 'Uwaga na "fałszywą poprawę"',
    description:
      'Przy zatruciu niektórymi gatunkami (np. muchomorem sromotnikowym) wymioty i biegunka mogą ustąpić po 1-2 dniach, dając złudne wrażenie wyzdrowienia, podczas gdy uszkodzenie wątroby postępuje w tle. Nie odwołuj wizyty lekarskiej tylko dlatego, że objawy chwilowo ustąpiły.',
  },
  {
    title: 'Objawy wymagające natychmiastowej reakcji',
    description:
      'Silne wymioty lub biegunka, bóle brzucha, zaburzenia widzenia, nadmierne pocenie się lub ślinienie, splątanie, żółtaczka (zażółcenie skóry/oczu), drgawki lub utrata przytomności - przy każdym z nich niezwłocznie szukaj pomocy medycznej.',
  },
]

export const FIRST_AID_DISCLAIMER =
  'Ten przewodnik to ogólne informacje, nie porada medyczna ani instrukcja leczenia w domu. Przy podejrzeniu zatrucia zawsze skontaktuj się z profesjonalną pomocą medyczną.'
