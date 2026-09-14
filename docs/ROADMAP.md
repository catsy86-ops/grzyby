# Plan rozbudowy, naprawy i dopracowania - ŁYSY

Kontynuacja po Fazie 0-3 i P0-P2 (historia commitów). Trzy twarde wymagania będące punktem
wyjścia tego planu:

1. Aplikacja ma działać w **100% offline**.
2. **Darmowe** rozpoznawanie AI gatunków, **bez kluczy API** (on-device, TensorFlow.js).
3. **Piękne, intuicyjne UI/layout** - animacje, przejścia.

Plan powstał po audycie kodu (trzy równoległe eksploracje: stan offline, stan modelu AI, stan
UI/animacji) i syntezie w konkretny, sfazowany plan implementacji. Każda faza ma jasno określony
zakres i priorytet.

---

## Faza 9 - Świeży audyt całej aplikacji (2026-09-13, agent `architect`)

Po Fazach 4-8 zlecono niezależną, pełną analizę kodu (nie tylko diff sesji), żeby złapać rzeczy
pominięte przy iteracyjnej pracy. Pełny raport w historii sesji - tu skrót z priorytetami.

**Krytyczne — ✅ oba naprawione (2026-09-13):**
1. ~~Oryginalne zdjęcia (nieskompresowane, z aparatu) trafiają wprost do IndexedDB~~ - dodano
   `compressPhoto()` w `src/utils/imageUtils.ts` (max 1600px, jakość 0.85), `AddFindingForm.tsx`
   zapisuje teraz skompresowaną wersję zamiast surowego pliku. Dodano też **lightbox** -
   `FindingThumbnail.tsx` otwiera pełny podgląd zdjęcia po kliknięciu (wcześniej oryginał nie był
   nigdzie wyświetlany). Zweryfikowane na żywo w przeglądarce (dodanie znaleziska ze zdjęciem →
   podgląd w Dzienniku).
2. ~~`AddFindingForm.handleSubmit` bez obsługi błędu zapisu~~ - dodano `catch` z rozróżnieniem
   `QuotaExceededError` (komunikat o braku miejsca, z odsyłaczem do "Pamięć i dane") od innych
   błędów, `toast.error` + `Alert` w formularzu, formularz **nie zamyka się** przy błędzie (dane
   użytkownika nie giną). 4 nowe testy w `AddFindingForm.test.tsx` pokrywają ten scenariusz -
   wcześniej ten plik w ogóle nie istniał (agent to zauważył jako brak testów błędów).

**Wysoki priorytet — ✅ wszystkie 5 zrobione (2026-09-14):**
1. ~~Brak React Error Boundary wokół `<ActiveView>`~~ - `src/components/ErrorBoundary.tsx`,
   resetuje się automatycznie przy zmianie zakładki (`resetKey`) lub ręcznie przyciskiem.
2. ~~`isModelAvailable()` robi zbędny `fetch` HEAD przy każdym wejściu na "Rozpoznaj"~~ - wynik
   cache'owany w module (`mushroomModel.ts`), ten sam wzorzec co `loadModel()`/`loadClassLabels()`.
3. ~~Brak walidacji kształtu importu~~ - `validateExportPayload()` w `exportImport.ts` sprawdza typy
   pól findings/trips/photosByFindingId PRZED dotknięciem bazy, z czytelnymi komunikatami błędu.
4. ~~Brak edycji lokalizacji/zdjęcia istniejącego znaleziska~~ - `JournalView.tsx`: w trybie edycji
   można zaktualizować lokalizację przez GPS (`getCurrentPosition()`) lub usunąć ją, oraz
   podmienić/usunąć zdjęcie znaleziska.
5. ~~Mapa renderuje wszystkie znaleziska bez klastrowania~~ - `src/utils/clusterFindings.ts`
   (grupowanie kubełkowe w przestrzeni pikseli mapy, niezależne od zoomu) + `FindingMarkers` w
   `MapView.tsx`, klik w klaster przybliża mapę.

