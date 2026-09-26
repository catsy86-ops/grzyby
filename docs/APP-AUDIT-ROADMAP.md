# Audyt całej aplikacji - plan (2026-09-26)

Cztery równoległe agenty, cztery soczewki, zakres = **cała apka**, nie pojedynczy feature (audyty
per-katalog są zamknięte, patrz osiem pozostałych `*-AUDIT-ROADMAP.md`):

1. architektura / clean code, 2. wydajność, 3. UX i brakujące funkcje,
4. **dostępność (a11y) + poprawność PWA/offline** - soczewka, której w tym projekcie nie było ani razu.

Każdy agent dostał zamknięte roadmapy do przeczytania, żeby nie zgłaszać rzeczy już zrobionych
albo świadomie odrzuconych (wirtualizacja list, konta+sync, `INTERNET` w Androidzie).

---

## Sprostowanie do dokumentacji (ważne przy czytaniu starszych fazy)

Dwie niezależne soczewki poprawiły założenie, które nadal powtarza `docs/ROADMAP.md` Faza 25:
**PWA nie działa już w trybie `generateSW`**. `vite.config.ts:40` to `strategies: 'injectManifest'`
z własnym `src/sw.ts` (migracja w Fazie 27). Komentarz w `vite.config.ts:36-39` odwołuje się do
bloku `workbox: { runtimeCaching }`, którego w tym pliku **nie ma**. To nie jest kosmetyka: cała
argumentacja, dlaczego `share_target` był niemożliwy, opierała się na `generateSW`.

---

## ZROBIONE w tej sesji

**Trwałość danych - kopia zapasowa (commit `6896351`).** Zgłoszone niezależnie przez trzy
soczewki jako Tier 0 i zweryfikowane w kodzie. Eksport JSON nie obejmował `spots` ani
`tripTrailPoints`, gubił wszystkie zdjęcia znaleziska poza ostatnim, a `Finding.spotId` przechodził
przy imporcie bez remapowania, po cichu przypinając znaleziska do cudzych grzybowisk. Format
podbity do v3 (pliki v2 nadal się importują), `handleExport` w dwóch miejscach dostał obsługę
błędu, testy przepięte z martwego wrappera `importData` na realną ścieżkę UI.

---

## Tier 0 - wymaga decyzji użytkownika przed realizacją

### 0.1. Mechanizm aktualizacji Service Workera nie działa (a11y/PWA)

Zweryfikowane w kodzie: `src/sw.ts` nie zawiera `self.skipWaiting()` ani `clientsClaim()`, a
`registerType: 'autoUpdate'` + `injectRegister: false` w trybie `injectManifest` niczego takiego
nie wstrzykuje. `onNeedRefresh` w `registerServiceWorker.ts:16-18` nigdy się nie odpala (przy
`auto === true` vite-plugin-pwa go nie woła), a `updateSW(true)` jest tam no-opem.

Skutek: nowy Service Worker zostaje w stanie `waiting` **na zawsze** - zainstalowane PWA na
Androidzie realnie nigdy nie jest zamykane. Użytkownik siedzi na starym buildzie, a `lazyRetry`
przeładowuje kartę w ręce starego SW, więc produkcyjny bug, który ten plik miał naprawić
("error loading dynamically imported module"), **nie jest naprawiony**.

Decyzja: **A** - ciche auto-przeładowanie (`skipWaiting` + `clientsClaim`), ryzyko utraty
wypełnionego formularza znaleziska w lesie; **B** - `registerType: 'prompt'` + toast "Nowa wersja,
odśwież" (infrastruktura toastów już jest). Rekomendacja agenta i moja: **B**.
Złożoność: **mała**. Weryfikacja wymaga realnego wdrożenia, nie vitest.

### 0.2. Około 2/3 kafli pobranych "na offline" nigdy nie jest użyte (a11y/PWA)

