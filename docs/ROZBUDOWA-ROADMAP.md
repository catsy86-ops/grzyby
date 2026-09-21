# Plan rozbudowy 2026-09-21: nowe funkcje, UI, responsywność, logika - propozycje do wyboru

Wygenerowane 2026-09-21 przez cztery równoległe forki (nowe funkcje, audyt wizualny UI, audyt
responsywności, audyt logiki/architektury/edge case'ów), na bazie świeżego czytania kodu PO
zamknięciu `MAP-ROADMAP.md`, `UI-QOL-ROADMAP.md`, `nowe.md` i share_target (Fazy 25-27,
`docs/ROADMAP.md`). Apka jest w bardzo dojrzałym stanie - to jest kolejna, głębsza warstwa
propozycji, nie powtórka poprzednich list.

**To jest materiał do przejrzenia i wyboru - nic z tego nie zostało zaimplementowane.** Konta+sync
i tryb rodzinny pozostają świadomie odłożone (wymagają backendu, decyzja użytkownika sprzed kilku
sesji, nie podnosić bez jego inicjatywy).

---

## Część 1: Realne bugi i drobne naprawy (warte zrobienia niezależnie od reszty planu)

1. ✅ **Mapa po cichu przeskakuje na pozycję GPS, gdy power-save włączy się automatycznie
   w trakcie wyprawy.** `useMapGeolocation.ts:42-43` trzyma `hasCenteredOnFirstFix` jako zwykłą
   zmienną w domknięciu efektu zależnego od `[powerSave]` (linia 96). Gdy bateria spadnie poniżej
   20% i `powerSaveMode: 'auto'` włączy oszczędzanie w połowie wyprawy, efekt się remontuje,
   flaga resetuje się do `false`, a pierwszy kolejny odczyt GPS wywoła `setRecenterTarget`,
   przesuwając mapę z powrotem na pozycję użytkownika - nawet jeśli ten właśnie ręcznie przesunął
   widok, żeby zobaczyć teren przed sobą. Fix: `useRef` zamiast lokalnej zmiennej, poza
   zależnością od `powerSave`. Złożoność: **niska**. Bezpieczeństwo: nie.

2. ✅ **`.forest-mode` powiększa cele dotyku tylko w pionie, nie w poziomie.**
   `index.css:413-415` ustawia `min-height: 2.75rem` na `button`/`a[role=button]`, bez
   odpowiadającego `min-width`. Warianty ikonowe (`button.tsx:27-32`: `icon-sm`=28px,
   `icon`=32px, `icon-lg`=36px) są kwadratowe przez `size-*`, więc w trybie "W lesie" (rękawiczki,
   zimne ręce - deklarowany cel tej funkcji) przyciski typu Udostępnij/Edytuj/Usuń na każdej karcie
   w Dzienniku robią się wyższe, ale zostają wąskie - odwrotnie niż potrzeba. Fix: dodać
   `min-width` analogiczny do `min-height`. Złożoność: **niska**. Bezpieczeństwo: nie.

3. ✅ **Pola formularzy (`Input`/`Select`) nie są objęte `.forest-mode` w ogóle**, nawet z włączonym
   trybem terenowym. Reguła celuje w `button`/`a[role=button]` (`index.css:413`) - zwykłe
   `&lt;input&gt;` (waga, liczba sztuk w `AddFindingForm.tsx`/`FindingEditForm.tsx`) mają
   `h-8`/`h-7` (`input.tsx:11`, `select.tsx:41`) niezależnie od trybu. Warto rozszerzyć regułę
   forest-mode o `input`/`[data-slot=select-trigger]`. Złożoność: **niska**. Bezpieczeństwo: nie.

4. **Domyślne (bez forest-mode) cele dotyku poniżej rekomendowanych 44px** - `icon-sm`/`icon`
   to 28-32px. Forest-mode istnieje właśnie po to, ale jest **opt-in**, więc typowy użytkownik,
   który nigdy nie włączył trybu terenowego, ma sub-44px cele przez cały czas, nie tylko w lesie.
   Do rozważenia: podniesienie domyślnego minimum choćby do `icon` (32px→36px) bez czekania na
   forest-mode, albo pozostawienie jak jest (celowy kompromis gęstości UI vs. łatwości dotyku -
   **do decyzji, nie oczywisty fix**). Złożoność: **niska-średnia**. Bezpieczeństwo: nie.
   **Decyzja (2026-09-21): zostawić jak jest** - forest-mode zostaje jedynym sposobem powiększenia.

5. ✅ **`FindingsListView.tsx` i `SpotManager.tsx` mają gorsze puste stany niż reszta apki.**
   `FindingsListView.tsx:46,68` i `SpotManager.tsx:483` pokazują goły
   `&lt;p&gt;Brak zapisanych...&lt;/p&gt;` bez ilustracji/centrowania, podczas gdy
   `JournalView.tsx`/`EncyclopediaView.tsx` mają ustalony wzorzec (ikona + wyśrodkowany tekst +
   fade-in, patrz `EmptyBasketIllustration`). Karty w `FindingsListView.tsx` też nie mają
   `whileTap`/stagger, które ma ich odpowiednik `FindingCard.tsx`. Złożoność: **niska**.
   Bezpieczeństwo: nie.

6. ✅ **`CookingTimer.tsx` nie ma wizualnego paska/pierścienia postępu** - trwający odliczanie
   pokazuje wyłącznie jako statyczną liczbę (`formatCountdown`), mimo że `components/ui/progress.tsx`
   już istnieje i jest używany gdzie indziej (`OfflineAreaDownload.tsx`, `StorageInfoDrawer.tsx`).
   Narzędzie z założenia używane "na oko" przy kuchence zasługuje na progres wizualny, nie tylko
   cyfry. Złożoność: **niska**. Bezpieczeństwo: nie.

7. ✅ **Klucze `localStorage` per-wyprawa nigdy nie są czyszczone.** `useStormWarning.ts:8`,
   `useOverdueTripReminder.ts:6`, `useTickReminders.ts:8-9` piszą `*-notified-&lt;tripId&gt;` bez
   pruningu - przy wieloletnim użytkowaniu rośnie nieograniczenie (choć to małe stringi, niska
   dotkliwość). Warto dorzucić prune przy eksporcie/imporcie lub periodyczne czyszczenie kluczy
   dla nieistniejących już `tripId`. Złożoność: **niska**. Bezpieczeństwo: nie.

8. **Wymuszony `orientation: 'portrait'` w manifeście PWA** (`vite.config.ts:55`) - na
   zainstalowanej apce (Android/Chrome honoruje ten lock w standalone) użytkownik fizycznie nie
   może obrócić telefonu, nawet trzymając go w uchwycie samochodowym czy chcąc zobaczyć szerszy
   fragment mapy. Kod `MapView.tsx` nie zakłada nigdzie portrait-only w layoucie - to czysto
   manifestowe ograniczenie, nie techniczny wymóg. **Do decyzji** - może być celowe (spójność UX),
   może być niepotrzebnym ograniczeniem. Złożoność: **niska** (jedna linia), ale wymaga wyboru.
   **Decyzja (2026-09-21): zostawić blokadę** - portrait-only pozostaje wymuszony dla spójności UX.

*(Drobiazg do samodzielnej weryfikacji wizualnej, nie do zmiany kodu: nowe, dłuższe nazwy gatunków
dodane w tej sesji - "Pieczarka karbolowa (żółciejąca)", "Muchomor jadowity (Zniszczyciel)" - nie
były jeszcze widziane w 2-kolumnowej siatce Atlasu na wąskim ekranie 320-375px. Mechanizm zawijania
`flex-wrap` powinien sobie poradzić - tak jak potwierdzono to wcześniej dla oryginalnych 19
gatunków - ale warto rzucić okiem przy najbliższej okazji z podłączonym Chrome.)*

---

## Część 2: Nowe funkcje - szybkie, bez ryzyka bezpieczeństwa

Wszystkie poniższe są realistyczne bez backendu (apka zostaje 100% offline) i nie dotykają treści
o jadalności/identyfikacji.

1. ✅ **Wilgotność/temperatura gleby zamiast samych opadów w mushroom outlook.**
   `mushroomWeather.ts` liczy dziś tylko `precipitation_sum`/`temperature_2m_mean` z Open-Meteo.
   API ma też `soil_moisture_0_to_1cm`/`soil_temperature_0cm` (hourly) - dokładniejszy sygnał
   wysypu grzybów niż suma deszczu. Złożoność: **niska**.

2. ✅ **Prognoza "kiedy iść" na kilka najbliższych dni, nie tylko dziś.** Kod już woła
   `forecast_days=1` - wystarczy podbić parametr i pokazać mini-listę dni z oceną
   dobrze/średnio/słabo. Złożoność: **niska**.

3. ✅ **Lista "do uzupełnienia" w Dzienniku** - znaleziska bez przypisanego gatunku lub bez zdjęcia
   (częste przy szybkim dyktowaniu głosowym w terenie), z linkiem prosto do edycji. Złożoność:
   **niska**.

4. ✅ **"Ile dni od ostatniego wyjścia"** w Dzienniku, na bazie już zbieranych `Trip` - motywacyjny
   licznik, zero nowej treści merytorycznej. Złożoność: **niska**.

5. ✅ **"Za X dni zaczyna się sezon na [gatunek]"** skrót na start Atlasu/Dziennika, na bazie już
   istniejących pól `season`/logiki `SeasonCalendarStrip`. Złożoność: **niska**.

6. ✅ **Własna statystyka "warunki Twoich udanych wypraw"** - `Trip.wasRainy` jest już zbierane
   (Faza 20); agregacja typu "70% Twoich najlepszych zbiorów było w ciągu 3 dni po deszczu" w
   `SeasonSummary.tsx`. Czysto własne dane użytkownika, zero nowych twierdzeń mykologicznych.
   Złożoność: **średnia**.

---

## Część 3: Nowe funkcje - średnia złożoność, wciąż bez ryzyka bezpieczeństwa

7. ✅ **Filtr atlasu po siedlisku** (iglaste/liściaste/łąka) jako chipy obok istniejącego filtra
   jadalności/sezonu/ochrony w `EncyclopediaView.tsx`. `Species.habitat` to dziś wolny tekst -
   wymaga tylko otagowania istniejących opisów słowami kluczowymi, żadnej nowej treści o
   jadalności. Złożoność: **niska-średnia**.

8. ✅ **Eksport pojedynczego gatunku jako "karta kieszonkowa" PDF** (cechy + lookalikes + zdjęcia,
   do wydruku i zabrania offline bez telefonu) - rozszerzenie istniejącego `pdfExport.ts`.
   Drukuje wyłącznie już zweryfikowaną treść atlasu, nie generuje nowej. Złożoność:
   **niska-średnia**.

9. ✅ **Rozszerzenie natywnego widgetu Androida o dzisiejszy mushroom outlook**, nie tylko
   statystyki wyprawy - `androidWidgetBridge.ts`/`WidgetStats` już istnieje i przesyła dane do
   widgetu, to dodatek do już istniejącego mostu, nie nowa architektura. Złożoność:
   **niska-średnia**.

10. ✅ **Checklist bezpieczeństwa przed potwierdzeniem "zjedzone"** - gdy oznaczasz `consumed=true`
    na znalezisku z gatunkiem mającym niepustą listę `lookalikes`, krótkie przypomnienie ("sprawdziłeś
    charakterystyczne cechy odróżniające od sobowtórów?") zanim potwierdzisz. Reużywa istniejące
    dane `lookalikes`, nie dodaje nowej treści merytorycznej - działa w kierunku WIĘKSZEJ
    ostrożności, nie mniejszej. Złożoność: **niska-średnia**. Dotyczy bezpieczeństwa: tak (ale
    jako dodatkowe zabezpieczenie, nie nowa ocena jadalności).

---

## Poza tym planem, celowo pominięte

- Konto + synchronizacja i zależny od niego tryb rodzinny - świadomie odłożone przez użytkownika,
  wymaga backendu, nie podnosić bez jego inicjatywy.
- Jakiekolwiek nowe twierdzenia o jadalności/identyfikacji gatunków bez udziału i weryfikacji
  użytkownika - zasada ustalona w Fazie 25/26 `docs/ROADMAP.md`.
- Audyt logiki/architektury (osobny fork) nie znalazł poważniejszych problemów poza pkt 1 i 7 w
  Części 1 wyżej - kod jest solidny: konsekwentne `cancelled`-flagi w async-`useEffect`,
  poprawne `db.transaction` przy każdej operacji łączonej, poprawny cleanup listenerów, brak
  realnych wyścieków pamięci czy brakujących `useMemo` przy dużych tablicach.
- Dark mode i hardkodowane kolory - audyt wizualny potwierdził: czyste, żadnych działań
  potrzebnych (wcześniejsze sesje polerowania faktycznie zamknęły tę kategorię).
- `safe-area-inset` - potwierdzone kompletne pokrycie (header, bottom nav; FAB nie potrzebuje,
  bo siedzi nad już odsuniętym obszarem).