**Średni:** martwy kod dark mode (`next-themes` bez `ThemeProvider`, klasa `.dark` nigdy nie
nadawana - do decyzji: dokończyć czy usunąć); brak ostrzeżenia przed duplikatami przy
podwójnym imporcie tego samego pliku; brak testów na scenariusze błędów (tylko happy-path);
`useLiveQuery(() => db.findings.toArray())` bez limitu/paginacji; `AddFindingForm` pozwala na
tylko 1 zdjęcie mimo że schema (`Photo.findingId`) już wspiera wiele; drobne braki a11y
(`type="button"` niespójnie, fokus-ring na custom przyciskach); panel "Pamięć i dane" miesza
liczbę plików z rozmiarem w bajtach.

**Niskie:** `shadcn` (CLI) w `dependencies` zamiast `devDependencies`.

**Nowe funkcje zgodne z charakterem apki (bez backendu):** wielozdjęciowe znaleziska (schema już
gotowa), lightbox pełnego zdjęcia, statystyki sezonowe/roczne (na bazie już przetestowanego
`tripStats.ts`), eksport wyprawy do GPX, lokalne przypomnienie sezonowe, dokończenie/usunięcie
dark mode, przypomnienie o braku backupu, klastrowanie/filtrowanie markerów na mapie.

**Propozycje z rozmowy (użycie w terenie, nieujęte w raporcie agenta):** kompas + dystans powrotu
do zapisanego punktu (auto/start trasy) - działa offline z samego GPS; licznik czasu do zmroku
(lokalna astronomia, zero API); filtr "w sezonie teraz" w Bazie wiedzy (mamy już pole `season`).

**Architektura:** oceniona jako NIE wymagająca przebudowy pod dalszą rozbudowę - struktura
features-first jest adekwatna, luki są punktowe, nie strukturalne.

---

## Faza 10 - Weryfikacja danych realnymi źródłami (2026-09-13)

Na prośbę użytkownika o użycie darmowych API/danych o grzybach - wszystkie zapytania robione
build-time do wzbogacenia/weryfikacji statycznych danych w `species.json` (offline-first = zero
zapytań w runtime), tak samo jak wcześniej z Wikimedia Commons dla zdjęć.

- [x] **GBIF Species API** (`api.gbif.org`, globalna baza taksonomiczna, darmowa, bez klucza) -
      zweryfikowano nazwy naukowe wszystkich 19 gatunków. 18/19 dokładne dopasowanie ACCEPTED.
      **Znaleziono i poprawiono błąd**: *Boletus satanas* to w aktualnej taksonomii GBIF synonim -
      przyjęta nazwa to **Rubroboletus satanas** (rodzaj przeniesiony z Boletus przy rewizji
      filogenetycznej Boletaceae ok. 2015). `species.json` → `borowik-szatanski.nameLatin`
      zaktualizowane na `"Rubroboletus satanas (dawniej Boletus satanas)"`.
- [x] **Wikipedia PL + GBIF occurrence search** (country=PL) - częściowa weryfikacja (10/19,
      przerwana przez rate-limit API - do dokończenia) potwierdziła: polskie nazwy zwyczajowe
      zgadzają się z artykułami Wikipedii, wszystkie sprawdzone gatunki mają realne zgłoszone
      obserwacje w Polsce (56-3041 rekordów) - dane w `species.json` nie są zmyślone/nietypowe dla
      polskich lasów. Wikipedia PL dodatkowo potwierdziła krzyżowo zmianę nazwy na
      "Krwistoborowik szatański" (spójne z korektą GBIF wyżej).
- [ ] Dokończyć weryfikację pozostałych 9 gatunków (rate-limit GBIF occurrence/search - wymaga
      wolniejszego tempa zapytań).