Zweryfikowane: `offlineMapTiles.ts:26` pobiera kafle z subdomeny na sztywno `'a'`, a
`MapView.tsx:233-239` renderuje `<TileLayer>` **bez propa `subdomains`**, więc Leaflet w runtime
prosi o `a.`/`b.`/`c.` wg `(x+y) % 3`. Kluczem w Cache Storage jest pełny URL z hostem, więc
trafienie jest tylko w ~1/3 przypadków. W lesie bez zasięgu daje to szachownicę pustych kwadratów
w obszarze, który użytkownik świadomie pobrał - i fałszywie uspokajający toast "Pobrano obszar
offline (3940 kafelków)".

Decyzja: **(a)** `subdomains="a"` na `TileLayer` - jedna linia, ale już pobrane kafle `b.`/`c.`
zostają balastem; **(b)** plugin `cacheKeyWillBeUsed` w `src/sw.ts` normalizujący host - naprawia
też **już pobrane** obszary. Rekomendacja: **(b)**. Złożoność: **mała** (a) / **średnia** (b).

### 0.3. Co ma trafiać do precache przy pierwszej instalacji (wydajność)

`vite.config.ts:43-46` obejmuje `bin` i `jpg` przy limicie 20 MB, więc pierwsza instalacja ściąga
cały model AI **i wszystkie zdjęcia gatunków** - także użytkownikowi, który nigdy nie otworzy
"Rozpoznaj". Koszt jest jednorazowy (kolejne aktualizacje są przyrostowe), ale rośnie razem z
atlasem. Decyzja: model w precache (gwarancja offline od pierwszego uruchomienia, ~10-15 MB przy
instalacji) czy `globIgnores` na `models/**` (pierwsze rozpoznanie wymaga wtedy zasięgu).

### 0.4. Czy backup ma działać przy naprawdę dużej bazie (wydajność)

`exportImport.ts` trzyma jednocześnie wszystkie bloby, wszystkie base64 i jeden pretty-printowany
string JSON. Szacunek: 200 zdjęć ≈ 80 MB blobów → ~107 MB base64 → +tyle samo stringa. To pierwsze
miejsce w apce, które **naprawdę pada** (OOM), i to podczas operacji "odzyskuję swoje dane".
Obniżenie szczytu pamięci bez zmiany formatu jest w Tier 1 (sekwencyjne kodowanie). Prawdziwe
rozwiązanie dla dużej bazy to zmiana formatu (ZIP/NDJSON z blobami osobno), co psuje zgodność z
plikami już wyeksportowanymi - stąd decyzja użytkownika.

### 0.5. Start/stop wyprawy tylko z Dziennika (UX)

`TripManager` jest renderowany wyłącznie w `JournalView.tsx:517`; na Mapie wyprawa jest tylko do
odczytu. Ścieżka na parkingu przed lasem: Dziennik → przewiń → "Rozpocznij wyprawę" → wróć na Mapę.
Konsekwencja zapomnienia jest **trwała**, bo formularz edycji znaleziska nie umie przypisać wyprawy
po fakcie (Tier 1). Decyzja: dodać start/stop do `MapHeaderActions` czy zrobić plakietkę aktywnej
wyprawy klikalną.

---

## Tier 1 - realne defekty, bezpieczne do zrobienia od razu

Pogrupowane w sesje tak, żeby zmiany w jednym szwie szły razem.

### Sesja A: powiadomienia, które faktycznie dochodzą

1. **Jednorazowe flagi wypalane, mimo że powiadomienie nigdy nie zostało pokazane.**
   `utils/notifications.ts:18` cicho wychodzi przy braku zgody, ale wszystkie cztery wywołania
   ustawiają znacznik "już powiadomiono" **przed** nim (`useTickReminders.ts:71-75`,
   `useStormWarning.ts:29-33`, `useOverdueTripReminder.ts:23-27`, `TripManager.tsx:63-68`).
   Użytkownik bez zgody traci te przypomnienia **na zawsze**, także po jej późniejszym włączeniu.
   Najgorszy przypadek: kontrola po kleszczach (rumień wędrujący). Fix: `showLocalNotification`
   zwraca `boolean`. Złożoność: **niska**.
