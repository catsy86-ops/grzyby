# Audyt Bazy Wiedzy 2026-09-22: architektura/clean code, wydajność, UX/luki

Wygenerowane przez trzy równoległe agenty (`architect`, `performance-engineer`, `frontend-expert`)
czytające świeżo `src/features/encyclopedia/` i powiązane komponenty/utils - analogicznie do
`docs/MAP-AUDIT-ROADMAP.md` i `docs/JOURNAL-AUDIT-ROADMAP.md` (ten sam dzień co Dziennik, inny
feature).

**Nic z tego nie jest jeszcze zaimplementowane w chwili pisania tego dokumentu.**

**Korekta stanu wejściowego**: `species.json` ma **28 gatunków**, nie 19 jak sugerowały
nieaktualne komentarze w kodzie (`EncyclopediaView.tsx:133`, `MapView.tsx:188`) i wcześniejsza
pamięć projektu - do poprawienia przy okazji (patrz pkt 5 niżej).

---

## Tier 0: wymaga decyzji przed realizacją (treść redakcyjna, nie kod)

**Jedno zdjęcie na gatunek wszędzie.** `Species.imageUrls` jest typu `string[]` (`schema.ts:12`),
ale wszystkie 28 wpisów ma dokładnie jeden URL, a wszyscy trzej konsumenci (`EncyclopediaView`,
`SpeciesComparator`, `LookalikeQuiz`) i tak czytają tylko `imageUrls[0]`. Realny foragerski gap:
część opisów (`smardz-jadalny`, `piestrzenica-kasztanowata`) wprost instruuje "zawsze przekrój
wzdłuż, żeby sprawdzić wnętrze" - bez drugiego zdjęcia nie ma jak to pokazać. To pozyskanie
dodatkowych zdjęć (kapelusz z góry, spód/blaszki, przekrój trzonu), nie zmiana kodu - pole i
mechanizm lazy-load już to obsłużą bez żadnej modyfikacji. **Wymaga Twojej decyzji/materiału**, nie
implementacji.

---

## Tier 1: realne problemy/luki, niska-średnia złożoność - bezpieczne do zrobienia od razu

1. **`speciesData as Species[]` cast zduplikowany 4× w samej Bazie Wiedzy** -
   `EncyclopediaView.tsx:59` (przeliczany przy każdym renderze, w przeciwieństwie do pozostałych
   trzech), `ForestAssistant.tsx:3,19`, `LookalikeQuiz.tsx:3,11`, `SpeciesComparePicker.tsx:2,9`.
   Wydzielić jedną stałą (np. `src/data/species.ts`: `export const ALL_SPECIES = speciesData as
   Species[]`), użytą przez wszystkie cztery pliki. Złożoność: **niska**.

2. **Listy gatunków nigdzie w Bazie Wiedzy nie są alfabetyczne, mimo że wzorzec już istnieje w
   `MapView.tsx:194`** (`.sort((a, b) => a.nameCommon.localeCompare(b.nameCommon, 'pl'))`).
   `EncyclopediaView.tsx:234-235` renderuje `filtered` w surowej kolejności z JSON-a,
   `SpeciesComparePicker.tsx:49-55,70-76` wypełnia oba dropdowny tak samo nieposortowane. Przy 28
   kartach/pozycjach w Select to realne utrudnienie skanowania wzrokiem. Fix: ten sam
   `localeCompare(..., 'pl')` w obu miejscach. Złożoność: **niska**.

3. **Wyszukiwanie nie ignoruje polskich znaków diakrytycznych.** `EncyclopediaView.tsx:79-81` i
   `ForestAssistant.tsx:51-53` robią `.toLowerCase().includes(query.toLowerCase())` bez
   normalizacji - "Gąska zielonka" nie znajdzie się po wpisaniu "gaska" (częste przy szybkim
   pisaniu w terenie, autokorekta wyłączona / rękawiczki). Fix: jeden wspólny
   `normalizeForSearch()` (strip diakrytyków) użyty w obu miejscach, nie kopiowany inline.
   Złożoność: **średnia** (musi być jeden wspólny util, nie duplikat logiki w dwóch plikach).