- **Możliwe kolejne źródła** (sprawdzona dostępność, nieużyte jeszcze): Mushroom Observer API
      (`mushroomobserver.org/api2`) - opisy/notatki specyficzne dla grzybów, społecznościowe
      konsensus-identyfikacje; iNaturalist - dodatkowe zdjęcia/obserwacje. Do rozważenia przy
      kolejnym rozszerzeniu bazy wiedzy.

---

## Faza 11 - Lista życzeń z rozmowy (propozycje użytkownika, 2026-09-13)

Użytkownik przesłał dwie listy pomysłów na funkcje. Poniżej skonfrontowane ze stanem apki -
część już istnieje, część pasuje do architektury "bez backendu", część **wymaga backendu/serwera
i jest sprzeczna z dotychczasową, świadomą decyzją architektoniczną tego projektu** (offline-first,
zero kont, zero własnej infrastruktury serwerowej) - oznaczone wyraźnie, wymaga Twojej decyzji
zanim ktokolwiek to zaimplementuje.

**Już zrobione (pokrywają się z listami):**
- Skaner AI ze zdjęcia - kod gotowy, model do dostarczenia (Faza 5)
- Tryb offline (mapa + baza wiedzy + fundament modelu AI) - Faza 4
- Atlas grzybów z jadalnością/cechami/sezonem/siedliskiem/zdjęciami + filtr "w sezonie teraz" -
  Faza 4/9, 19 gatunków
- "System Podobne i Niebezpieczne" / "Atlas Podobieństw" - już istnieje jako
  `LookalikesWarning`/`lookalikes.ts`, wyświetlane przy każdym gatunku (np. kurka vs lisówka
  pomarańczowa, czubajka kania vs muchomory) - dziś inline w karcie, nie osobny ekran
  porównawczy side-by-side (patrz niżej)
- Dziennik Grzybiarza (statystyki, historia wypraw, galeria zdjęć z lightboxem) -
  `JournalView`/`TripManager`/`tripStats.ts`

**Nowe, zgodne z architekturą (bez backendu) - warte dodania:**
- [ ] Kompas/GPS "Gdzie jest auto" (Faza 9, propozycja z rozmowy) - zapis punktu startowego,
      dystans+kierunek powrotu, czysto z lokalnego GPS
- [ ] Osobiste "Grzybowiska" - nazwane, zapisane miejsca z historią zbiorów w czasie (rozszerzenie
      istniejącego modelu `Trip`/`Finding` o nazwane lokalizacje, nie tylko pojedyncze pinezki)
- [ ] Dedykowany ekran "Porównywarka" (Jadalny vs Trujący side-by-side) - dziś sobowtóry są inline
      w karcie gatunku, osobny widok "X kontra Y" z dwoma zdjęciami obok siebie i listą różnic
      byłby czytelniejszy do szybkiej weryfikacji w terenie
- [ ] Waga/ilość w statystykach zbiorów - wymaga nowego pola w schemacie (`Finding.weightGrams`),
      dziś `tripStats.ts` liczy tylko liczbę/różnorodność gatunków
- [ ] Przepisy kulinarne i porady dot. czyszczenia/suszenia - nowy statyczny dataset (jak
      `species.json`), osobna zakładka/sekcja per gatunek
- [ ] Krótki przewodnik pierwszej pomocy przy podejrzeniu zatrucia - statyczna treść
      bezpieczeństwa, wysoka wartość/niski koszt, spójna z istniejącymi ostrzeżeniami
- [ ] Oznaczenie gatunków chronionych prawem - wymaga nowego pola (dziś `edibility` nie rozróżnia
      "chroniony" od jadalności)
- [ ] Przycisk "Wyślij SMS z lokalizacją" - **da się zrobić bez własnego backendu**: natywny URI
      `sms:?body=...` z współrzędnymi GPS otwiera domyślną aplikację SMS telefonu, użytkownik sam
      wybiera odbiorcę i wysyła - żadnych danych nie przechodzi przez serwer tej apki