2. **Stan "odmówiono powiadomień" nie jest nigdzie widoczny** (`NotificationPermissionBanner.tsx:16`
   zwraca `null` dla wszystkiego poza `'default'`), a ostrzeżenie o burzy nie ma kanału zapasowego,
   choć `useStormWarning.ts:26-33` ma prognozę już w ręku. Złożoność: **niska**.

### Sesja B: porządkowanie po powrocie z lasu

3. **Nie da się przypisać znaleziska do grzybowiska ani wyprawy po fakcie.**
   `FindingEditValues` (`FindingEditForm.tsx:16-27`) nie ma `spotId` ani `tripId`, mimo że
   `AddFindingForm` pozwala wybrać grzybowisko przy dodawaniu. `FindingCard` nigdy nie pokazuje
   nazwy grzybowiska. Złożoność: **niska-średnia**.
4. **Grzybowiska nie da się przemianować** - jedyne `db.spots.update` w `SpotManager.tsx:97,99`
   dotyczy wyłącznie flagi rewizyty. Literówka wbita w rękawiczkach jest nieodwracalna inaczej niż
   przez usunięcie. Złożoność: **niska**.
5. **"Zakończ wyprawę" bez potwierdzenia i bez odwrotu; wyprawy nie da się usunąć.**
   `TripsHistory` pokazuje "Wznów" tylko dla niezakończonych, a w całym `src/` nie ma
   `db.trips.delete`. Przypadkowa wyprawa zostaje na zawsze i zanieczyszcza statystyki i odznaki.
   Wzorzec odwracalności jest już w repo (`JournalView.tsx:271-292`). Złożoność: **niska**.

### Sesja C: formularz w terenie

6. **Lista gatunków nieposortowana** (`AddFindingForm.tsx:214-218`, `FindingEditForm.tsx:138-142`),
   choć dwa inne miejsca sortują ten sam zbiór przez `localeCompare(…, 'pl')`. Przy atlasie
   rosnącym do 45+ pozycji to realna strata czasu. Formularz nie pokazuje też jadalności ani
   ochrony wybranego gatunku, mimo że `EdibilityBadge` jest używany w 6 innych miejscach.
7. **Brak podglądu dodanego zdjęcia**, a kolejny wybór plików nadpisuje poprzednie - w tym zdjęcie
   z `share_target` (`AddFindingForm.tsx:256`). W terenie nie ma jak sprawdzić, czy kadr nie jest
   czarny. Wzorzec podglądu jest już w `IdentifyView.tsx:178-192`.
8. **Formularz nie ma własnego kontenera przewijania** wewnątrz przycinającego Drawera
   (`AddFindingForm.tsx:198` bez `overflow-y-auto`, `drawer.tsx:137` z `max-h`). W trybie "W lesie"
   (font 118%) przycisk "Zapisz" może być przycięty bez możliwości doscrollowania. **Zrobić jako
   pierwszy w tej sesji** - pkt 7 dodaje formularzowi wysokości.
9. **Zdjęcie z "Rozpoznaj" nie jedzie do znaleziska**, mimo że `AddFindingForm` ma gotowy prop
   `initialPhoto`. Użytkownik musi zrobić to samo zdjęcie drugi raz.
10. **Etykieta "Notatki" włącza mikrofon zamiast ustawić kursor w polu** (a11y). `<label>`
    (`AddFindingForm.tsx:324`) wiąże się z pierwszym etykietowalnym potomkiem, a jest nim przycisk
    dyktowania - `Textarea` zostaje bez dostępnej nazwy. Test `getByLabelText('Notatki')` pokazuje
    tę zamianę wzorowo, warto go napisać **przed** poprawką. Złożoność: **bardzo mała**.