4. **`ForestAssistant` nie pokazuje żadnego komunikatu, gdy `outlookStatus === 'unavailable'`.**
   `ForestAssistant.tsx:173-184` obsługuje tylko `'loading'`/`'ready'` - przy odmowie GPS lub
   błędzie fetchu (`:75-80`) użytkownik nie wie, czy appka wciąż sprawdza, poddała się, czy pogoda
   po prostu jest offline niedostępna. Fix: badge/tekst dla stanu `'unavailable'`, np. "Pogoda
   niedostępna (brak GPS/offline)". Złożoność: **niska**.

5. **`LookalikeQuiz` przyciski-kandydaci nie mają żadnej dostępnej nazwy przed odpowiedzią.**
   `LookalikeQuiz.tsx:107-113` - `alt=""` na obrazku jest celowe (nie zdradzać odpowiedzi), ale
   otaczający `<button>` też nie ma tekstu/`aria-label`, więc czytnik ekranu widzi dwa
   nieodróżnialne "button". Fix: `aria-label="Kandydat A"`/`"Kandydat B"` (pozycyjne, nie zdradza
   odpowiedzi) - naprawia orientację, nie pełną dostępność z natury wzrokowego ćwiczenia (warte
   dopisania w opisie drawer, że quiz wymaga wzroku). Złożoność: **niska-średnia**.

6. **`SpeciesComparePicker` nie resetuje wyborów przy zamknięciu bez dokończenia porównania.**
   `SpeciesComparePicker.tsx:31` podpina `onOpenChange` prosto do settera rodzica, bez własnego
   wrappera (kontrast z `ForestAssistant.tsx:100-103`, które przy zamknięciu wywołuje `reset()`).
   Użytkownik wybiera gatunek A, zamyka drawer bez wyboru B/bez "Porównaj" - A zostaje wybrany przy
   następnym otwarciu. Fix: opakować `onOpenChange`, czyścić `speciesAId`/`speciesBId` gdy
   zamknięcie nie poszło przez "Porównaj". Złożoność: **niska**.

7. **Brak pliku testowego `LookalikeQuiz.test.tsx`** - jedyny komponent w tym folderze bez testu
   (`ForestAssistant`/`SpeciesComparePicker`/`EncyclopediaView` mają swoje). Nietrywialna logika do
   pokrycia: `handleAnswer`/scoring (`:45-49`), `handleNext`/`handleRestart` (`:51-59`), pusty stan
   "za mało par" (`:72-75`). Złożoność: **niska**.

8. **`SpeciesComparePicker.test.tsx` pokrywa tylko stan zamknięty i przycisk disabled (2 testy) -
   nigdy właściwy przepływ porównania.** Brak testu na wybranie obu gatunków i otwarcie
   `SpeciesComparator` z poprawną parą (`SpeciesComparePicker.tsx:87-99`). Złożoność: **niska**.
   (Napisać przed/przy okazji pkt 6, żeby nowy test mógł zweryfikować naprawiony reset.)

9. **Nieaktualny komentarz "19 gatunków"** w `EncyclopediaView.tsx:133` i `MapView.tsx:188` -
   realnie 28. Kosmetyczna poprawka przy okazji dotykania tych plików. Złożoność: **trywialna**.

---

## Osobno: obrazy gatunków (zasoby statyczne, nie kod komponentów)

**Pełnowymiarowe, nieskompresowane JPG-i (śr. ~224KB, max ~370KB, 29 plików w
`public/species-images/`) wyświetlane jako małe miniatury** (siatka 2-kolumnowa w
`EncyclopediaView.tsx:251`, jeszcze mniejsze kafle w `SpeciesComparator`/`LookalikeQuiz`).
`loading="lazy"` jest już wszędzie poprawnie zastosowane - to nie problem "wszystko ładuje się na
starcie", ale realny koszt transferu (rząd megabajtów) przy przescrollowaniu całej listy w terenie
na słabszym LTE. Fix wymaga przygotowania mniejszych wariantów (np. ~400-600px, WebP) - zmiana
procesu budowania/przygotowania assetów, nie logiki React. Złożoność: **niska-średnia**, ale
osobna sesja (obróbka obrazów), nie "szybki fix kodu" jak reszta Tier 1.