**Wymaga backendu/serwera - SPRZECZNE z dotychczasową architekturą, decyzja do Ciebie:**
- Weryfikacja społecznościowa (pytanie innych użytkowników o potwierdzenie gatunku)
- Publiczna mapa "Radar grzybowy" / anonimowe zgłoszenia regionalne (heatmapa całej społeczności)
  - wymaga serwera agregującego dane od wielu użytkowników, kont lub przynajmniej anonimowego
    API zapisu - to nowa, duża decyzja projektowa (dotąd: zero backendu, zero danych
    opuszczających urządzenie użytkownika), nie coś do cichego dodania przy okazji

**Sprzeczne z obecnym stosem technologicznym (nie realizować bez wyraźnej zgody):**
- Sugestia przepisania na Flutter/React Native - obecna apka to działająca React 19 + Vite PWA
  (przez to repo przeszło już 9 faz pracy: offline, AI, animacje, panel pamięci, 19 gatunków w
  bazie wiedzy). Przepisanie na inny framework wyrzuciłoby cały dotychczasowy dorobek i byłoby
  całkowitym restartem projektu - zostaję przy obecnym stosie, chyba że zdecydujesz inaczej.
- TensorFlow Lite - odpowiednikiem on-device AI w przeglądarce jest już używany TensorFlow.js
  (ten sam cel: rozpoznawanie zdjęć lokalnie, bez serwera).

**Druga lista (wydajność/Next.js/SEO) - skonfrontowana ze stosem tej apki (Vite + React SPA, NIE
Next.js):**

Realne, zgodne z obecnym stosem, warte dodania:
- [ ] **Wirtualizacja list** (TanStack Virtual) w `JournalView.tsx`/`EncyclopediaView.tsx` -
      pokrywa się z luką już znalezioną przez agenta w Fazie 9 (`useLiveQuery(() =>
      db.findings.toArray())` bez limitu). Realny problem przy dużej historii, dobra, konkretna
      biblioteka do tego.
- [ ] **Web Worker dla inferencji TF.js** - dziś `identifyMushroom()` w
      `src/utils/mushroomModel.ts` liczy na głównym wątku; dla większych modeli może to
      przycinać UI. Przeniesienie do Web Workera to legalna, niezależna od frameworka technika.
- [ ] **Eksport PDF z podsumowaniem wyprawy/sezonu** (`react-pdf` lub `jsPDF`, generowane w
      100% po stronie klienta, bez serwera) - naturalne rozszerzenie istniejącego
      eksportu/dziennika.

Nie dotyczy / nie da się zastosować wprost (framework mismatch):
- `@ducanh2912/next-pwa`, RSC/Server Actions, `generateStaticParams`, `@vercel/og` - to
  wszystko API **Next.js**, a apka jest na Vite (SPA). Cel PWA-offline już zrealizowany
  odpowiednikiem dla Vite (`vite-plugin-pwa`, Faza 4) - nie wymaga migracji frameworka.

Technicznie wątpliwe/niepewne wsparcie przeglądarek:
- Geofencing API (ostrzeżenie przy wejściu na teren rezerwatu) - eksperymentalne/nigdy w pełni
  nie wystandaryzowane, brak stabilnego wsparcia w głównych przeglądarkach mobilnych. Wymagałoby
  też realnych danych geoprzestrzennych granic rezerwatów (osobne źródło danych do znalezienia).
  Nie odrzucam pomysłu, ale nie jest to dziś "po prostu dodaj bibliotekę".

Sprzeczne z twardymi wymaganiami ustalonymi na starcie tego planu (100% offline, za darmo, bez
kluczy API, bez backendu) - decyzja do Ciebie, nie realizować po cichu:
- **Asystent kulinarny przez OpenAI/Gemini** - płatne API zewnętrzne z kluczem, prosto sprzeczne
  z wymaganiem "darmowe, bez kluczy API" z początku tego planu. Zgodny z architekturą odpowiednik:
  statyczna baza przepisów (jak `species.json`) bez żadnego LLM.