### Sesja D: tick GPS (wszystko w jednym szwie `userPosition` → MapView)

11. **Licznik "do zmroku" zamarza, gdy GPS jest aktywny.** `useSunsetCountdown.ts:16-20` ma
    `deps: [position]`, a `position` to nowa tablica przy każdym ticku (~1/s), więc `setInterval`
    nigdy nie wystrzeli. Plakietka, która ma powiedzieć "zawracaj", pokazuje nieprawdę dokładnie
    w scenariuszu, w którym jest potrzebna. Złożoność: **niska**.
12. **Magnetometr chodzi cały czas na zakładce Mapa**, także przy zamkniętym kompasie -
    `MapView.tsx:468-478` renderuje `CompassPanel` bezwarunkowo, a `useDeviceHeading` nie ma flagi
    `enabled`. ~60 setState/s i wybudzony sensor fusion przez cały dzień w lesie.
13. **Cały ślad wyprawy przepisywany do Leafleta przy każdym ticku** - `useTripTrail.ts:81` tworzy
    nową tablicę w każdym renderze, a `Polyline` porównuje `positions` po referencji.
    4-godzinna wyprawa to 1000-2000 punktów reprojektowanych co sekundę.
14. **Lista znalezisk przelicza haversine przy każdym ticku** (`FindingsListView.tsx:26-33` bez
    `useMemo`) - przy 2000 znalezisk ~44 000 obliczeń na sekundę plus pełny re-render listy.
15. **Nakładka sezonowości liczy O(spoty × znaleziska) w ciele renderu** (`MapView.tsx:288-290`).

### Sesja E: Service Worker i offline (po decyzjach 0.1-0.3, nie mieszać z niczym innym)

16. **Skrót PWA "Dodaj znalezisko" i `share_target` nie działają offline** - `precacheAndRoute`
    bez `ignoreURLParametersMatching`, więc nawigacja na `/?open=add-finding` nie trafia w klucz
    precache'a. Przytrzymanie ikony apki w lesie → biały ekran "brak połączenia". Złożoność:
    **bardzo mała**.
17. **Runtime cache `ai-model` to martwy kod**, bo `precacheAndRoute` przechwytuje te same URL-e
    wcześniej. "Pamięć i dane" zawsze pokaże "0 plików" i oferuje czyszczenie operacji, która nie
    ma jak się wykonać.
18. **`navigator.storage.persist()` nie jest nigdzie wołane** - IndexedDB to jedyna kopia danych,
    a origin w trybie best-effort jest legalnym kandydatem do eksmisji przy presji na pamięć.

### Sesja F: a11y - semantyka i ogłoszenia

19. **`Alert` ma na sztywno `role="alert"`** (`alert.tsx:31`), a 15 z 23 użyć to treść statyczna -
    w tym `LookalikesWarning` renderowany **w pętli po gatunkach**. Wejście w Bazę wiedzy zalewa
    czytnik ekranu kanonadą asertywnych ostrzeżeń, przez co ostrzeżenia bezpieczeństwa przestają
    być rozróżnialne. **Robić osobno** - wymaga decyzji per 23 wywołania.
20. **Pięć `Select`ów bez dostępnej nazwy** - trigger to `<button>`, więc otaczający `<label>` mu
    nazwy nie nadaje. Czytnik mówi "-- nieokreślony --, przycisk" bez informacji, które to pole.
21. **`aria-label` na elementach, na których ARIA go zabrania** (`AnimatedHeaderTitle.tsx:37` na
    `motion.span`, liczniki wyników na `<p>`) - nazwa aplikacji w nagłówku **nie jest ogłaszana**.
    Zakładka Mapa (domyślna) nie ma żadnego nagłówka.
22. **`OnboardingOverlay` to blokujący overlay, który nie jest dialogiem** - brak
    `role="dialog"`, trapu focusa i obsługi Escape; reszta apki zostaje w kolejności tabulacji pod
    spodem. Wzorzec `ToolDialog.tsx:17-30` jest gotowy.
