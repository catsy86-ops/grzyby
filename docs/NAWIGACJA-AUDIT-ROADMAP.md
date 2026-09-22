# Audyt nawigacji (App.tsx) 2026-09-22: architektura/clean code, wydajność, UX/testy

Wygenerowane przez trzy równoległe agenty `audit-specialist` (architektura, wydajność, UX) czytające
świeżo `src/App.tsx` (przełączanie zakładek Mapa/Dziennik/Baza wiedzy, View Transitions API,
nagłówek, splash/onboarding) i jego bezpośrednie zależności - **nie** wnętrze `MapView`/
`JournalView`/`EncyclopediaView`, te mają już własne audyty (`docs/MAP-AUDIT-ROADMAP.md`,
`docs/JOURNAL-AUDIT-ROADMAP.md`, `docs/BAZA-WIEDZY-AUDIT-ROADMAP.md`).

**Nic z tego nie jest jeszcze zaimplementowane w chwili pisania tego dokumentu.**

---

## Tier 0: wymaga decyzji przed realizacją

Brak. Jedyny kandydat na Tier 0 (pełny remount widoków przy zmianie zakładki, patrz Tier 1 #1) ma
jednoznaczny, tani kierunek naprawy bez trade-offów architektonicznych, więc ląduje w Tier 1.

---

## Tier 1: realne problemy/luki, niska-średnia złożoność - bezpieczne do zrobienia od razu

1. **Każde przełączenie zakładki w pełni odmontowuje poprzedni widok i montuje nowy od zera** -
   `App.tsx:342-355`. `AnimatePresence mode="wait"` z `key={activeTab}` na wspólnym `motion.div`
   oznacza realny unmount+mount `MapView`/`JournalView`/`EncyclopediaView` przy KAŻDYM przejściu -
   inaczej niż świadomie udokumentowany wzorzec dla nav-ów (`App.tsx:321-325`), które zostają
   zamontowane oba naraz właśnie po to, by nic nie tracić. Realny koszt: dla Mapy - pełna
   reinicjalizacja Leaflet (kafle/markery/listenery) i utrata stanu kamery (środek/zoom) za każdym
   wyjściem i powrotem na zakładkę Mapa; dla Dziennika/Bazy wiedzy - utrata pozycji scrolla i stanu
   filtrów. Chunki JS są już cache'owane (`lazyRetry`), więc to koszt re-inicjalizacji komponentu +
   ponownego uruchomienia subskrypcji Dexie (`useLiveQuery`), nie sieciowy. Fix: renderować
   wszystkie 4 zakładki naraz (każda raz zamontowana przez `Suspense`), przełączać przez
   `hidden`/`display:none` analogicznie do istniejącego wzorca nav-ów, zamiast `key`-remountu w
   `AnimatePresence` (wymaga usunięcia `mode="wait"` i przemyślenia crossfade'u - `viewTransitionName`
   może zostać na kontenerze, samą treść przełączać przez `hidden`). Złożoność: **średnia** (dotyka
   logiki przełączania, wymaga retestu View Transitions/AnimatePresence na obu ścieżkach
   Chromium/Firefox oraz ręcznej weryfikacji stanu kamery Mapy i scrolla Dziennika/Bazy wiedzy po
   przełączeniu i powrocie).

2. **Martwy `resetKey` w `ErrorBoundary` przy realnym użyciu w App.tsx** - `App.tsx:344`
   (`key={activeTab}` na `motion.div`) w połączeniu z `App.tsx:351`
   (`<ErrorBoundary resetKey={activeTab}>`). Ponieważ `key` na rodzicu już wymusza pełny
   unmount/remount całego poddrzewa przy zmianie zakładki, `ErrorBoundary` i tak jest tworzony od
   nowa - logika w `componentDidUpdate` (`ErrorBoundary.tsx:26-30`), resetująca błąd przy zmianie
   `resetKey` na TEJ SAMEJ instancji, nigdy się tu nie wykonuje, bo instancja nie przetrwa zmiany
   taba. Prop jest w tym miejscu użycia efektywnie martwy - myląco sugeruje, że to kluczowy
   mechanizm resetu. Fix: usunąć `resetKey={activeTab}` z `App.tsx:351` (reset i tak następuje przez
   `key` na rodzicu) - **uwaga: jeśli pkt 1 wyżej zostanie zrobiony (usunięcie `key`-remountu),
   `resetKey` PRZESTANIE być martwy i stanie się jedynym mechanizmem resetu błędu przy zmianie
   zakładki - wtedy NIE usuwać, tylko zostawić jako jedyny reset.** Złożoność: **niska**, ale
   **zależna od kolejności względem pkt 1** (patrz "Rekomendowana kolejność" niżej).

3. **`App.tsx` nie ma żadnego pliku testowego**, mimo bycia jedynym miejscem, przez które przechodzi
   każda interakcja użytkownika. Brak testu na przełączanie zakładek (`changeTab`, `App.tsx:194-205`),
   na fallback bez View Transitions API, ani na renderowanie nagłówka/dzwonka/menu narzędzi.
   `changeTab` ma dwie gałęzie (`supportsViewTransitions` true/false) i tylko jedna jest w praktyce
   wykonywana bez jawnego mocka (jsdom nie ma `document.startViewTransition`). Fix: dodać
   `App.test.tsx` z co najmniej: (a) klik w `NavButton` zmienia renderowany widok/`aria-current`,
   (b) mock `document.startViewTransition` + asercja że callback wywołany przez `flushSync`, (c)
   test ścieżki fallback bez wsparcia. Złożoność: **średnia** (wymaga mockowania lazy-importów
   widoków i kilku hooków powiadomień/geolokalizacji).

4. **Brak ogłoszenia zmiany widoku dla czytników ekranu przy przełączeniu zakładki.** `App.tsx:338-356`
   - `<main>` dostaje nową zawartość przy każdej zmianie `activeTab`, ale nic nie ogłasza tego w
   `aria-live`. Fix: `sr-only` region `aria-live="polite"` ogłaszający np. `"${tab.label}, widok
   załadowany"` po zmianie `activeTab`, albo `role="status"` obok `<main>`. Złożoność: **niska**.

5. **Onboarding nie pozwala cofnąć się do poprzedniego slajdu.** `OnboardingOverlay.tsx:105` -
   jedyny przycisk postępu to "Dalej"/"Zaczynajmy", kropki postępu są czysto informacyjne, nie
   klikalne. Fix: przycisk "Wstecz" gdy `step > 0`, albo (taniej) klikalne kropki. Złożoność:
   **niska**.

6. **Treść onboardingu nigdzie nie jest dostępna po pierwszym uruchomieniu.** Po `markSeen()` nie ma
   żadnego trwałego wejścia do tych informacji (np. z `ToolsMenu`). Fix: wpis "Pokaż wprowadzenie
   ponownie" w `ToolsMenu.tsx`, wywołujący ten sam komponent z wymuszonym `visible=true` - reszta
   już istnieje. Złożoność: **niska** (dodanie triggera).

---

## Sprawdzone i potwierdzone jako OK (nie zmieniać)

- **`activeTab` celowo nie jest persystowany** (`appStore.ts:95-105` `partialize` jawnie pomija) -
  po zimnym starcie użytkownik ma zawsze wracać na Mapę, nie na ostatnio otwartą zakładkę sprzed
  tygodni.
- **Nawigacja jako `<nav>`/`<aside>` z `aria-current="page"`, nie sztuczny `role="tablist"`** -
  poprawny wzorzec WAI-ARIA APG dla nawigacji między "stronami" (4 stałe, zawsze widoczne przyciski),
  nie zakładki w obrębie jednego widoku.
- **Podwójny `<nav>`/`<aside>` (mobile dół + desktop side-rail) zamontowany naraz, przełączany przez
  `hidden`** - świadomy wybór (komentarz `App.tsx:321-325`), oba dzielą stan, obrót ekranu nic nie
  gubi; `hidden` realnie usuwa niewidoczny wariant z drzewa dostępności - brak duplikacji tab-stopów.
- **Redukcja ruchu obsłużona globalnie** (`main.tsx:16` `MotionConfig reducedMotion="user"`) +
  natywny View Transitions crossfade ma osobną regułę w `index.css:392-397` - obie ścieżki
  respektują ustawienie systemowe.
- **Focus po zmianie taba zostaje na klikniętym przycisku nawigacji** - oba paski nawigacji są
  trwale zamontowane (nie unmountują się przy zmianie widoku), więc fokus nie trafia w nicość.
- **Plakietka powiadomień ma poprawny `aria-label` z liczbą, wizualny wskaźnik to `aria-hidden`
  kropka** - lepszy wzorzec a11y niż gołe liczby bez etykiety.
- **Kolejność Splash → Onboarding bez ryzyka zakleszczenia** - `AppSplash` (z-50, tylko standalone,
  sessionStorage) zawsze nad `OnboardingOverlay` (z-40, localStorage) niezależnie od kolejności
  montowania w JSX - oba mają jawne wyjście, brak scenariusza utknięcia.
- **`flushSync` + `document.startViewTransition` ściśle ograniczony do `setActiveTab(tab)`** - nic
  więcej nie jest wciągnięte w synchroniczny commit; `AnimatePresence` z `duration: 0` świadomie nie
  dokłada drugiej, konkurencyjnej animacji.
- **Code-splitting per zakładka przez `lazyRetry`/`React.lazy`** - granica jest właściwa (Mapa z
  Leaflet nie ląduje w głównym bundlu, jeśli użytkownik jej nie otworzy).
- **`AnimatedHeaderBackground`/`Logo`/`AnimatedHeaderTitle` nie remontują się przy zmianie zakładki**
  (żyją poza `AnimatePresence` z `key={activeTab}`) - animacje nie restartują się co przejście.
- **`ThemeToggle`'s `mounted`-state** - standardowy wzorzec `next-themes` przeciw
  niezgodności SSR/hydratacji, nie zbędny stan.
- **Remount `MapView` nie uruchamia automatycznie GPS** - geolokalizacja startuje na żądanie
  użytkownika (przycisk "Zlokalizuj"), nie w efekcie montowania - ryzyko "drenażu baterii przy
  każdym powrocie na Mapę" się nie potwierdza.
- **Powiadomienia w tle** (`useTickReminders`, `useSpotRevisitReminders`, `useOverdueTripReminder`,
  `useStormWarning`, `useTripNotificationCleanup`) zamontowane raz na poziomie `App`, niezależnie od
  aktywnej zakładki - celowe, każdy ma własny throttling (interwały rzędu godzin/30 min).
- **Callback-ref dla `headerMapActionsEl` (portal `MapHeaderActions`)** - dodatkowy re-render jest
  zamierzony (zwykły `useRef` nie wywołałby re-renderu App, `MapView` nigdy nie dostałby węzła
  portalu przy pierwszym montowaniu) - zweryfikowany przepływ, brak flickeru.
- **`JournalView`/`EncyclopediaView` NIE portalują akcji do nagłówka App, w odróżnieniu od
  `MapView`** - NIE jest niespójnością: `MapView` portaluje, bo jego akcje nachodziły na natywne
  kontrolki zoom Leaflet, czego Dziennik/Baza wiedzy w ogóle nie mają jako problemu.
- **`TABS` jako jedyne źródło prawdy** (`App.tsx:34-39`) - brak zduplikowanej listy zakładek gdzie
  indziej.
- **Dwie niezależne subskrypcje `useNotificationItems`** (dzwonek w `App.tsx` + pełna lista w
  `NotificationCenter.tsx`, zamontowany na stałe) - formalnie świadomy, powtarzalny wzorzec (ten sam
  komentarz co w audycie `src/components/`); flagowane tylko jako obserwacja niskiego priorytetu -
  **nie refaktoryzować prewencyjnie**, dopiero jeśli lista powiadomień urośnie o coś kosztowniejszego
  niż `count()`/`toArray()` na kilkudziesięciu rekordach.

---

**Tier 1 w całości zaimplementowane (2026-09-22).** Pkt 1 (`KeepAliveViews` w App.tsx - zakładki
raz odwiedzone zostają zamontowane, przełączanie przez `hidden`) zweryfikowany live w przeglądarce
(claude-in-chrome): przesunięto/przybliżono mapę, przełączono na Dziennik i z powrotem - pozycja
kamery Leaflet przetrwała, brak nowych błędów w konsoli po kilku czystych przełączeniach. Pkt 2
(`resetKey` w `ErrorBoundary`) **zostawiony bez zmian** - decyzja użytkownika: skoro pkt 1 został
zrobiony, `resetKey` przestał być martwym kodem i jest teraz jedynym mechanizmem resetu błędu przy
zmianie zakładki (wszystkie 4 widoki są trwale zamontowane, więc `ErrorBoundary` też). Pkt 3 - nowy
`src/App.test.tsx` (5 testów: przełączanie zakładek, zachowanie zamontowania nieaktywnej zakładki,
`aria-live`, oraz obie ścieżki View Transitions - fallback i Chromium, ta druga wymagała
`vi.resetModules()` + dynamicznego re-importu, bo `supportsViewTransitions` to stała modułowa
liczona raz przy imporcie). Pkt 4-6 zaimplementowane wcześniej tego samego dnia (commit `82da849`).
tsc/oxlint/build czyste, testy 701/704 - 3 porażki potwierdzone jako flaka pod pełnym obciążeniem
(przechodzą w izolacji), ten sam znany wzorzec co istniejąca flaka `AddFindingForm.test.tsx`, nie
regresja.

## Rekomendowana kolejność realizacji

**Kolejność ma znaczenie dla pkt 1 i 2** (jedyna zależność w tym dokumencie): zdecydować najpierw,
czy realizować pkt 1 (usunięcie key-remountu widoków). Jeśli tak - zrobić pkt 1 PRZED pkt 2, bo po
usunięciu `key={activeTab}` z `motion.div`, `resetKey` w `ErrorBoundary` przestaje być martwy kod i
staje się jedynym mechanizmem resetu błędu - wtedy pkt 2 zamienia się z "usuń" na "zostaw jako
jedyny mechanizm, nic nie rób". Jeśli pkt 1 NIE jest realizowany teraz (średnia złożoność, wymaga
ręcznej weryfikacji stanu kamery/scrolla) - pkt 2 jest bezpieczny do zrobienia samodzielnie już
teraz (`resetKey` faktycznie martwy przy obecnym `key`-remouncie).

Pkt 3 (test `App.tsx`) warto zrobić przed lub niezależnie od pkt 1 - da siatkę bezpieczeństwa na
przyszłość, ale test ścieżki `changeTab`/View Transitions najlepiej pisać PO ustaleniu ostatecznego
kształtu przełączania widoków (czyli po decyzji ws. pkt 1), żeby nie testować mechanizmu, który
zaraz się zmieni. Pkt 4, 5, 6 są w pełni niezależne od siebie i od 1-3, bezpieczne do zrobienia w
dowolnej kolejności w tej samej sesji.