- **Mapy cieplne przez Next.js RSC, System "Dual-Check"** - wymagają serwera agregującego dane
  wielu użytkowników - to samo zastrzeżenie co "Radar grzybowy" wyżej.
- **SEO / publiczne strony per gatunek indeksowane w Google** - ta apka to prywatne, offline-owe
  narzędzie osobiste, nie publiczny serwis treściowy. Zrobienie z Atlasu publicznej, indeksowanej
  strony wymagałoby postawienia serwera/hostingu i zmiany modelu produktu z "apka na Twoim
  telefonie" na "serwis internetowy" - to nowa decyzja biznesowa, nie techniczne dopięcie.

**Trzecia lista (pogoda, sprzęt, obróbka, dostępność w terenie):**

Już zrobione:
- ~~Kalkulator wschodu/zachodu słońca, czas do zmroku~~ ✅ **podłączone do UI** -
  `src/utils/sunTimes.ts` (algorytm US Naval Observatory, zero API) + `useSunsetCountdown.ts` +
  plakietka w `MapView.tsx` (obok "Aktywna wyprawa"), czerwony wariant gdy < godziny do zmroku.
  8 testów, zweryfikowane na żywo w przeglądarce (real-world: złapało faktyczny zachód słońca
  podczas testu, poprawnie pokazało "Zmrok za 50 min" w trybie pilnym).
- Tryb ciemny AMOLED - pokrywa się z już znalezionym martwym kodem (Faza 9, pkt 8: `next-themes`
  zainstalowany, ale nigdy nie owinięty w `ThemeProvider`, klasa `.dark` nigdy nie nadawana).
  Dokończenie tego = jednocześnie realizacja tego pomysłu.

Realne, zgodne z architekturą, warte dodania:
- [ ] **"Kiedy na grzyby"** (wskaźnik na podstawie opadów/temperatury) - da się zrobić **bez
      własnego backendu i bez klucza API** przez darmowe, publiczne API pogodowe
      (np. Open-Meteo - historyczne i prognozowane dane, brak wymaganego klucza, hojny darmowy
      limit) wywoływane bezpośrednio z przeglądarki, tylko gdy online; wynik można cache'ować do
      wglądu offline. Sam "algorytm wysypu" to nasza własna heurystyka na tych danych.
- [ ] Interaktywna checklista sprzętu przed wyjściem - czysto lokalne, żadnych zależności
      zewnętrznych, prosty do dodania.
- [ ] Asystent ochrony przed kleszczami (przypomnienie o spray'u co 3-4h, przewodnik usuwania,
      przypomnienie o kontroli po 14 dniach) - da się zrealizować na już istniejącej
      infrastrukturze lokalnych powiadomień (`src/utils/notifications.ts`, ten sam mechanizm co
      przypomnienie o długiej wyprawie z P2).
- [ ] Info o suszeniu/mrożeniu/gotowaniu per gatunek - nowe pole treści w `species.json` (jak
      `habitat`/`season`), zero nowej infrastruktury.
- [ ] Timer do blanszowania/gotowania - prosty stoper w UI, opcjonalnie z czasami sugerowanymi per
      gatunek z punktu wyżej.
- [ ] Tryb "W lesie" (duże przyciski, wysoki kontrast) - czysto UI/CSS, realna wartość (mokre
      palce, rękawiczki, słońce na ekranie) - dobry kandydat obok wcześniejszego planu
      wizualnego mobile/desktop.

