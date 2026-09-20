# Plan rozbudowy: UI, QoL i brakujące funkcje - propozycje do wyboru

Wygenerowane 2026-09-20 przez trzy równoległe agenty (UI/wizualne, QoL/tarcie w workflow,
brakujące funkcje/treść), na bazie audytu kodu PO sesji odznak (`achievements.ts` +5 pozycji,
`Trip.wasRainy`). Punkt wyjścia: `nowe.md` (ChatGPT brainstorm) jest już w pełni zaimplementowany
poza kontami+sync, więc to jest **kolejna warstwa** propozycji, głębsza niż oryginalny brainstorm.

**To jest materiał do przejrzenia i wyboru, nic z tego nie zostało zaimplementowane.** Konta+sync
i tryb rodzinny świadomie pominięte (odłożone przez użytkownika, wymagają backendu).

---

## Część 1: UI / wizualne

Apka jest już mocno dopracowana wizualnie (Fazy A-D + kolejne sesje polish) - agent UI-audit
znalazł niewiele realnych luk poza mapą/tokenami/skeletonami, które są już pokryte.

1. **Brak jednego ekranu "Ustawienia"**. Konfiguracja rozproszona: `ToolsMenu.tsx` (tryb w
   lesie, ambient audio), `MapHeaderActions.tsx` (power-save, warstwa mapy - dostępne TYLKO z
   zakładki Mapa), samotny `ThemeToggle` w nagłówku (`App.tsx:252`), `EmergencyCard.tsx` jako
   osobny dialog. Użytkownik szukający power-save nie znajdzie go w Narzędziach. Ten sam wniosek
   wyszedł niezależnie z audytu QoL (patrz Część 2, pkt 1) - silny sygnał, że to realna luka, nie
   kosmetyka. Złożoność: **średnia** (głównie reorganizacja, nie nowy kod).

2. **`JournalView.tsx` urosło do 931 linii** (lista, filtry, eksport JSON/PDF/GPX/CSV, edycja
   inline, banner backupu). Nie blokuje niczego dziś, ale każda kolejna zmiana UI w Dzienniku
   będzie coraz trudniejsza do bezpiecznego wprowadzenia. Warto rozbić na podkomponenty przy
   następnej większej zmianie tego widoku, nie jako osobna sesja. Złożoność: **średnia**.

3. *(Drobiazg, do potwierdzenia, nie do zmiany bez pytania)* - `AmbientPlayer.tsx:15` ma
   hardkodowane `bg-black`/`border-black` zamiast tokenów motywu. Wygląda na celową
   "Winampową" stylistykę kontrastującą z resztą UI, nie na przeoczenie - zostawione jako
   świadomy wyjątek, warto tylko potwierdzić że tak ma zostać.

---

## Część 2: QoL / tarcie w codziennym workflow

### Warte zrobienia szybko

1. **Scalenie ustawień w jedno miejsce** - patrz Część 1, pkt 1. Rekomendacja: rozszerzyć
   `ToolsMenu.tsx` o pełną sekcję "Aplikacja" (dziś ma tylko "Pamięć i dane") zamiast budować
   zupełnie nowy ekran. Złożoność: **średnia**.

2. **`AddFindingForm.tsx`: `autoFocus` na pierwszym polu (Select gatunku)**. Dziś drawer otwiera
   się i wymaga dodatkowego tapnięcia zanim można zacząć wybierać - drobna, ale realna strata
   czasu przy każdym pojedynczym dodaniu w terenie. Złożoność: **bardzo mała**.

3. **Zapamiętanie ostatnio wybranego gatunku jako domyślnego** w `AddFindingForm.tsx` (dziś
   zawsze startuje od "-- nieokreślony --", linia ~30/145). Przy zbieraniu jednego gatunku seriami
   (typowy scenariusz - "dużo borowików dziś") to zbędne powtórzenie kroku za każdym razem.
   Złożoność: **mała**.

4. **Miękkie ostrzeżenie przed przypadkowym duplikatem** w `AddFindingForm.tsx` - dziś ochrona
   przed duplikatem działa TYLKO przy imporcie pliku (`countLikelyDuplicates` w
   `utils/exportImport.ts`), nie przy ręcznym dodawaniu. Podwójny tap "Zapisz" w terenie (słaby
   sygnał dotykowy w rękawiczkach, patrz forest-mode) zapisuje to samo znalezisko dwa razy bez
   żadnego ostrzeżenia. Złożoność: **mała** (debounce/warning po `speciesId`+`spotId`+oknie
   czasowym, wzorem istniejącej logiki importu).

### Większe, do przemyślenia

5. **Scalanie dwóch grzybowisk (`Spot`)**, które okazały się tym samym miejscem -
   `SpotManager.tsx` ma dziś tylko dodaj/usuń/edytuj, brak merge. Wymaga przepięcia
   `finding.spotId` na docelowy spot + usunięcia duplikatu. Złożoność: **średnia**.

6. **Filtr/sortowanie po zakresie dat w Dzienniku** - wyszukiwanie tekstowe i filtr wg wyprawy już
   istnieją (`JournalView.tsx:147-154`, `TripsHistory`), ale brak sortowania innego niż
   chronologiczne malejąco i brak filtra "od-do" po dacie. Wartość średnia - tekst-search już
   pokrywa najczęstszy przypadek. Złożoność: **mała**.