23. **`prefers-reduced-motion` pomija Dialogi i Drawery** - własny CSS gate'uje każdy keyframe, ale
    `tw-animate-css` i `transition … duration-450` na popupie Drawera nie. Arkusze to główny sposób
    interakcji w tej apce.
24. **Ręczny `role="radiogroup"` w `ToolsMenu.tsx:146`** deklaruje wzorzec, którego nie implementuje
    (strzałki nie działają). Obok w repo jest poprawny `ToggleGroup` i `DropdownMenuRadioGroup`.
25. **Dwie anglojęzyczne etykiety czytnika w polskim UI** - `dialog.tsx:75` ("Close", podczas gdy
    `drawer.tsx:173` ma "Zamknij") i domyślne "Notifications alt+T" w `Toaster`. `Progress` w 5
    miejscach bez `aria-label`. Złożoność: **bardzo mała**.

### Sesja G: porządki w kodzie (DRY, wzajemnie niezależne)

26. **`localStorage` czytany w renderze bez `try/catch`** w `useNotificationItems.ts:23` i
    `NotificationPermissionBanner.tsx:14` - w Safari z blokadą ciasteczek rzuca, więc efektem jest
    wywrotka **całej apki** do `ErrorBoundary`. Apka ma tę ochronę w 4 innych miejscach. Fix:
    `utils/safeStorage.ts`. Złożoność: **mała**.
27. **Ta sama awaria zapisu Dexie obsłużona na cztery sposoby**, w tym dwa z wzajemnie sprzecznymi
    komentarzami, a `ConsumptionTracker` (4 zapisy, w tym pole bezpieczeństwa) nie ma obsługi
    **żadnej** - nieudany zapis "ciężkiej reakcji" to cicha unhandled rejection. Fix: jedna funkcja
    `describeDbWriteError`.
28. **`OfflineAreaDownload` czyta `navigator.onLine` w renderze** (zgłoszone przez dwie soczewki) -
    panel nie reaguje na powrót zasięgu. Hook `useOnlineStatus` już istnieje. **Bardzo mała**.
29. **Brak timeoutu w czterech fetchach do Open-Meteo** - "Leśny asystent" może zawisnąć na
    "Sprawdzanie pogody..." bez końca przy zaczepieniu o skrawek 2G. Fix: `AbortSignal.timeout`.
30. **Trzy identyczne indeksy `speciesById` i osiem rzutowań `speciesData as Species[]`** obok
    gotowej stałej `ALL_SPECIES`, która objęła tylko Bazę wiedzy. Fix: `SPECIES_BY_ID` +
    `getSpecies(id)` w `data/species.ts`.
31. **Wzorzec szuflady powtórzony 10 razy**, z trzema niespójnymi wariantami uchwytu - główne
    wejście do Narzędzi i panel powiadomień to jedyne szuflady bez uchwytu do przeciągnięcia.
32. **`App.tsx` renderuje 6 niemal identycznych bloków dialogów narzędzi** niepowiązanych typowo z
    `ToolKey` - dodanie 7. narzędzia cicho nic nie zrobi i TypeScript tego nie wyłapie.
33. **`pruneTripNotifications` nie zna czwartego producenta kluczy** (rewizyty grzybowisk), więc
    klucze rosną bez końca - mimo że ten plik powstał dokładnie po to, by temu zapobiec.
34. **Drobiazgi jednoplikowe**: `MONTH_ABBR_PL` zdefiniowane dwa razy; `getCurrentSeason` liczy
    porę roku po swojemu wbrew własnemu komentarzowi; `CookingTimer` wibruje z pominięciem
    `utils/haptics.ts`; timer odlicza tickami `setInterval`, więc w tle spóźnia się dowolnie;
    `manifest.background_color` biały przy zielonym `theme_color` (biały błysk przy starcie po
    zmroku); `EmergencyCard` nie ma przycisku 112.