Technicznie wątpliwe / trzeba uczciwie zaznaczyć ograniczenie:
- **Komendy głosowe** ("Zapisz tutaj borowika") - Web Speech API (`SpeechRecognition`) istnieje w
  przeglądarkach, ale w praktyce w większości implementacji (w tym Chrome) rozpoznawanie mowy jest
  **przetwarzane w chmurze, wymaga sieci** - ironicznie sprzeczne z głównym scenariuszem użycia
  (głęboki las, brak zasięgu). Nie ma dziś powszechnie wspieranego, w pełni offline'owego
  rozpoznawania mowy w przeglądarce. Do rozważenia jako funkcja "gdy jest zasięg", nie jako
  niezawodna funkcja terenowa.
- **Radar opadów na żywo + push o zbliżającej się burzy** - "na żywo" i "push gdy apka zamknięta"
  wymaga infrastruktury (Web Push = serwer wysyłający powiadomienia, sprzeczne z "bez backendu").
  Wersja zgodna z architekturą: sprawdzenie pogody na żądanie, gdy apka jest otwarta i jest sieć
  (przez to samo darmowe API co "Kiedy na grzyby") - bez powiadomień w tle.

---

## Faza 4 - Fundament offline + pipeline modelu AI ✅ zrobione

**Priorytet: krytyczny** (wymagania 1 i 2)

- [x] `vite.config.ts`: dodano `bin` do `globPatterns` workbox - wagi modelu AI trafiają do
      precache od pierwszego uruchomienia, nie dopiero po pierwszym użyciu zakładki "Rozpoznaj".
- [x] `src/utils/offlineMapTiles.ts` + integracja w `MapView.tsx`: przycisk "Pobierz obszar
      offline" (presety promienia 2/5/10 km, zoom 13-16, limit 4500 kafelków - największy preset,
      10 km, to ok. 3940 kafelków), zapisuje wprost do cache `map-tiles` (ten sam, którego używa
      runtime CacheFirst z `vite.config.ts`).
      Nowy komponent `src/components/ui/progress.tsx` i `src/features/map/OfflineAreaDownload.tsx`
      (Drawer z paskiem postępu). Testy: `src/utils/offlineMapTiles.test.ts` (10 testów).
- [x] Obsługa braku kafelków offline: nasłuch `tileerror` na `TileLayer`, komunikat w UI zamiast
      cichych pustych pól na mapie.
- [x] `scripts/prepare-dataset/` (skrypt pobierania kandydatów ze zdjęciami z Wikimedia Commons +
      README z instrukcją ręcznej kuracji) i `scripts/train-model/train.py` (transfer learning na
      MobileNetV2, wymusza kolejność klas = `species.json`, eksport do formatu zgodnego z
      `mushroomModel.ts`) - narzędzia gotowe, bez faktycznego modelu (patrz Faza 5).
- [x] `docs/MODEL-TRAINING.md`: pełna instrukcja obu ścieżek (Teachable Machine / `train.py`).
- [x] `src/utils/mushroomModel.ts`: `loadClassLabels()` - mapowanie klas po nazwie z opcjonalnego
      `public/models/metadata.json` (eksport Teachable Machine) zamiast sztywnego założenia
      pozycyjnego, z fallbackiem do kolejności `species.json`. Testy strażnicze w
      `mushroomModel.test.ts`.
- [x] `.gitignore`: `dataset/`, `model-export/`, `scripts/prepare-dataset/raw/`,
      `public/models/*` (poza `.gitkeep`) - duże/niewolne od praw artefakty nie trafiają do repo.

**Kryterium akceptacji:** build produkcyjny + `npm run preview` działa w 100% offline, poza
pierwszym wejściem na nieodwiedzony obszar mapy (udokumentowany, świadomy kompromis z jasnym
komunikatem w UI zamiast cichej awarii).

**Świadomie NIE ruszone:** `android/app/src/main/AndroidManifest.xml` (celowo bez `INTERNET` -
patrz Faza 8), `IdentifyView.tsx` UI (ad-hoc markup zostaje do Fazy 6, żeby nie mieszać zmian
funkcjonalnych z polish UI w jednym kroku).

---

