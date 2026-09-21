# Audyt Dziennika 2026-09-21: architektura/clean code, wydajność, biblioteki/a11y

Wygenerowane przez trzy równoległe agenty (`architect`, `performance-engineer`, `frontend-expert`)
czytające świeżo `src/features/journal/` i powiązane utils/hooki - analogicznie do
`docs/MAP-AUDIT-ROADMAP.md` (ten sam dzień, inny feature). To audyt jakości istniejącego kodu, nie
lista nowych funkcji.

**Nic z tego nie jest jeszcze zaimplementowane w chwili pisania tego dokumentu.**

---

## Tier 0: wymaga decyzji przed realizacją (dwa audyty zbiegły się na tym samym miejscu)

**Stan formularza edycji znaleziska - 11 `useState` w `JournalView.tsx:113-124`, przekazywane jako
22 propsy do `FindingEditForm.tsx`.** To świadoma decyzja z Fazy 27 (`docs/ROADMAP.md`) - komentarz
w `FindingEditForm.tsx:11-14` mówi wprost: "Cały stan formularza edycji zostaje w JournalView jako
źródło prawdy - ten komponent jest czystą prezentacją". Dwa niezależne audyty dotarły tu z różnych
kierunków:

- **Audyt architektury**: 11 osobnych `useState` to realny DRY-problem - `handleStartEdit` (10
  setterów naraz), `handleSaveEdit` (czyta 7 pól z domknięcia) i JSX (22 propsy) osobno "znają" ten
  sam zestaw pól. Dodanie nowego pola wymaga pamiętać o 4 miejscach. Rekomendacja: scalić w jeden
  `useState<EditFormState>`/`useReducer`, **bez cofania architektury** (stan zostaje w JournalView).
- **Audyt wydajności**: to samo umiejscowienie stanu (w `JournalView`, komponencie renderującym też
  całą listę do 100 kart `FindingCard`) powoduje, że **każde naciśnięcie klawisza w polu notatek
  podczas edycji re-renderuje całą listę znalezisk**, nie tylko edytowaną kartę - `FindingCard` nie
  jest w `React.memo`, a nawet gdyby był, `onShare`/`onEdit` to nowe referencje funkcji przy każdym
  renderze rodzica, więc memo i tak by nic nie ucięło. Przy stronie 100 wpisów to realny, odczuwalny
  lag przy pisaniu na słabszym telefonie. Rekomendacja: przenieść stan pól formularza (przynajmniej
  tekstowe/liczbowe - notatki/waga/waga sucha/ilość) **do samego `FindingEditForm.tsx`** jako lokalny
  stan inicjalizowany z `finding` przy montowaniu, z `onSave(id, values)` liftującym wynik do
  rodzica dopiero przy faktycznym zapisie (nie przy każdym keystroke).

**To są dwa różne rozwiązania tego samego problemu, nie dwa osobne problemy.** Rozwiązanie
proponowane przez audyt wydajności (przeniesienie stanu do `FindingEditForm`) naprawia OBA
problemy naraz - DRY (jeden komponent, jeden stan, żadnych 22 propsów value+onChange) i wydajność
(pisanie nie dotyka `JournalView`, więc nie re-renderuje listy) - kosztem częściowego odejścia od
"czysto prezentacyjnego" komponentu z Fazy 27 (staje się niekontrolowanym formularzem z własnym
stanem, liftowanym tylko przy Zapisz/Anuluj - to normalny, częsty wzorzec React dla formularzy
edycji, nie architektura gorsza od obecnej). Rekomendacja tego dokumentu: **iść w stronę
przeniesienia stanu do `FindingEditForm`**, bo rozwiązuje realny, zmierzony problem UX (nie tylko
kosmetykę), a scalenie 11 `useState` w jeden obiekt w samym `JournalView` (bez przenoszenia) naprawi
DRY, ale zostawi re-render-całej-listy-przy-pisaniu nietknięty. Złożoność: **średnia-wysoka** -
dotyka JournalView + FindingEditForm, wymaga uważnego retestu edycji/zapisu/anulowania/zdjęcia
(`editPhoto`/`editRemovePhoto` reset przy starcie edycji, GPS-owe `editLatitude`/`editLongitude`
ustawiane z zewnątrz przez `handleUseCurrentLocation` - też musiałyby przenieść się do dziecka albo
zostać jako wyjątek). **Wymaga Twojej decyzji przed realizacją** - to nie jest bezpieczna,
mechaniczna ekstrakcja jak reszta Tier 1 niżej.