### Sesja H: zapytania Dexie (czysta wydajność, zero ryzyka)

35. **Dziennik: N+1 zapytań o zdjęcia** - 100 kart × własne `useLiveQuery` po **pełne** rekordy
    `Photo`, żeby pokazać miniaturę 64×64. Wzorzec naprawy ma precedens w `SpotManager.tsx:85-87`.
    Robić osobno i jako ostatnie - zmienia interfejs `FindingThumbnail`.
36. **`consumedFindings` skanuje całą tabelę bezwarunkowo**, choć jest potrzebne tylko przy ciężkiej
    reakcji; **`TripsHistory`** czyta pełne rekordy, żeby policzyć liczby (właściwy wzorzec
    `uniqueKeys()` jest 100 linii wyżej w tym samym feature); **`computeAchievements`** liczy się w
    każdym renderze z efektem odpalającym się w każdym renderze; **`useAndroidWidgetSync`** ciągnie
    pełne rekordy dla dwóch liczb i przestawia interwał po każdej zmianie w tabeli.
37. **Dodanie zdjęcia dekoduje każdy plik DWA razy i wszystkie naraz** (`AddFindingForm.tsx:131-136`,
    `JournalView.tsx:309`) - 3 zdjęcia z aparatu 12 Mpix to szczyt grubo powyżej 150 MB. To jedna z
    dwóch najczęstszych akcji w terenie. Robić bez towarzystwa innych zmian.
38. **Otwarcie "Pamięć i dane" po pobraniu obszaru offline odpala do 4500 równoległych
    `cache.match()`** (`storageInfo.ts:35-55`), część z czytaniem ciała odpowiedzi. Szuflada stoi
    bez spinnera do końca.

---

## Świadomie NIE w planie

- **Wirtualizacja markerów na mapie** przy 2000 znalezisk - realny klif wydajnościowy
  (`MapLayers.tsx:122-152` klastruje w pikselach, ale Leaflet nie odcina markerów po viewporcie),
  ale to osobna, duża decyzja, nie punkt z audytu.
- **Wirtualizacja list** - zamknięta w Fazie 27, paginacja `PAGE_SIZE = 100` jest wystarczająca.
  Właściwą poprawką dla Dziennika jest pkt 35, nie wirtualizacja.
- **Terminacja workera modelu AI po bezczynności** - hipoteza bez pomiaru; terminacja oznacza
  ponowne ładowanie modelu, czyli pogorszenie tego, co komentarz w kodzie świadomie optymalizuje.
- **Memoizacja wszystkich widoków** pod minutowy timer w `App` - dokładnie to, co odrzucił
  `MAP-AUDIT-ROADMAP.md` pkt 7.
- **Lazy-load narzędzi** - policzone: łącznie ~700 linii dzielących `Drawer` z resztą apki, zysk
  kilku KB po gzipie przy realnym koszcie kolejnych granic `Suspense`.

---

## Proponowana kolejność

1. **Decyzje 0.1 + 0.2 + 0.3** (wszystkie dotykają `sw.ts`/`vite.config.ts`) → potem **sesja E**
   w całości, z weryfikacją na telefonie w trybie samolotowym. To jest najwyżej punktowane,
   bo dotyczy gwarancji, na której stoi cała apka.
2. **Sesja A** (powiadomienia) - jedna zmiana sygnatury dotyka czterech hooków, każdy ma test.
3. **Sesja D** (tick GPS) - jeden dobrze zrozumiany szew, pkt 11 najpierw i z testem.
4. **Sesja C** (formularz), zaczynając od pkt 8 i 10.
5. **Sesja B** (porządkowanie po powrocie) → dopiero potem decyzja 0.5, żeby "zapomniałem
   wystartować wyprawę" miało już drogę ratunku.
6. **Sesja F** (a11y), z pkt 19 osobnym commitem.
7. **Sesje G i H** - do wzięcia pojedynczo, w dowolnym momencie.