## Faza 5 - Dostarczenie modelu + zdjęcia gatunków

**Priorytet: wysoki, częściowo poza sesją (wymaga Twojego działania)**

- [x] **Agent:** uruchomiony `scripts/prepare-dataset/fetch-reference-images.mjs` (rozszerzony o
      `--skip-existing` i retry z backoffem na 429 od Commons API) - 372 kandydackie zdjęcia dla
      wszystkich 19 gatunków (`scripts/prepare-dataset/raw/`, gitignored, ~94MB). Pierwszy filtr
      (nazwa pliku) + wizualna weryfikacja próbki usunęły oczywiste nie-zdjęcia (znaczki,
      ilustracje botaniczne, modele muzealne) i jedno złe dopasowanie gatunku (Armillaria gallica
      pod opieńką miodową zamiast A. mellea).
- [ ] **Ty:** ręczna kuracja - przejrzyj `scripts/prepare-dataset/raw/<gatunek>/`, usuń złe/
      nieostre/nie-ten-gatunek, dodaj własne zdjęcia z wypraw. Obecnie ~16-20 zdjęć/gatunek -
      poniżej zalecanego minimum (80-150/gatunek), nie wystarczy do sensownego treningu bez
      dodania własnych. Przy grzybach trujących vs jadalnych to kwestia bezpieczeństwa, nie da się
      tego bezpiecznie w pełni zautomatyzować.
- [ ] **Ty:** trening - Teachable Machine (przeglądarka, szybkie) lub `scripts/train-model/train.py`
      (Python, więcej kontroli) - patrz `docs/MODEL-TRAINING.md`.
- [ ] **Ty:** wgraj `model.json` + wagi (+ opcjonalnie `metadata.json`) do `public/models/`.
- [x] **Agent:** zdjęcia referencyjne per gatunek - wybrane i wizualnie zweryfikowane (19/19) z
      kandydatów w `scripts/prepare-dataset/raw/`, skopiowane do `public/species-images/`
      (~4.4MB), `species.json.imageUrls` uzupełnione, atrybucja licencji CC w
      `public/species-images/CREDITS.md`. Wyświetlane jako miniatury w `EncyclopediaView.tsx`,
      precache dodany do `vite.config.ts` (`jpg` w globPatterns). Uwaga: to zdjęcia
      *ilustracyjne* do bazy wiedzy - osobna sprawa od (nieporównywalnie wyższej stawki
      bezpieczeństwa) kuracji zbioru treningowego dla modelu AI, patrz punkt niżej.
- [ ] **Agent (po dostarczeniu plików):** weryfikacja integracji (`isModelAvailable()` → `true`,
      sanity-check na znanych zdjęciach), dostrojenie `LOW_CONFIDENCE_THRESHOLD` w
      `PredictionCard.tsx`, miniatury gatunków w `EncyclopediaView.tsx`/`PredictionCard.tsx`.

**Kryterium akceptacji:** rozpoznawanie działa offline po pierwszym uruchomieniu bez sieci (dzięki
precache z Fazy 4).

---

## Faza 6 - Nawigacja i przejścia (silnik animacji) ✅ zrobione

**Priorytet: wysoki** (wymaganie 3)

- [x] `npm i motion @formkit/auto-animate`.
- [x] `src/App.tsx`: ikony `lucide-react` zamiast emoji, `AnimatePresence`/`motion.div` wokół
      aktywnego widoku, animowany wskaźnik aktywnej zakładki (`layoutId="nav-pill"`), tokeny
      motywu zamiast hardkodowanego `bg-green-900`.
- [x] `src/features/identify/IdentifyView.tsx`: dropzone oparty o `Button`, `Alert`/
      `AlertDescription` zamiast ad-hoc divów, spinner `Loader2Icon` podczas inferencji, `motion`
      fade/scale na podglądzie zdjęcia, `useAutoAnimate` na liście wyników.