7. **Centralny panel powiadomień** - backup reminder, overdue trip, storm warning, revisit spot
   to dziś osobne bannery/`Alert`e bez wspólnej historii ("co przegapiłem, gdy apka była
   zamknięta"). Głównie porządkowe, nie krytyczne. Złożoność: **średnia**.

---

## Część 3: Brakujące funkcje / treść

### Warte zrobienia szybko (małe, zero/mało nowych zależności)

1. **Porównywarka gatunków jako samodzielny tryb w Atlasie**. `SpeciesComparator.tsx` już
   istnieje, ale jest używany WYŁĄCZNIE wewnątrz `LookalikesWarning.tsx` (automatyczne pary z
   `lookalikes`). Dodanie trybu "wybierz dowolne 2 gatunki i porównaj" w `EncyclopediaView.tsx`
   to tania rozbudowa istniejącego komponentu, nie nowa funkcja od zera. Złożoność: **mała**.

2. **Przycisk "Otwórz w Mapach/OsmAnd" przy zapisanym grzybowisku** - link `geo:`/Google Maps z
   samych współrzędnych, dziś taki link istnieje TYLKO wewnątrz treści SMS-a ratunkowego
   (`locationSms.ts`). Zero zależności. Złożoność: **mała**.

3. **Eksport `.ics` dla przypomnienia o rewizycie spotu** - `Spot.revisitMonth` już istnieje jako
   dane źródłowe, dziś skutkuje tylko lokalną notyfikacją. Wpis do kalendarza telefonu (prosty
   string `.ics` + `navigator.share`/download) przetrwa dłużej niż lokalna notyfikacja i działa
   nawet gdy apka nie była otwierana. Złożoność: **mała**, zero zależności.

4. **Testy dla nieotestowanych plików z realną logiką warunkową**: `TripManager.tsx` (zero
   pokrycia - w tym świeżo dodana w tej sesji logika `wasRainy`/fetch pogody przy końcu wyprawy),
   `useOverdueTripReminder.ts`, `useStormWarning.ts` (oba mają realne warunki wyzwalania lokalnych
   powiadomień). Priorytet wyższy niż zwykle - cicha regresja tu nie daje żadnego sygnału
   błędu użytkownikowi w terenie. Złożoność: **mała-średnia**.

5. **Wykres "najlepsze miejscówki"** w statystykach Dziennika - dane już policzone
   (`spotStats.ts`/`spotRanking.ts`), dziś tylko liczbowo, bez wizualizacji (recharts już jest
   zależnością). Złożoność: **mała**.

### Większe, do przemyślenia

6. **Rozszerzenie atlasu gatunków** (dziś 19 gatunków w `species.json`, typowy kieszonkowy atlas
   PL to 50-100+). To nakład **redakcyjny** (opisy, zdjęcia, weryfikacja merytoryczna), nie
   programistyczny - kod obsłuży dowolną liczbę wpisów bez zmian. Podobnie pole "drzewa
   mikoryzowe" (potwierdzone: nie istnieje w schemacie) - jedno opcjonalne pole + wyświetlenie,
   ale wymaga researchu treści per gatunek.

7. **Trend rok-do-roku i wizualny kalendarz sezonowy per gatunek** w statystykach/Atlasie - dane
   w większości już są (`createdAt` per finding, `season` per gatunek), brakuje tylko
   wizualizacji. Złożoność: **mała-średnia**.

8. **PWA `share_target`** - odbieranie zdjęcia grzyba wprost z aparatu/galerii telefonu do "Dodaj
   znalezisko" bez przełączania się między apkami. Wymaga rozszerzenia `vite.config.ts` (manifest
   ma dziś tylko `shortcuts`) i obsługi odbioru w Service Workerze. Złożoność: **średnia**,
   wsparcie ograniczone na iOS Safari (Android Chrome OK) - realna wartość zależy od telefonu.
   Badging API (licznik na ikonie) ma podobne ograniczenie iOS - **niski priorytet**.

---

## Sugerowany punkt startowy (subiektywna ocena)

Najwyższy stosunek wartość/koszt, w kolejności:

1. **Scalenie ustawień** (Część 1 pkt 1 / Część 2 pkt 1) - wyszło niezależnie z dwóch różnych
   audytów, silny sygnał że to realne tarcie, nie kosmetyka.
2. **Trzy drobne poprawki `AddFindingForm.tsx`** (Część 2, pkt 2-4: autoFocus, zapamiętany
   gatunek, ostrzeżenie o duplikacie) - każda z osobna to kilkanaście linii kodu, razem realnie
   przyspieszają najczęstszą czynność w apce.
3. **Testy `TripManager`/`useOverdueTripReminder`/`useStormWarning`** (Część 3 pkt 4) - zamyka
   ryzyko cichej regresji w kodzie bezpieczeństwa (ostrzeżenia o sztormie, przeciągającej się
   wyprawie), w tym w kodzie dopiero co dodanym w tej sesji.
4. Z reszty: **porównywarka gatunków jako samodzielny tryb** i **link do Map + `.ics` rewizyty**
   (Część 3, pkt 1-3) to tanie, samodzielne dodatki bez zależności między sobą - można wybierać
   pojedynczo wedle nastroju.

Rozszerzenie atlasu (Część 3 pkt 6) jest największą potencjalną wartością dla użytkownika końcowego,
ale to praca redakcyjna rozłożona w czasie, nie jednorazowa sesja kodowania - warto zacząć
niezależnie od reszty, po trochu, gdy jest ochota na pisanie treści zamiast kodu.