---

## Tier 1: realne problemy/luki, niska złożoność - bezpieczne do zrobienia od razu

1. **Duplikacja wzorca nazwy pliku eksportu (3×).** `JournalView.tsx:233,239,245` -
   `handleExportPdf`/`handleExportGpx`/`handleExportCsv` powtarzają identyczny trójwiersz budowy
   nazwy pliku (`selectedTrip.name.replace(/\s+/g, '-').toLowerCase()` + data ISO). Wydzielić
   `buildExportFilename(baseName, ext)` do `utils/exportImport.ts` lub nowego małego pliku.
   Złożoność: **niska**.

2. **Ciche zapisywanie `NaN`/wartości ujemnych przy błędnym wpisaniu wagi/liczby sztuk.**
   `JournalView.tsx:354-356` - `Number(editWeightGrams)` bez walidacji. Wklejenie/autouzupełnienie
   tekstu (np. "12,5" z przecinkiem zamiast kropki - częste w polskiej lokalizacji) daje `NaN`
   zapisywane wprost do Dexie, karta potem pokazuje "NaNg". `min={0}` w `FindingEditForm.tsx` jest
   czysto kosmetyczny (nie ma natywnego `<form>`/submit, więc HTML5 walidacja nie blokuje). Fix:
   `Number.isFinite` guard przed zapisem + toast błędu przy niepoprawnej wartości. Złożoność:
   **niska**.

3. **Ręczny type-narrowing `QuotaExceededError` zamiast `instanceof DOMException`.**
   `JournalView.tsx:369` - `err != null && typeof err === 'object' && 'name' in err` przepuszcza
   dowolny obiekt z polem `name`, nie tylko realny `DOMException`. `QuotaExceededError` rzucany
   przez IndexedDB/Dexie JEST `DOMException` - `err instanceof DOMException && err.name ===
   'QuotaExceededError'` jest węższe i poprawniejsze. Złożoność: **niska**.

4. **`AchievementsDrawer` subskrybuje pełną tabelę `findings`/`trips` zawsze, nawet gdy zamknięty.**
   `AchievementsDrawer.tsx:56-60` jest zamontowany na stałe w `JournalView.tsx:740`, jego
   `useLiveQuery` (w tym pełne `db.findings.toArray()`) działa niezależnie od `open`. Przy tej skali
   koszt jest znikomy (submilisekundowy), ale to zbędna praca/subskrypcja bez korzyści. Fix:
   `useLiveQuery(() => open ? db.findings.toArray() : undefined, [open])`. Złożoność: **niska**.

5. **`recharts` (wykresy Dziennika) ładowany eagerly, statycznym importem, zawsze - nawet dla
   użytkownika z 0-2 znaleziskami, gdzie wykresy i tak się nie pokażą.** `JournalBarChart.tsx:1` +
   `JournalView.tsx:70` - blokuje pierwsze wyrenderowanie listy znalezisk (główna treść widoku) do
   czasu sparsowania/wykonania biblioteki wykresów. `jspdf` w porównaniu jest już poprawnie
   `await import()`-owany wewnątrz `exportFindingsToPdf` - ten sam wzorzec dla `JournalBarChart`:
   `React.lazy` + `Suspense fallback={null}`. Złożoność: **niska-średnia**.

6. **Brak testu ścieżki `QuotaExceededError` i błędnego pliku importu.** `JournalView.tsx:369-374`
   ma dedykowaną logikę rozgałęzienia komunikatu błędu, ale `JournalView.test.tsx` jej nie testuje
   - jedyne miejsce z nietrywialną logiką błędu zapisu bez pokrycia. Złożoność: **niska**.

7. **Luka w testach `TripManager.tsx`/`TripManager.test.tsx` (222 vs 92 linie).** Brak testu na
   "Wyślij SMS z lokalizacją" (`handleSendLocationSms`, `TripManager.tsx:113-124`, w tym ścieżkę
   błędu `getCurrentPosition` reject) i na dedupe powiadomienia o długiej wyprawie
   (`LONG_TRIP_NOTIFIED_KEY`, `useEffect` z `setInterval`, `:58-77`) - dwie nietrywialne logiki
   biznesowe bez pokrycia. Złożoność: **niska-średnia**.