- [x] Zweryfikowane testami (Vitest 79/79, `e2e/add-finding.spec.ts`) i live-testem w przeglądarce
      (Playwright) - zero błędów w konsoli po poprawce brakujących `key` w `AnimatePresence`.

*(Agent `frontend-expert`, sesja z 2026-09-13.)*

---

## Faza 7 - Polish pozostałych widoków i spójność motywu ✅ w większości zrobione

**Priorytet: średni-wysoki**

- [x] `MapView.tsx`: skeleton przy pierwszym `useLiveQuery`, `motion`/`AnimatePresence` enter/exit
      na badge'u aktywnej wyprawy i alertach (tile-load-issue, locate-error, pin-hint).
- [x] `JournalView.tsx` / `EncyclopediaView.tsx`: skeletony ładowania, puste stany z ikoną +
      fade-in, `useAutoAnimate` na listach, hardkodowane `green-800`/`gray-500` zamienione na
      tokeny `--color-*`.
- [x] Audyt `ConsumptionTracker.tsx`, `TripManager.tsx` - hardkodowane kolory (`gray-200`,
      `green-300` itd.) zamienione na tokeny motywu. `TripsHistory.tsx` sprawdzony - już był czysty
      (shadcn `ToggleGroup`/`Button`, brak hardkodowanych kolorów), bez zmian.
- [ ] Customizacja `sonner` (kolory z tokenów, `richColors`) - nie zrobione, niski priorytet.

*(Agent `frontend-expert`, sesja z 2026-09-13.)*

---

## Faza 8 - Domknięcie PWA/offline UX ✅ w większości zrobione

**Priorytet: niski-średni**

- [x] `src/hooks/useOnlineStatus.ts` + subtelny banner w `App.tsx` przy przejściu offline→online
      (animowany `motion`, nieblokujący - apka działa identycznie w obu stanach). Zweryfikowane
      live-testem w przeglądarce (emulacja sieci przez CDP).
- [x] `src/components/StorageInfoDrawer.tsx` (`src/utils/storageInfo.ts`) - ekran "Pamięć i dane"
      dostępny z ikony w nagłówku: `navigator.storage.estimate()`, liczba plików per cache
      (`map-tiles`/`ai-model`), przycisk czyszczenia z potwierdzeniem (`AlertDialog`) - jasno
      zaznaczone, że dane użytkownika (Dexie) nie są tym ruszane.
- [x] `sonner.tsx` sprawdzony - już używa tokenów motywu (`--normal-bg` itd.) i własnych ikon per
      typ toastu. `richColors` świadomie pominięte - kolidowałoby z tym spójnym, tokenowym stylem
      (nadpisałoby `--normal-bg` twardymi kolorami per typ).
- [ ] Decyzja **do wyraźnej zgody użytkownika**: czy dodać `android.permission.INTERNET` do
      `android/AndroidManifest.xml` dla natywnego widgetu (dziś celowo bez internetu) - zmienia
      model bezpieczeństwa tego wariantu, nie realizować bez potwierdzenia.

*(Sesja z 2026-09-13.)*

---

## Zweryfikowany stan "działa offline już dziś" (przed Fazą 4)

- Geolokalizacja, przechowywanie danych (Dexie/IndexedDB), export/import - w 100% lokalne.
- Brak zewnętrznych fontów/CDN, Android WebView bez `INTERNET`.
- Service worker precache app shell (`vite.config.ts`).

## Co wymagało/wymaga sieci (adresowane w Fazie 4-5)

- Kafelki mapy (`maps.wikimedia.org`) - rozwiązane częściowo w Fazie 4 (pobieranie obszaru na
  żądanie + jasny komunikat przy braku kafelków), pełne pokrycie zależy od tego, czy użytkownik
  pobrał obszar przed wyprawą.
- Model AI rozpoznawania - kod i precache gotowe (Faza 4), sam model wymaga Fazy 5.