---

## Sprawdzone i potwierdzone jako OK (nie zmieniać)

- **Granice modułów** `EncyclopediaView`/`ForestAssistant`/`LookalikeQuiz`/`SpeciesComparePicker` -
  czyste, jednoznaczne odpowiedzialności (przeglądanie/filtrowanie vs. narzędzie "czy iść teraz"
  vs. quiz-fiszki vs. doraźny picker porównania), zero przecieku logiki.
  `LookalikesWarning`/`SpeciesComparator`/`EdibilityBadge`/`SeasonCalendarStrip` poprawnie
  współdzielone, bez duplikacji.
- **Offline zdjęcia gatunków działają poprawnie** - `vite.config.ts` `globPatterns` obejmuje `jpg`,
  Service Worker precache'uje wszystkie pliki z `public/species-images/`. Brak luki tutaj (wbrew
  wstępnemu przypuszczeniu przed audytem).
- **`ForestAssistant`'s jednorazowy, nieocache'owany fetch pogody** wygląda na duplikat
  `useMushroomOutlook`/`useSpotMushroomOutlook` (Tier 2 z `MAP-AUDIT-ROADMAP.md` #10), ale to
  świadomie inny przypadek użycia - "sprawdź raz przed wyjściem z domu" per wybrany gatunek, nie
  ciągłe śledzenie GPS-owe. Konsolidacja pomieszałaby jednorazowe narzędzie z cache'em
  zaprojektowanym pod live-tracking. Nie dotykać.
- **`species.json` (28 wpisów, 26KB) importowany eagerly** - przy tym rozmiarze parsowanie to
  submilisekundy, code-splitting danych dałby zero realnego zysku (`EncyclopediaView` i tak jest
  już pod `React.lazy` na poziomie route'a).
- **`Collapsible` (base-ui, `keepMounted: false` domyślnie)** - zwinięta zawartość karty faktycznie
  się odmontowuje, `getLookalikes()` liczone tylko dla realnie rozwiniętych kart. Świadomie
  zaprojektowane progresywne odkrywanie treści.
- **`getSpeciesSpotHistory`** - jedno zapytanie Dexie + jeden `bulkGet`, bez N+1 (dokładnie wzorzec,
  którego brakowało w `SpotManager` przed jego własną naprawą w audycie Mapy - tu zrobione
  poprawnie od razu).
- **Brak memoizacji filtrowania w `ForestAssistant`/`SpeciesComparePicker`** - świadomie NIE
  rekomendowane dodawanie `useMemo` przy 28 elementach - koszt obliczenia niższy niż koszt
  utrzymania memoizacji, re-render i tak następuje tylko przy pisaniu w wyszukiwarce.
  **Nie proponować `useMemo`/`useCallback` tutaj.**
  Brak wirtualizacji listy 28 kart - o rząd wielkości za mała skala, żeby to uzasadnić.
- **Legal-protection i dangerous-lookalike warnings zawsze widoczne** (nie schowane w
  "Szczegóły") - poprawnie priorytetyzują bezpieczeństwo nad ciekawostkami.
- **`buildQuizPairs`/`getLookalikes`/`hasDangerousLookalike`** - małe, jednoznaczne, bez nakładania
  się odpowiedzialności; quiz poprawnie filtruje pary bez zdjęć, więc jego pusty stan jest realny,
  nie dekoracyjny.

---

## Rekomendowana kolejność realizacji

Tier 1 (pkt 1-9) to niskie-średnie ryzyko, żadne nie dotyka tego samego miejsca co inne poza
naturalną kolejnością testy-przed-fixem (pkt 7/8 przed pkt 5/6, żeby nowy test mógł zweryfikować
naprawę). Bezpieczne do zrobienia razem w jednej sesji. Obrazy gatunków (osobna sekcja) i Tier 0
(dodatkowe zdjęcia gatunków) wymagają osobnej sesji/materiału od Ciebie - nie mieszać z Tier 1.