8. **`ConsumptionTracker.tsx:23` - `reactionNotes` inicjalizowany raz z propsa, bez resynchronizacji
   przy zmianie `finding` z zewnątrz.** Niskie realne ryzyko (pole zapisuje się na `onBlur`, a
   `unmarkConsumed` przełącza cały branch JSX karty), ale tania do domknięcia teraz skoro dotyka się
   tego samego pliku. Złożoność: **niska**, opcjonalne.

---

## Sprawdzone i potwierdzone jako OK (nie zmieniać)

- **Paginacja `PAGE_SIZE = 100`** i **dwa celowo pełno-tabelowe zapytania**
  (`severeReactionCandidates`, `consumedFindings` - alert bezpieczeństwa, musi widzieć całą
  historię) - potwierdzone jako świadome, udokumentowane decyzje. Nie dotykać.
- **Wirtualizacja list (TanStack Virtual)** - już wcześniej odrzucona w `docs/ROADMAP.md` Faza 27
  jako niepotrzebna (paginacja już rozwiązuje problem). Nie proponować ponownie.
- **Granice modułów** `JournalView`/`FindingCard`/`FindingEditForm`/`TripManager`/`TripsHistory`/
  `SeasonSummary`/`AchievementsDrawer`/`ConsumptionTracker` - spójne, jednoznaczne odpowiedzialności,
  brak przecieku logiki między nimi.
- **`exportImport.ts`/`pdfExport.ts`/`gpxExport.ts`/`csvExport.ts`** - każdy format ma realnie inną
  strukturę wyjścia, świadomie NIE rekomendowana dalsza konsolidacja poza nazwą pliku (pkt 1).
- **`jspdf`** - już poprawnie code-splitowany (`await import('jspdf')` wewnątrz funkcji eksportu).
- **`FindingThumbnail.tsx`** - `createObjectURL`/`revokeObjectURL` poprawnie sparowane w cleanup,
  per-karta niezależnie, brak wycieku pamięci przy przewijaniu.
- **Dwie biblioteki animacji (`motion/react` + `@formkit/auto-animate`)** - uzasadniony, świadomy
  podział (auto-animate = reflow pozycji przy insert/remove/reorder listy, motion = mikrointerakcje
  pojedynczych elementów). Nie duplikacja, nie zmieniać.
- **`useActionState`/`useFormStatus` (React 19) dla formularza edycji** - oceniona i odrzucona:
  zapis jest czysto lokalny (transakcja Dexie), stan musi współistnieć z polami spoza `<form>`
  (GPS, plik zdjęcia) - `useActionState` dodałby narzut konceptualny bez korzyści przy braku
  progresywnego wzbogacania/serwera.
- **Łańcuch `useMemo`** (`filteredFindings` → wykresy) - poprawne, wąskie zależności; zmiana pól
  formularza edycji NIE jest w żadnej z tablic zależności, więc wykresy nie przeliczają się przy
  pisaniu (problem Tier 0 dotyczy re-renderu drzewa kart, nie przeliczania wykresów).
- **8 niezależnych `useLiveQuery`** w drzewie Dziennika - zakresy sensowne i wąskie, brak
  nadmiarowych refetchy poza pkt 4.
- **`AlertDialog`/`Dialog`/`Drawer`** (potwierdzenia usunięcia/importu/checklist sobowtórów) -
  focus trap i zwrot fokusu obsługiwane centralnie przez wspólne prymitywy base-ui.
- **jsPDF v4 / recharts v3 API** - zgodne z aktualną wersją w `package.json`, brak przestarzałych
  wywołań.

---

## Rekomendowana kolejność realizacji

Tier 1 (pkt 1-8) to niskie ryzyko, bezpieczne do zrobienia razem w jednej sesji - żadne nie dotyka
architektury formularza edycji. Tier 0 (stan formularza edycji) wymaga jawnej decyzji przed
ruszeniem - to jedyny punkt w tym audycie, który częściowo odchodzi od wcześniej ustalonej
architektury (Faza 27), więc nie realizować bez potwierdzenia kierunku.
