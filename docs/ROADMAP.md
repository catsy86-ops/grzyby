# Plan rozbudowy, naprawy i dopracowania - Grzybobranie (dawniej ŁYSY)

Kontynuacja po Fazie 0-3 i P0-P2 (historia commitów). Trzy twarde wymagania będące punktem
wyjścia tego planu:

1. Aplikacja ma działać w **100% offline**.
2. **Darmowe** rozpoznawanie AI gatunków, **bez kluczy API** (on-device, TensorFlow.js).
3. **Piękne, intuicyjne UI/layout** - animacje, przejścia.

Plan powstał po audycie kodu (trzy równoległe eksploracje: stan offline, stan modelu AI, stan
UI/animacji) i syntezie w konkretny, sfazowany plan implementacji. Każda faza ma jasno określony
zakres i priorytet.

---

## Faza 21 - Wizualny polish mapy/UI + plan rozbudowy mapy (2026-09-17)

Na prośbę "popraw wizualnie mapę" + "co zostało do zrobienia" + "uruchom agentów i zaproponuj
plan rozbudowy mapy". Duża sesja polish + jeden `/code-review high` + trzy równoległe eksploracje
agentów (audyt reszty UI, plan funkcji mapy, plan techniczny mapy).

- [x] **Kontrolki Leaflet (zoom/popup/atrybucja) przeflancowane na tokeny motywu** - jedyne
      elementy mapy wyglądające jak domyślny widget biblioteki, jaskrawo białe w trybie ciemnym.
- [x] **Animacja wjazdu markerów/klastra** (CSS keyframe, `prefers-reduced-motion`-safe) + progi
      rozmiaru ikony klastra wg liczebności.
- [x] **Usuwanie znaleziska bezpośrednio z popupu na mapie** (jedyny typ "pozycji" bez usuwania -
      grzybowiska i punkt powrotu już to miały).
- [x] **Mapa ograniczona do Szczecina + woj. zachodniopomorskiego** (`maxBounds`/`minZoom`) -
      reszta Polski/świata nie ma tu wartości.
- [x] **Zwijalny pasek plakietek stanu** (aktywna wyprawa/zmrok/warunki/auto) - od 2 aktywnych w
      górę chowają się za przełącznik, więcej widocznej mapy.
- [x] **`/code-review high` na `f28ba90`** znalazł realny bug: `RecenterOnLocate` remountował się
      razem z `MapContainer` po "Pokaż na mapie" z listy i nadpisywał świeżo ustawiony środek
      mapy ostatnią pozycją GPS - naprawione jednorazową flagą tłumiącą.
- [x] **Pozycja GPS spoza regionu apki (np. błędny fallback geolokalizacji na Wrocław) już nie
      przesuwa mapy** - z aktywnym `maxBounds` wyglądało to jak zawieszenie się na ścianie
      granicy. Auto-centrowanie ignoruje pozycje spoza regionu, ręczne "Zlokalizuj mnie" na takiej
      pozycji pokazuje jasny komunikat.
- [x] **Fork-owy audyt reszty UI** (menu/przyciski/motywy/typografia, poza mapą) - 8-punktowy
      punch-list, wszystkie 8 zrobione: ikonowe przyciski akcji w Dzienniku, `rounded-xl` na
      wykresie, token cienia w dropdown/select, wspólny `speciesCardClassName`, sekcje w menu
      eksportu, poziomy scroll filtra jadalności w Encyklopedii, własne kolory nagłówka dla
      Dziennika (teal-700) i Bazy wiedzy (sky-600, reużyty z pinezek kuratorowanych grzybowisk).
- [x] **View Transitions API między tabami** (progresywne wzbogacenie - natywny crossfade w
      Chrome/Chromium, AnimatePresence bez zmian jako fallback).
- [ ] **Plan rozbudowy mapy (funkcje + strona techniczna) spisany, NIEZAIMPLEMENTOWANY** -
      dwóch równoległych agentów (UX grzybiarza w terenie / architektura i wydajność) dało
      pełną listę propozycji, zapisaną w **`docs/MAP-ROADMAP.md`**. Do podjęcia po powrocie
      użytkownika - żaden punkt stamtąd nie jest pilny.

*(Sesja z 2026-09-17, po `/clear`. Rozszerzenie Chrome (`claude-in-chrome`) było rozłączone przez
większość sesji - część zmian nie została zweryfikowana wizualnie na żywo, tylko kodem/testami;
gdy się połączyło pod koniec, spot-check kolorów nagłówka i ograniczenia mapy wypadł dobrze.)*

---

## Faza 20 - Pierwszy prawdziwy model skanera + porządki Android/Mapa (2026-09-15)

Na prośbę użytkownika "zajmij się mapą i dodaj prawdziwy, 100% sprawny skaner" - dwa agenty
eksploracyjne + jeden planujący ustaliły, że skaner miał kompletny kod, ale zero wytrenowanego
modelu, oraz że Android miał dwa niezależne, nieudokumentowane bugi (brak `INTERNET`, brak
`onShowFileChooser`). Użytkownik świadomie wybrał: model TERAZ (filtr techniczny + trening, nie
pełna ręczna kuracja) oznaczony jako alpha, i self-hosted trening (nie Teachable Machine).

- [x] **Pierwszy model AI wgrany** - `scripts/prepare-dataset/sanity-filter.mjs` (dedupe/
      uszkodzone pliki, NIE kuracja merytoryczna) + `fetch-negative-images.mjs` (klasa `inne`)
      nad istniejącym zbiorem ~380 zdjęć z Wikimedia → 428 zdjęć/20 klas w `dataset/`. Trening
      (`train.py`, MobileNetV2, teraz też obsługuje opcjonalną klasę `inne` i zapisuje
      `metadata.json`) uruchomiony w kontenerze Docker (Windows nie ma koła binarnego dla
      `tensorflow-decision-forests` w ŻADNEJ wersji Pythona - zależność `tensorflowjs`, patrz
      `requirements.txt`). Wynik: 96.8% acc. treningowe, 69.4% walidacyjne (85 zdjęć) - spodziewany
      overfitting przy tak małym, nieskuratorowanym zbiorze. **Zweryfikowane end-to-end w Chrome**:
      zdjęcie borowika szlachetnego → 90% trafienie z ostrzeżeniem o borowiku szatańskim
      (lookalikes). UI dostał wzmocniony disclaimer "model alpha" (`IdentifyView.tsx`) i czytelną
      etykietę dla klasy `inne` zamiast surowego id (`PredictionCard.tsx`).
      Naprawiony przy okazji błąd w udokumentowanej komendzie `tensorflowjs_converter`
      (`--quantize_uint8` bez `=1` łyka ścieżkę wyjściową jako swoją wartość).
- [x] **Android - dwa niezależne, nieudokumentowane bugi naprawione, zweryfikowane na emulatorze
      (Pixel_4a)** - `AndroidManifest.xml` dostał `INTERNET`; `MainActivity.kt` dostał
      `onShowFileChooser`. **`onShowFileChooser` potwierdzone jako działające**: dotknięcie
      "Wybierz lub zrób zdjęcie" w "Rozpoznaj" realnie otwiera natywny picker zdjęć Androida.
      **`INTERNET` potwierdzone jako konieczne, ale w tym konkretnym środowisku niewystarczające**
      - po dodaniu WebView faktycznie próbuje się połączyć (wcześniej nie próbował wcale), ale
      TLS handshake do `maps.wikimedia.org` kończy się `ERR_CERT_AUTHORITY_INVALID` - ten sam
      lokalny MITM antywirusa, co już wcześniej udokumentowany dla Gradle/pip w tej sesji (zegar
      systemowy emulatora sprawdzony, poprawny - wyklucza błąd daty). To ograniczenie środowiska
      deweloperskiego, nie kodu. Przy okazji złapana i udokumentowana pułapka: `adb install -r`
      zachowuje Cache Storage/Service Worker, więc testowanie zmian w kodzie web na urządzeniu z
      wcześniejszą instalacją apki może pokazywać STARY, zcache'owany JS - wymaga
      `adb uninstall` przed instalacją przy weryfikacji zmian web.
- [x] **Mapa - domknięcie luk testowych z Fazy 19** - nowe testy `MapLayers`/`MapStatusBadges`/
      `MapToolbar` (dotąd pokryte tylko pośrednio przez smoke test) + nowe e2e specs (klik na
      mapie, przełącznik Mapa/Lista, eksport GPX). Przy okazji naprawiony realny problem w
      `vite.config.ts` (`server.host: true` - serwer dev słuchał tylko na `::1`, nie `127.0.0.1`).
- [x] **E2E naprawione i faktycznie zielone (4/4)** - nawigacja Chromium do `localhost` wisiała
      bez końca na tej maszynie mimo poprawnie odpowiadającego serwera (zweryfikowane `curl` na
      obu adresach) - `127.0.0.1` w `playwright.config.ts` naprawia to od razu. Po odblokowaniu
      e2e złapały **realny, wcześniej niewykryty bug**: `AddFindingForm.tsx` (zapis znaleziska +
      zdjęć w jednej transakcji Dexie, Faza 19) kończył się `TransactionInactiveError` w
      prawdziwej przeglądarce, bo kompresja zdjęć (`createImageBitmap`/`canvas.toBlob`) działa
      się wewnątrz transakcji - te operacje są prawdziwie asynchroniczne (poza mikrotaskami,
      które Dexie śledzi), więc natywna transakcja IndexedDB auto-commitowała się w trakcie
      oczekiwania. Niewidoczne w testach jednostkowych, bo `fake-indexeddb` nie wymusza tej
      ścisłości. Naprawione przez przeniesienie kompresji przed transakcję - dokładnie ten sam
      wzorzec, jaki już wcześniej istniał (i był udokumentowany komentarzem) w
      `JournalView.tsx`'s `handleSaveEdit`, tylko nie zastosowany konsekwentnie przy Fazie 19.
- Weryfikacja: `npx tsc -b`, `npx vitest run` (313/313) i `npm run build` zielone. Model
  end-to-end potwierdzony wizualnie w Chrome (opisane wyżej).
- **Do zrobienia dalej**: pełna ręczna kuracja zdjęć treningowych
  (`scripts/prepare-dataset/README.md`, 80-150/gatunek) żeby zastąpić model alpha czymś
  wiarygodniejszym; retest kafli mapy na Androidzie w środowisku bez lokalnego MITM antywirusa
  (kod i uprawnienia już poprawne, potwierdzony TLS handshake dociera do sieci - blokerem jest
  wyłącznie zaufanie do certyfikatu w tym konkretnym środowisku); realne urządzenie fizyczne
  (dotąd tylko emulator).

---

## Faza 19 - Poważna refaktoryzacja i rozbudowa widoku Mapy (2026-09-15)

Na wyraźną prośbę użytkownika ("zajmij się mapą na poważnie, zrób szczegółowy plan, użyj
najlepszych praktyk") - trzy równoległe audyty w tle (jakość kodu `MapView.tsx`, infrastruktura
GPS/baza/ROADMAP, wykonalność MapLibre GL JS) zsyntetyzowane w plan, zaakceptowany i
zrealizowany. Zweryfikowano też propozycję użytkownika przejścia na stack chmurowy
(MapTiler/PostGIS/Kindwise/Strapi/Vercel) - **odrzucona przez samego użytkownika** po pytaniu
wprost: zostajemy przy 100% offline/zero kluczy API (patrz nagłówek tego pliku).

- [x] **Decyzja: MapLibre GL JS NIE teraz** - dedykowany research (nie ogólniki): wektor w pełni
      offline bez klucza to zmierzone (nie szacowane) **1,4 GB** dla samej Polski (Shortbread/
      PMTiles, dane BBBike.org) + otwarty, znany bug przeglądarek z cache'owaniem Range requestów
      do PMTiles (protomaps/PMTiles#272) - Workbox nie da offline "za darmo" jak dziś dla PNG.
      Raster przez MapLibre (te same kafle) wymaga WebGL2 (obowiązkowe od MapLibre v6, lipiec
      2026) - Android WebView (własny wrapper w `android/`, nie zwykła przeglądarka) ma
      udokumentowaną historię poważnych bugów WebGL2 na GPU Mali/Adreno, dominujących w tanich
      telefonach. Leaflet zostaje; wracamy do tematu tylko przy konkretnej potrzebie wektorowego
      stylowania danych (nie "dla zasady").
- [x] **Architektura `MapView.tsx`** - z 523-liniowego komponentu-boga (9 `useState`, 3
      niezależne boolean-y widoczności arkuszy mogące teoretycznie kolidować) do kompozycji
      ~200 linii: `useMapGeolocation`/`useReturnPointTracking` (hooki, zero JSX, testowalne bez
      Leaflet), `MapLayers.tsx` (komponenty zależne od `useMap()`), `MapStatusBadges.tsx`/
      `MapOverlayMessages.tsx`/`MapToolbar.tsx` (czysto prezentacyjne). 3 boolean-y zastąpione
      jednym `type ActiveSheet = 'add-finding' | 'offline-download' | 'spots' | null`.
- [x] **Wydajność** - naprawiony O(n²) przy renderze pojedynczych znalezisk (`Map<id,Finding>`
      zamiast `findings.find()` w pętli klastrów), cache ikony klastra (analogicznie do już
      istniejącego cache'u `findingMarkerIconFor`), stabilne referencje callbacków
      (`MapInstanceCapture`), `React.memo` na `FindingMarkers`. Code-splitting: wszystkie 4
      widoki (`App.tsx`) lazy-loadowane przez `React.lazy`/`Suspense` - główny bundle spadł z
      ~1,5 MB do ~294 KB (94,64 KB gzip), Leaflet/Mapa ląduje tylko przy otwarciu zakładki.
- [x] **Odporność na błędy** - `useMapGeolocation` oznacza pozycję jako nieaktualną
      (`isPositionStale`) po >20s bez aktualizacji GPS (marker przygasza się zamiast milcząco
      pokazywać starą pozycję jako aktualną); `tileLoadIssue` czyści się automatycznie po
      udanym `tileload`, nie tylko ręcznym "Rozumiem"; `OfflineAreaDownload` dostał realne
      anulowanie (`AbortController`, dotąd niepodłączony mimo wsparcia w
      `offlineMapTiles.ts`) i "Ponów nieudane" (`downloadTilesForOfflineUse` zwraca teraz
      konkretną listę `failedTiles`, nie tylko licznik); `AddFindingForm` zapisuje znalezisko +
      zdjęcia w jednej transakcji Dexie (`db.transaction('rw', ...)`) - naprawia możliwe
      "osierocone" znalezisko bez zdjęć przy błędzie w połowie zapisu.
- [x] **Dostępność** - markery (`L.divIcon`) dostały `role="img"`/`aria-label` (opisy generyczne
      wg jadalności/typu miejsca, nie per-gatunek - zachowuje istniejący cache ikon w całości).
      Nowy przełącznik Mapa/Lista (`FindingsListView.tsx`) - alternatywa tekstowa dla osób
      niekorzystających z mapy wzrokowo, przydatna też w pełnym słońcu w terenie. Korekta
      wcześniejszej hipotezy: `Alert` już ma `role="alert"` (`components/ui/alert.tsx`) -
      błędy GPS/kafli SĄ ogłaszane czytnikom ekranu, to nie była realna luka.
- [x] **Testy** - `vitest.setup.ts` dostał mock `ResizeObserver` (Leaflet tego potrzebuje do
      inicjalizacji `MapContainer` w jsdom) + polyfill `Element.prototype.animate`
      (potrzebny pośrednio, auto-animate zaczęło go faktycznie wywoływać po dodaniu
      ResizeObserver) - pierwszy raz w historii projektu możliwe stało się renderowanie
      `<MapView />` w teście. Nowe testy: `useMapGeolocation`, `useReturnPointTracking`,
      cache ikon (`mapMarkerIcons.test.ts`), priorytet komunikatów (`MapOverlayMessages.test.tsx`),
      smoke test `MapView.test.tsx` - **ten ostatni złapał realny bug** (`mapRef` zostawał ze
      zniszczoną instancją Leaflet po przełączeniu na widok-listę, crashując
      `OfflineAreaDownload` przy odczycie środka mapy) naprawiony tym samym cyklem.
- [x] **Eksport GPX** - zaplanowany w Fazie 9, dotąd niezrobiony. `utils/gpxExport.ts`,
      generuje waypointy GPX 1.1 ze znalezisk z lokalizacją, nowy wpis w menu eksportu
      `JournalView.tsx` obok PDF/JSON. Czysto lokalna funkcja, zero sieci.
- `npx tsc -b`, `npx vitest run` (286/286), `npm run build` - zielone. Wizualnie w Chrome:
  markery z kolorami jadalności, dark-mode kafli, przełącznik Mapa/Lista, menu narzędzi,
  komunikat błędu lokalizacji z przyciskiem "Rozumiem" (bez nakładania na podpowiedź) -
  potwierdzone na żywo.

---

## Faza 18 - Animowany nagłówek + pierwszy przebieg polish mapy (2026-09-15)

Na prośbę "jak jeszcze odpicować UI" - animowany nagłówek z nazwą lokalizacji, plus pierwszy,
lżejszy przebieg poprawek mapy (przed właściwą Fazą 19 "na poważnie" niżej).

- [x] **Animowany nagłówek** - nowy `AnimatedHeaderTitle.tsx`: litery "Grzybobranie" wskakują
      pojedynczo przy starcie (spring, stagger), pod spodem wjeżdża podpis lokalizacji
      ("NIEBUSZEWO"), cykliczny subtelny połysk (gradient sweep) na tytule. Renderuje się raz
      przy montowaniu `App.tsx`, nie przy każdej zmianie zakładki.
- [x] **Tryb ciemny - paleta z domieszką zieleni** - `.dark` w `index.css` miało czysto
      achromatyczne (chroma=0) tło/kartę/popover, identyczne z domyślnym motywem shadcn, zero
      związku z tematem lasu. Dodano delikatny odcień (hue 155°, rodzina `--primary`) bez zmiany
      jasności - kontrast WCAG bez zmian.
- [x] **Markery znalezisk kolorowane wg jadalności** - `mapMarkerIconFor` w
      `mapMarkerIcons.tsx` reużywa `edibilityChartColor` (ta sama skala co `EdibilityBadge`)
      zamiast jednego stałego koloru pinezki.
- [x] **Naprawa nakładania komunikatów na mapie** - błąd lokalizacji/kafli i podpowiedź
      "Stuknij na mapie" mogły być widoczne jednocześnie w tym samym rogu - teraz błąd zawsze
      wygrywa (podpowiedź wraca po jego ustąpieniu), dodany przycisk zamknięcia błędu lokalizacji.
- [x] **Tint kafli mapy pod markę** - CSS `filter` na `.leaflet-tile-pane` (light + `.dark`,
      ta druga jako klasyczny invert-trick) zamiast zmiany dostawcy kafli - zero wpływu na
      Workbox runtime caching (cache'owany jest niezmieniony plik PNG).
- [x] Widok "Rozpoznaj" (`IdentifyView.tsx`) - dodany `w-full` do kontenera, spójne z
      responsywnym wzorcem reszty widoków z Fazy 17.
- `npx tsc -b`, `npx vitest run`, `npm run build` - zielone. Zweryfikowane wizualnie w Chrome
  (jasny/ciemny motyw) - w przeciwieństwie do Faz 13-17, live-test tym razem był dostępny.

---

## Faza 17 - Plan layoutu + widoczniejsze Narzędzia (2026-09-14)

Na wprost postawione pytanie użytkownika "jak jeszcze upiększyć layout" - audyt struktury (nie
tylko kolorów/ikon/ruchu jak w Fazach 14-16) ujawnił realną lukę: cała apka jednokolumnowa,
ograniczona do `max-w-2xl`/`max-w-md` (szerokość telefonu) NIEZALEŻNIE od szerokości ekranu -
zero breakpointów `md:`/`lg:` w którymkolwiek widoku. Plan (5 punktów) + osobna, wyraźna prośba
użytkownika o widoczniejszy przycisk/menu Narzędzia, zrealizowane po kolei, każdy krok
zweryfikowany osobno.

- [x] **0/5 - widoczniejszy przycisk Narzędzia + przebudowa menu** (na wyraźną prośbę
      użytkownika) - `App.tsx`: przycisk dostaje stałe tło/obwódkę (nie tylko hover) i pełną
      nieprzezroczystość, wyraźnie odróżniając się od kosmetycznego `ThemeToggle` obok.
      `ToolsMenu.tsx`: 5 narzędzi pogrupowanych w 3 sekcje ("Bezpieczeństwo w terenie",
      "Przygotowanie", "Aplikacja"), krótki tytuł + podtytuł zamiast jednego długiego zdania,
      ikona w kolorowej odznadce wg charakteru narzędzia.
- [x] **1/5 - responsywna siatka kart** - `EncyclopediaView.tsx`/`JournalView.tsx`: kontener
      rośnie `md:max-w-4xl lg:max-w-6xl`, lista kart z `flex flex-col` na
      `grid md:grid-cols-2 lg:grid-cols-3`. Puste stany i karta w trybie edycji (formularz)
      dostają `md:col-span-2 lg:col-span-3` - rozpięte na całą szerokość niezależnie od kolumny.
- [x] **2/5 - podsumowanie wyprawy jako kafle liczb** - `src/components/StatTiles.tsx`
      (`StatTile`/`StatTileRow`, ten sam wzorzec co wskaźniki na mapie) zamiast zdania
      "12 znalezisk · 5 gatunków · 2.3 kg" rozdzielanego kropkami - w `JournalView.tsx`
      (podsumowanie wybranej wyprawy) i `TripManager.tsx` (aktywna wyprawa).
- [x] **3/5 - Grzybowiska jako boczny panel na szerokim ekranie** - nowy
      `src/hooks/useMediaQuery.ts` (do decyzji layoutu w JS, których nie da się wyrazić samym
      Tailwindem) + `SpotManager.tsx`: na `lg:+` `swipeDirection="right"` zamiast domyślnego
      "down" - lista grzybowisk wysuwa się z prawej obok mapy zamiast arkusza z dołu
      najeżdżającego na widok (Drawer/Base UI już miał gotową obsługę osi X, to podłączenie
      istniejącej funkcji, nie nowa implementacja od zera). Telefon bez zmian.
      Przy okazji: globalny mock `matchMedia` w `vitest.setup.ts` (jsdom go nie implementuje,
      trzeci konsument - `useMediaQuery` - był dobrym progiem, żeby przenieść go ze
      zdublowanych mocków lokalnych w `ThemeToggle.test.tsx`/`StorageInfoDrawer.test.tsx`).
- **Świadomie pominięte - 4/5, karta gatunku dwukolumnowa (zdjęcie obok tekstu)** - koliduje z
  punktem 1/5: po wprowadzeniu siatki 2-3 kolumn każda karta jest węższa niż telefon (ok. 1/3
  szerokości kontenera na `lg:`), więc układ zdjęcie-obok-tekstu wewnątrz karty wyglądałby
  ciasno i zaprzeczał sensowi samej siatki (więcej widocznych kart naraz). Grid z punktu 1/5
  jest lepszym, spójnym rozwiązaniem "wykorzystania szerokiego ekranu" niż wewnętrzny
  dwukolumnowy layout pojedynczej karty.
- **5/5 - porządek odstępów** - przegląd rytmu pionowego (nagłówki, listy, pływające plakietki
  na mapie) w głównych widokach - już spójny z poprzednich faz (`gap-4` sekcje, `gap-3` karty,
  `gap-2` plakietki, `mt-1` podpisy), bez realnej niespójności wartej osobnej poprawki.
- Live-test w przeglądarce niedostępny przez całą sesję (brak połączonego rozszerzenia Chrome) -
  jak w Fazach 14-16, wszystkie kroki zweryfikowane typecheckiem/testami/buildem, nie wizualnie.
  Szczególnie warte potwierdzenia na żywo: zachowanie siatki kart i panelu Grzybowisk przy
  zmianie szerokości okna.

---

## Faza 16 - Dalsze upiększanie UI/grafiki (2026-09-14)

Kontynuacja po Fazie 15, na wprost postawione pytanie użytkownika "jak jeszcze upiększyć UI i
grafikę" - 5 propozycji, zrealizowanych po kolei, każda zweryfikowana osobno (`tsc -b`,
`vitest run` 261/261, `npm run build`).

- [x] **1/5 - winieta zdjęcia gatunku** - `EncyclopediaView.tsx`: delikatny gradient u dołu
      zdjęcia, tonowany kolorem jadalności (`edibilityChartColor`, `color-mix` w oklab) - łączy
      fotografię z systemem kolorów bezpieczeństwa (Faza 14, Plan B) zamiast być oderwaną
      dekoracją, daje zdjęciu głębi zamiast płaskiego `object-cover`.
- [x] **2/5 - skeleton "shimmer" tonowany zielenią marki** - `.skeleton-shimmer` w `index.css`
      (przesuwający się pasek światła, `color-mix` z `--color-primary`, respektujący
      `prefers-reduced-motion` osobną media query) zamiast płaskiego `animate-pulse bg-muted` -
      jedna zmiana w `ui/skeleton.tsx` obejmuje automatycznie każde użycie (mapa, dziennik,
      miniatury zdjęć).
- [x] **3/5 - branding eksportu PDF** - `pdfExport.ts`: pasek nagłówka w kolorze `--primary` +
      mała odznaka grzyba w `--brand-accent` + nazwa "Grzybobranie", linia-separator w kolorze
      bursztynowym zamiast neutralnego szarego. Dotąd eksport był czysto tekstowym dokumentem
      nieodróżnialnym od dowolnego innego PDF-a.
- [x] **4/5 - scrollbar dostosowany do palety** - `index.css`: cienki, stonowany suwak w
      `--color-border`, ciemniejący do `--color-primary` przy najechaniu (Firefox
      `scrollbar-color` + webkit `::-webkit-scrollbar*`) - dotyczy głównie desktopu/web.
- [x] **5/5 - elewacja kart przy hover (desktop)** - `JournalView.tsx`/`EncyclopediaView.tsx`:
      `hover:shadow-md hover:shadow-primary/15` na kartach list, celowo BEZ transform/translate
      (Card jest dzieckiem `useAutoAnimate`, który pozycjonuje elementy przez transform - osobny
      transform z hover kolidowałby z tym mechanizmem, ten sam powód co whileTap na wewnętrznym
      `motion.div` zamiast na `Card` z Fazy 12).
- Live-test w przeglądarce niedostępny przez całą sesję (brak połączonego rozszerzenia Chrome) -
  jak w Fazach 14-15, wszystkie kroki zweryfikowane typecheckiem/testami/buildem, nie wizualnie.

---

## Faza 15 - Plan designu po drugim audycie `frontend-expert` (2026-09-14)

Po Fazie 14 użytkownik zlecił kolejny audyt (agent `frontend-expert`, bez zmian w kodzie) -
sanity-check tego, co właśnie zrobiono (bo bez podłączonej przeglądarki nic nie było
zweryfikowane wizualnie) plus propozycja nowego gruntu do dopracowania. Audyt złapał jeden
realny problem i zaproponował 5 kolejnych kroków, zrealizowanych po kolei w tej sesji, każdy
zweryfikowany osobno (`tsc -b`, `vitest run` 261/261, `npm run build`).

- [x] **1/5 - kolizja koloru sezonu i jadalności** - audyt złapał, że paleta kropki sezonu z
      Fazy 14 (`sky/lime/yellow/orange`) dzieliła `yellow-500`/`orange-500` dokładnie z
      `warunkowo-jadalny`/`trujący` w `CARD_ACCENT` (`EdibilityBadge.tsx`) - na karcie trującego
      gatunku jesienią oba sygnały zlewały się w jedno "pomarańczowe". `seasonFilter.ts`:
      nowa paleta `sky/teal/cyan/violet`, jednoznacznie odrębna od zielono-żółto-pomarańczowo-
      -czerwonej skali bezpieczeństwa.
- [x] **2/5 - ikona grupy morfologicznej przy nazwie gatunku** - `src/utils/speciesShape.ts`
      (statyczna mapa id -> kształt: rurkowy/blaszkowy/lejkowaty/siodłowy/kulisty, 19/19
      gatunków wg realnej morfologii) + `src/components/icons/speciesShapeIcons.tsx` (sylwetki w
      stylu Logo, celowo MONOCHROMATYCZNE - trzeci sygnał na karcie obok koloru jadalności i
      sezonu, więc bez własnej barwy). Realny sygnał identyfikacji (kształt/spód kapelusza),
      nie dekoracja - choć, w odróżnieniu od pierwotnej sugestii audytu, wszystkie 19 gatunków
      ma już zdjęcie, więc to dodatkowy stały sygnał obok zdjęcia, nie fallback przy jego braku.
- [x] **3/5 - marka w focus ringach i wyskakujących oknach** - `--ring` w `index.css` zmieniony
      z neutralnego szarego na zieleń marki (jedna zmiana tokenu obejmuje każdy focus-visible
      ring w apce). Tekstura papieru (`body`, dotąd tylko tło strony) wydzielona do zmiennej
      `--paper-grain` + klasa `.paper-grain-surface`, nałożona też na `DialogContent`/
      `DrawerContent` - dialogi/drawery przestają być "gołym" shadcn bez śladu reszty apki.
- [x] **4/5 - mikrointerakcje na momentach "nagrody"** - `AddFindingForm.tsx`: `toast.success()`
      po zapisie znaleziska (dotąd cichy). `PredictionCard.tsx`: najlepsze dopasowanie (#1)
      dostaje jednorazowy spring "pop" wejścia + obwódkę `ring-primary/40`, odróżniającą
      odpowiedź od reszty listy kandydatów.
- [x] **5/5 - czytelność treści bezpieczeństwa** - `FirstAidGuide.tsx` (kroki pierwszej pomocy)
      i `EncyclopediaView.tsx` (opis gatunku, `preparationTips` - np. ostrzeżenia o gotowaniu
      smardza/piestrzenicy) z `text-xs`/`text-muted-foreground` na większy, czytelniejszy tekst
      (`text-sm`/`text-base`, wyższy kontrast, `leading-relaxed`) - to instrukcje czytane w
      stresie/słabym świetle lasu, czytelność jest tu funkcją bezpieczeństwa, nie estetyki.
- Live-test w przeglądarce niedostępny przez całą sesję (brak połączonego rozszerzenia Chrome) -
  jak w Fazie 14, wszystkie kroki zweryfikowane typecheckiem/testami/buildem, nie wizualnie.

---

## Faza 14 - Plan designu po audycie `frontend-expert` (2026-09-14)

Po Fazie 13 użytkownik zlecił świeży audyt UI (agent `frontend-expert`, bez zmian w kodzie) pod
kątem miejsc, które nadal czują się generyczne/szablonowe mimo dotychczasowego polerowania, i
niewykorzystanych motywów specyficznych dla grzybobrania. Audyt + skill `frontend-design`
złożyły się na plan (A-F), zrealizowany krok po kroku w tej sesji, każdy krok zweryfikowany
osobno (`tsc -b`, pełny `vitest run` 261/261, `npm run build`).

- [x] **Plan A - własny system ikon** zamiast emoji w divIcon i domyślnej niebieskiej pinezki
      Leaflet - `src/components/icons/mapMarkerIcons.tsx` (markery mapy w stylu `Logo.tsx`: auto,
      grzybowisko, znalezisko z własnym mini-glifem kapelusza, wybrane-nowe-miejsce z przerywaną
      obwódką "do potwierdzenia", pozycja użytkownika jako pulsująca kropka - celowo NIE pin, bo
      to nie miejsce tylko "Ty teraz") i `src/components/icons/illustrations.tsx` (ilustracje
      pustych stanów/dropzone: pusty koszyk w Dzienniku, lupa nad gasnącym grzybem w Bazie
      wiedzy, aparat z grzybem w "Rozpoznaj" - zamiast gołych ikon lucide).
- [x] **Plan F - twarde kolory -> tokeny, globalna blokada ruchu** - fundament pod B/C. Rdzeń
      problemu: `ui/alert.tsx` (warianty `destructive-soft`/`warning`, dzielony komponent shadcn)
      miał twardo wpisane `red-300/50/900`/`amber-300/50/900` zamiast `--destructive`/
      `--brand-accent` - nie adaptowały się w dark mode. Naprawione tam + we wszystkich lokalnych
      nadpisaniach tego błędu (`EncyclopediaView`, `JournalView`, `ConsumptionTracker`,
      `SpotManager`, `FirstAidGuide`). Świadomie NIE ruszone: `badge.tsx`
      success/warning/caution/destructive-solid (celowa, ustalona skala jadalności, nie
      przypadkowy dług) i `var(--color-amber-700)` w Logo/illustrations (stały kolor ilustracji
      płaskiej, nie token UI). `src/main.tsx`: `MotionConfig reducedMotion="user"` (`motion/react`)
      obejmujący całą apkę - wszystkie animacje respektują systemowe "ogranicz ruch" z jednego
      miejsca.
- [x] **Plan B - jadalność jako struktura, nie tylko plakietka** - `EdibilityBadge.tsx`:
      `edibilityCardAccentClass()`/`edibilityChartColor()` (ta sama 4-stopniowa skala co
      dotychczasowa plakietka). Karty w `EncyclopediaView.tsx` dostają kolorowy lewy pasek +
      odcień tła wg jadalności - bezpieczeństwo widoczne przy skanowaniu listy, nie dopiero po
      przeczytaniu małej plakietki. Wykres w `JournalView.tsx`: słupki kolorowane per gatunek wg
      jadalności (`Cell` z recharts) zamiast płaskiego zielonego - pokazuje od razu strukturę
      bezpieczeństwa sezonu, nie tylko liczbę zbiorów.
- [x] **Plan C - sezon zawsze widoczny** - `seasonFilter.ts`: `getSeasonDotClass()`
      (meteorologiczna pora roku, uproszczona z miesiąca startowego zakresu, kolor kropki).
      Realna luka UX, nie tylko dekoracja: filtr "W sezonie" w nagłówku Bazy wiedzy już
      istniał, ale sprawdzenie czy KONKRETNY gatunek jest w sezonie wymagało rozwinięcia każdej
      karty osobno - sezon przeniesiony na stałe, widoczne miejsce karty (kropka + tekst zakresu +
      "w sezonie teraz" gdy aktualne), zduplikowany tekst usunięty z wnętrza `Collapsible`.
- [x] **Plan E - nagłówek wykorzystuje bursztynowy akcent** - `App.tsx`: gradient
      `from-primary via-primary to-brand-accent/70` (diagonalny) zamiast prawie niewidocznego
      `from-primary to-primary/90` - drugi akcent marki (dotąd głównie w Logo/cieniach kart)
      trafia do nagłówka. Opacity/70 na końcu (nie pełny amber) - konserwatywny dobór kontrastu
      tekstu w dark mode bez live-testu, wart potwierdzenia wizualnego przy najbliższej okazji.
- **Świadomie NIE w tym planie:** stylowanie/tintowanie kafelków mapy OSM (kruche, zależne od
  zewnętrznego dostawcy, niska korzyść względem reszty), zmiana fontu Geist (dobrze działa jako
  czytelna czcionka UI w gęstych widokach, ryzyko regresji większe niż korzyść z "charakteru").
- Live-test w przeglądarce niedostępny przez całą sesję (brak połączonego rozszerzenia Chrome) -
  wszystkie kroki zweryfikowane typecheckiem/testami/buildem, nie wizualnie. Wart potwierdzenia
  na żywo przy najbliższej okazji, zwłaszcza kontrast nagłówka (Plan E) i wygląd markerów mapy
  (Plan A) w obu motywach.

---

## Faza 13 - Ciągłe dopracowywanie UI (2026-09-14)

Po domknięciu Fazy 12 - dalsze przejście po ekranach na wyraźną prośbę użytkownika ("użyj
najlepszych bibliotek UI i najlepszych technik"). Dwa nowe komponenty shadcn/ui (na bazie
`@base-ui/react`, spójne z resztą stosu) dodane przez `npx shadcn add`, nie pisane ręcznie.

- [x] **Drag & drop w "Rozpoznaj"** - `IdentifyView.tsx`: strefa wyboru zdjęcia miała wygląd
      dropzone'y (przerywana ramka) ale obsługiwała tylko klik - myląca afordancja na
      desktopie/tablecie z myszą. Dodano `onDragOver`/`onDrop` z wizualnym stanem najechania.
- [x] **Speed-dial FAB na mapie** - `MapView.tsx`: 6 osobnych, pełnych przycisków spiętrzonych w
      prawym dolnym rogu ("Pobierz obszar offline", "Grzybowiska", "Auto", "Zlokalizuj mnie",
      "SMS", "Dodaj znalezisko") skonsolidowane - dwie najczęstsze akcje (Zlokalizuj/Dodaj)
      zostają jako stałe przyciski-ikony, reszta (okazjonalna) przeniesiona do `DropdownMenu`
      (nowy komponent shadcn, Base UI Menu) pod ikoną ⋮.
- [x] **Menu eksportu/importu w Dzienniku** - `JournalView.tsx`: "Eksportuj"/"Importuj"/"PDF" (3
      przyciski w nagłówku obok tytułu) skonsolidowane w to samo `DropdownMenu` pod ikoną ⋮ - to
      akcje okazjonalne (backup/udostępnianie), nie potrzebują stałego miejsca w nagłówku.
- [x] **Theming wykresu pod dark mode** - `JournalView.tsx`: tooltip/osie `recharts` renderowały
      się na twardo zakodowanym białym tle niezależnie od motywu (łamane w dark mode) - podpięte
      pod tokeny `--color-popover`/`--color-muted-foreground`/`--color-border`.
- [x] **Progresywne odkrywanie treści w Bazie wiedzy** - `EncyclopediaView.tsx`: każda z 19 kart
      gatunków pokazywała od razu pełny opis, siedlisko, sobowtóry i porady kulinarne - długa
      ściana tekstu utrudniająca skanowanie listy wzrokiem. Opis/siedlisko/sobowtóry/przepisy
      domknięte domyślnie za przyciskiem "Szczegóły" (nowy komponent shadcn `Collapsible`, Base UI
      Collapsible). Jadalność i ostrzeżenie o ochronie prawnej (bezpieczeństwo/legalność, nie
      ciekawostka) zostają zawsze widoczne, NAD zwijaną sekcją.
- Zweryfikowane: `tsc -b` czysty, 261/261 testów (2 zaktualizowane pod nowe menu/collapsible w
  DOM), build produkcyjny przechodzi. Live-test w przeglądarce niedostępny w tej sesji (brak
  połączonego rozszerzenia Chrome) - zmiany zweryfikowane przez testy komponentów i przegląd kodu,
  nie manualnie w przeglądarce.

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

**Średni — ✅ wszystkie zrobione (2026-09-14):**
1. ~~Martwy kod dark mode~~ - użytkownik zdecydował: dokończyć. `ThemeProvider` (`next-themes`,
   `attribute="class"`) owija apkę w `main.tsx`, `ThemeToggle.tsx` (ikona Słońce/Księżyc w
   nagłówku) przełącza `light`/`dark`. Tokeny `.dark` w `index.css` już istniały (Faza 6/7).
2. ~~Brak ostrzeżenia przed duplikatami przy podwójnym imporcie~~ - `countLikelyDuplicates()` w
   `exportImport.ts` porównuje sygnatury znalezisk z pliku z już zapisanymi; `JournalView.tsx`
   pokazuje `AlertDialog` z potwierdzeniem przed importem, gdy wykryje dopasowania.
3. ~~Brak testów na scenariusze błędów~~ - dodano pokrycie błędu czyszczenia cache w
   `StorageInfoDrawer` (wcześniej nieobsłużony wyjątek bez feedbacku dla użytkownika).
4. ~~`useLiveQuery(() => db.findings.toArray())` bez limitu~~ - `JournalView.tsx` pobiera listę
   stronami (`PAGE_SIZE = 100`, przycisk "Załaduj więcej"); ostrzeżenie o ciężkiej reakcji i
   wykrywanie nakładających się spożyć celowo NIE są objęte limitem (osobne, indeksowane
   zapytanie po `reactionSeverity` - nowy indeks w `db.ts` wersja 3) - to alert bezpieczeństwa,
   musi widzieć całą historię.
5. ~~`AddFindingForm` pozwalał tylko na 1 zdjęcie~~ - `input type="file" multiple`, zapisuje
   wszystkie wybrane zdjęcia do `db.photos`. `FindingThumbnail.tsx` przebudowany na galerię:
   miniatura z odznaką "+N", lightbox z nawigacją strzałkami między zdjęciami.
6. ~~Drobne braki a11y~~ - wszystkie surowe `<button>` w kodzie mają teraz `type="button"` i
   widoczny `focus-visible:ring` (`App.tsx`, `JournalView.tsx`, `FindingThumbnail.tsx`).
7. ~~Panel "Pamięć i dane" mieszał liczbę plików z rozmiarem~~ - `getCacheInfo()` liczy teraz
   też `sizeBytes` per cache (z nagłówka `content-length`, fallback do odczytu bloba), UI pokazuje
   "N plików · X MB" jako osobne, opisane wartości zamiast samej liczby wpisów.

**Niskie — ✅ zrobione:** `shadcn` (CLI) przeniesiony z `dependencies` do `devDependencies`
(używany tylko przy imporcie CSS w build-time, nie w runtime przeglądarki).

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
- [x] **GBIF occurrence search** (country=PL) - dokończone dla wszystkich 19/19 gatunków
      (2026-09-14, zapytania rozłożone w czasie żeby uniknąć wcześniejszego rate-limitu). Każdy
      gatunek ma realne, zgłoszone obserwacje w Polsce - żaden wynik nie jest zerowy/podejrzanie
      niski, więc dane w `species.json` nie są zmyślone/nietypowe dla polskich lasów:
      Borowik szlachetny 1294 · Goryczak żółciowy 348 · Muchomor sromotnikowy 329 ·
      Muchomor jadowity 65 · Czubajka kania 1006 · Muchomor czerwony 3041 · Maślak zwyczajny 296 ·
      Pieprznik jadalny 682 · Borowik szatański 56 · Gąska zielonka 101 · Lisówka pomarańczowa 432 ·
      Podgrzybek brunatny 1267 · Koźlarz babka 394 · Opieńka miodowa 252 · Hełmówka jadowita 92 ·
      Smardz jadalny 341 · Piestrzenica kasztanowata 283 · Krowiak podwinięty 716 ·
      Purchawka olbrzymia 301 rekordów.
- [x] **Wikipedia PL** - wcześniejsza częściowa weryfikacja (10/19, sesja 2026-09-13) potwierdziła
      zgodność polskich nazw zwyczajowych z artykułami Wikipedii, w tym krzyżowo zmianę nazwy
      borowika szatańskiego na "Krwistoborowik szatański" (spójne z korektą GBIF wyżej). Pozostałe
      9 nie doczekało osobnego przebiegu Wikipedii w tej sesji - GBIF occurrence (wyżej) już
      potwierdza, że wszystkie gatunki są realne i obecne w Polsce; dodatkowe potwierdzenie nazw
      zwyczajowych przez Wikipedię dla pozostałych 9 zostaje jako zadanie opcjonalne, nieblokujące.
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

**Poprawka infrastruktury GPS (2026-09-14, na wyraźną prośbę użytkownika):** `getCurrentPosition()`
(pojedynczy odczyt, wciąż używany do edycji lokalizacji/zapisu grzybowiska) zastąpiony w
`MapView.tsx` przez nowy `watchPosition()` z `utils/geolocation.ts` - ciągłe śledzenie pozycji
(natywne `navigator.geolocation.watchPosition`, nie ma lepszej "biblioteki" niż ta - to jedyny
realny silnik GPS w przeglądarce). Pierwszy odczyt z odbiornika bywa niedokładny (zimny start),
kolejne z tego samego strumienia szybko się poprawiają - użytkownik w ruchu (np. wracając przez
las) widzi aktualizującą się pozycję bez ręcznego odświeżania. Dodano: koło dokładności GPS na
mapie (promień = `accuracy` z przeglądarki), wyśrodkowanie mapy tylko przy pierwszym odczycie
(kolejne aktualizacje nie szarpią widokiem, gdy użytkownik przegląda mapę), sprzątanie
(`clearWatch`) przy odmontowaniu. 9 nowych testów jednostkowych (`geolocation.test.ts`).
Zweryfikowane live w przeglądarce: poprawny komunikat przy braku zgody na lokalizację, brak
błędów w konsoli.

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
- [x] Kompas/GPS "Gdzie jest auto" (2026-09-14) - `returnPoint` w `appStore.ts` (już
      wyeksponowany, tylko niepodpięty), przycisk "Zapisz/Zaktualizuj pozycję auta" w
      `MapView.tsx`, plakietka z dystansem+kierunkiem (`utils/bearing.ts`) i przyciskiem usuwania,
      marker 🚗 na mapie. Czysto z lokalnego GPS, zero API.
- [x] Osobiste "Grzybowiska" (2026-09-14) - nowa tabela `spots` (db.ts wersja 4, `Spot` w
      schema.ts) i pole `Finding.spotId` (niezależne od `tripId` - jedna wyprawa może dotknąć
      kilku grzybowisk). `SpotManager.tsx` (drawer z `MapView.tsx`, przycisk "Grzybowiska"):
      zapis nazwanego miejsca (wybrana pinezka lub GPS), lista z `spotStats.ts` (liczba
      znalezisk/różnorodność gatunków/data ostatniej wizyty), usuwanie (znaleziska zostają,
      tracą tylko powiązanie). Marker 📍 na mapie. `AddFindingForm.tsx` pozwala opcjonalnie
      przypisać nowe znalezisko do istniejącego grzybowiska.
- [x] Dedykowany ekran "Porównywarka" (2026-09-14) - `SpeciesComparator.tsx` (Dialog), przycisk
      "Porównaj" przy każdym sobowtórze w `LookalikesWarning.tsx`. Dwie kolumny side-by-side:
      zdjęcie, nazwa, plakietka jadalności, siedlisko, sezon, pełny opis rozpoznawania - zamiast
      nowej, ręcznie kuratorowanej treści "różnic" (ryzyko błędu przy treści bezpieczeństwa),
      wykorzystuje już zweryfikowane dane z `species.json` w czytelnym układzie porównawczym.
- [x] Waga/ilość w statystykach zbiorów (2026-09-14) - `Finding.weightGrams` (opcjonalne, bez
      migracji indeksu - niequerowane pole). Pole wagi w `AddFindingForm.tsx` i edycji w
      `JournalView.tsx`, `sumWeightGrams()`/`formatWeight()` w `tripStats.ts`, suma widoczna w
      podsumowaniu aktywnej wyprawy (`TripManager.tsx`) i filtrowanej wyprawy (`JournalView.tsx`).
- [x] Przepisy kulinarne i porady dot. czyszczenia/suszenia (2026-09-14) - nowe pole
      `Species.preparationTips` (schema.ts, opcjonalne, tylko gatunki jadalne/warunkowo-jadalne -
      9/19), wypełnione dla wszystkich odpowiednich gatunków: czyszczenie, suszenie/mrożenie,
      sugestia przyrządzenia (zwięzłe porady, nie pełne przepisy z miarami - to atlas, nie
      książka kucharska). Sekcja w karcie gatunku w `EncyclopediaView.tsx`. Łączy się z pokrewnym
      punktem "info o suszeniu/mrożeniu/gotowaniu" z trzeciej listy niżej - zrobione razem.
- [x] Krótki przewodnik pierwszej pomocy przy podejrzeniu zatrucia (2026-09-14) -
      `data/firstAid.ts` (statyczna treść: 6 kroków + zastrzeżenie, spójna z istniejącym
      ostrzeżeniem w `JournalView.tsx` - 112/Centrum Ostrych Zatruć, zachowanie resztek grzybów,
      "fałszywa poprawa" przy zatruciu amatoksynami). `FirstAidGuide.tsx` (Dialog) dostępny z
      ikony w nagłówku apki (każdy ekran) oraz jako link w istniejącym alercie o ciężkiej
      reakcji w Dzienniku.
- [x] Oznaczenie gatunków chronionych prawem (2026-09-14) - `Species.legalProtection` (opcjonalne,
      niezależne od `edibility`). Zweryfikowane źródłowo (Wikipedia PL) dla wszystkich 19 gatunków:
      **borowik szatański** - ochrona ścisła (krytycznie zagrożony, zakaz zrywania nawet w celu
      identyfikacji - i tak trujący); **smardz jadalny** - ochrona częściowa od 2014 r. (zbiór w
      stanie dzikim zabroniony, dozwolony tylko z upraw/ogrodów). Sprawdzone i potwierdzone jako
      NIEchronione: purchawka olbrzymia (wykreślona z listy w 2014), gąska zielonka (tylko
      Czerwona Lista, dopuszczona do obrotu), piestrzenica kasztanowata, muchomor jadowity.
      Odznaka "Chroniony" przy nazwie + ostrzeżenie (`Alert`) w `EncyclopediaView.tsx`.
- [x] Przycisk "Wyślij SMS z lokalizacją" (2026-09-14) - `utils/locationSms.ts`
      (`buildLocationSmsUrl`), natywny URI `sms:?body=...` (`sms:&body=...` na iOS - różnica
      w zachowaniu Safari) z współrzędnymi i linkiem Google Maps. Przycisk w `MapView.tsx`, widoczny
      gdy znana jest pozycja użytkownika. Zero backendu, zero danych opuszczających urządzenie
      poza samym SMS-em, który użytkownik świadomie wysyła.

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
      rozważone i **świadomie odłożone** (2026-09-14): pierwotny problem, który ten punkt miał
      rozwiązać (`useLiveQuery(() => db.findings.toArray())` bez limitu, Faza 9), jest już
      naprawiony - lista w `JournalView.tsx` jest paginowana (`PAGE_SIZE = 100`, "Załaduj
      więcej"), więc nieograniczone renderowanie DOM przestało być realnym ryzykiem.
      Doinstalowanie `@tanstack/react-virtual` wymagałoby: (1) przepięcia listy z
      window-scrollowanej strony na `useWindowVirtualizer` z dynamicznym pomiarem wysokości
      (wiersze mają zmienną wysokość - tryb edycji), (2) usunięcia `useAutoAnimate` z tej listy
      (koliduje z pozycjonowaniem przez transform wirtualizera), (3) w środowisku testowym jsdom
      wirtualizowane listy zwykle nie renderują elementów spoza "okna" bez ręcznego mockowania
      `getBoundingClientRect`/`ResizeObserver`/wymiarów okna - realne ryzyko przepisania większości
      z 14 testów `JournalView.test.tsx` bez odpowiadającej korzyści przy 19 gatunkach
      (`EncyclopediaView`) i stronach po 100 wpisów (`JournalView`). Do rozważenia ponownie, gdyby
      w praktyce pojawiły się realne skargi na wydajność przy bardzo długiej historii.
- [x] **Web Worker dla inferencji TF.js** (2026-09-14) - `workers/mushroomWorker.ts` (Vite
      module worker) + `utils/mushroomWorkerClient.ts` (korelacja żądań po `requestId`, żeby
      równoległe wywołania się nie pomieszały). `identifyMushroom()` w `mushroomModel.ts`
      przyjmuje teraz `ImageBitmap` (transferable, zero kopiowania) obok `HTMLImageElement`.
      `IdentifyView.tsx` konwertuje wybrane zdjęcie na `ImageBitmap` (`createImageBitmap`,
      główny wątek, tanie) i wysyła do workera - inferencja TF.js (i cały bundle @tensorflow/tfjs)
      liczy się poza głównym wątkiem, UI zostaje płynne podczas analizy. Zweryfikowane buildem
      (worker poprawnie zbundlowany przez Vite i podjęty przez precache PWA) i live w przeglądarce
      (zakładka "Rozpoznaj" renderuje się bez błędów w konsoli) - pełny test inferencji wymaga
      dostarczonego modelu (Faza 5, nadal do Ciebie).
- [x] **Eksport PDF z podsumowaniem wyprawy/sezonu** (2026-09-14) - `utils/pdfExport.ts`
      (jsPDF, ładowany leniwie dynamicznym importem - nie obciąża głównego bundla), 100% po
      stronie klienta. Przycisk "PDF" w `JournalView.tsx` obok istniejącego eksportu JSON -
      eksportuje aktualnie widoczny (przefiltrowany/wyprawę) zestaw znalezisk: nagłówek, daty i
      czas trwania wyprawy, suma znalezisk/gatunków/wagi, lista znalezisk z paginacją stron PDF.

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
- [x] **"Kiedy na grzyby"** (2026-09-14) - `src/utils/mushroomWeather.ts` (Open-Meteo, bez klucza
      API - suma opadów i średnia temperatura z ostatnich 7 dni, własna, ludowa heurystyka
      "wysypu" na tych danych) + `src/hooks/useMushroomOutlook.ts` (spina z pozycją GPS z
      `MapView.tsx`, fetch tylko gdy online (`useOnlineStatus`), wynik cache'owany w
      `localStorage` do wglądu offline, odświeżany w tle po 6h lub istotnej zmianie pozycji,
      błąd sieci po cichu zostaje przy ostatniej znanej wartości - zero błędów w UI). Badge w
      `MapView.tsx` obok liczników "Aktywna wyprawa"/zachodu słońca. Testy: `mushroomWeather.test.ts`,
      `useMushroomOutlook.test.ts`.
- [x] Interaktywna checklista sprzętu przed wyjściem (2026-09-14) - `src/data/gearChecklist.ts`
      (statyczna lista kategorii: zbiór/nawigacja i bezpieczeństwo/odzież/prowiant),
      `src/components/GearChecklist.tsx` (Dialog, dostępny z ikony w nagłówku), zaznaczenia
      trwałe w `localStorage` (przetrwają zamknięcie apki), przycisk "Wyczyść zaznaczenia" na
      kolejne wyjście. Testy: `GearChecklist.test.tsx`.
- [x] Asystent ochrony przed kleszczami (2026-09-14) - `src/utils/tickReminders.ts`
      (`shouldRemindSpray`/`shouldRemindTickCheck` - czyste funkcje progowe), `src/hooks/useTickReminders.ts`
      (montowany raz w `App.tsx`, ta sama infrastruktura `showLocalNotification` co przypomnienie o
      długiej wyprawie, P2): przypomnienie o ponownym spryskaniu co ~3-4h w trakcie aktywnej
      wyprawy, jednorazowe przypomnienie o kontroli skóry ~14 dni po zakończeniu wyprawy (uczciwe
      ograniczenie: działa tylko przy otwarciu apki po tym czasie, brak backendu = brak realnego
      push w tle). `src/data/tickCare.ts` + `TickCareGuide.tsx` (Dialog z krokami usuwania
      kleszcza) dostępny z ikony w nagłówku. Testy: `tickReminders.test.ts`, `useTickReminders.test.ts`,
      `TickCareGuide.test.tsx`.
- [x] Info o suszeniu/mrożeniu/gotowaniu per gatunek (2026-09-14) - zrobione razem z punktem
      "Przepisy kulinarne i porady..." wyżej (`Species.preparationTips`).
- [x] Timer do blanszowania/gotowania (2026-09-14) - `src/utils/cookingTimer.ts` (`formatCountdown`),
      `src/components/CookingTimer.tsx` (Dialog z presetami: blanszowanie 5 min, gotowanie 15 min,
      smardz/piestrzenica 20 min - zgodnie z ostrzeżeniami "wyłącznie po ugotowaniu" w
      `preparationTips`, plus własny czas w minutach). Start/pauza/reset, po zakończeniu:
      wibracja (`navigator.vibrate`), toast (`sonner`) i `showLocalNotification` (na wypadek
      zminimalizowanej karty) - uczciwe zastrzeżenie: to zwykły `setInterval` w przeglądarce, nie
      realny timer w tle, jeśli karta zostanie zamknięta całkowicie. Testy: `cookingTimer.test.ts`,
      `CookingTimer.test.tsx`.
      **Przy okazji:** nagłówek apki spuchł do 5 osobnych ikon narzędzi (pierwsza pomoc,
      checklista, kleszcze, timer, pamięć) - skonsolidowane w jedną szufladę `ToolsMenu.tsx`
      (ikona "Narzędzia" 🔧), żeby nagłówek nie rozrastał się z każdą kolejną funkcją pomocniczą.
- [x] Tryb "W lesie" (2026-09-14) - `appStore.ts` (`forestMode`, trwały w localStorage),
      przełącznik w `ToolsMenu.tsx`, klasa `.forest-mode` nadawana na `<html>` w `App.tsx`
      (wzorem `.dark` z next-themes). CSS w `index.css`: skalowanie `font-size` na korzeniu
      (podbija wszystkie rozmiary oparte na rem w całej apce, nie tylko wybrane komponenty),
      wyższy kontrast obramowań/tekstu drugorzędnego, większe minimalne cele dotyku przycisków.
      Testy: `appStore.test.ts`, `ToolsMenu.test.tsx`.

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

## Faza 12 - Rebranding "Grzybobranie" + polish UI ✅ zrobione (2026-09-14)

Na wyraźną prośbę użytkownika: zmiana nazwy z "ŁYSY" na "Grzybobranie" + podniesienie UI do
poziomu "pięknego natywnego mobile z animacjami". Audyt UI (agent, przed wdrożeniem) wykazał
solidne podstawy (Skeleton, `AnimatePresence`, `useAutoAnimate`, `active`/`focus-visible` states
już w kodzie) i wskazał konkretne luki - zaadresowane poniżej, bez migracji frameworka/biblioteki
stylów (Tailwind v4 + shadcn/ui na Base UI, `motion/react`).

- [x] **Rebranding nazwy** - `App.tsx` (nagłówek), `index.html` (`<title>`), `vite.config.ts`
      (PWA manifest `name`/`short_name`), `android/app/src/main/res/values/strings.xml`
      (`app_name`, teksty widgetu), `README.md`. Świadomie NIE ruszone: wewnętrzne klucze
      `localStorage`/IndexedDB (`lysy-*`) - to szczegół implementacyjny niewidoczny dla
      użytkownika, zmiana zresetowałaby część zapisanego stanu (np. zaznaczenia checklisty).
      Nowa grafika ikon PWA (`public/icons/*`) zostaje jako osobne zadanie - wymaga wygenerowania
      plików graficznych, nie tylko podmiany tekstu.
- [x] **Animowane logo** - `src/components/Logo.tsx`: własne SVG (grzyb, nie emoji - spójny
      wygląd niezależnie od fontu systemowego), animacja "pop" + kołysanie kapelusza przy
      montowaniu (`motion/react`, spring). Zastępuje statyczny emoji 🍄 w nagłówku.
- [x] **Głębia wizualna** - drugi, ciepły akcent `--brand-accent` (bursztyn, `index.css`) obok
      zielonego `--primary`, użyty oszczędnie (gradient nagłówka `App.tsx`, barwiony cień)
      - celowo NIE dotyka semantycznych kolorów bezpieczeństwa w `EdibilityBadge.tsx`. Karty
      (`ui/card.tsx`) - dodany subtelny cień barwiony zamiast czystej czerni.
- [x] **Mikroanimacje** - dolna nawigacja: `whileTap` spring-bounce ikony przy tapnięciu
      (`App.tsx`, zamiast statycznego `active:scale-95`). `ToolsMenu.tsx`: stagger wejścia
      pozycji listy przy otwarciu szuflady. Dialogi/Drawery (Base UI) miały już solidne
      wbudowane animacje wejścia/wyjścia (fade/zoom, spring slide) - audyt to potwierdził, nie
      wymagały zmian.
- [x] **Typografia** - `tabular-nums` na liczbach w timerze kuchennym i liczniku checklisty
      sprzętu (`CookingTimer.tsx`, `GearChecklist.tsx`) - stabilna szerokość cyfr przy
      odliczaniu/odznaczaniu.
- Zweryfikowane: 261 testów zielonych, build produkcyjny przechodzi, live-test w przeglądarce
  (nagłówek, `ToolsMenu`, `CookingTimer`) - zero błędów w konsoli.
- [x] **Nowa grafika ikon PWA/favicon** (2026-09-14) - `scripts/generate-icons.mjs` renderuje SVG
      grzyba z `Logo.tsx` przez Playwright (Chromium, już zależność dev) do PNG - `icon-192.png`,
      `icon-512.png`, `icon-512-maskable.png` (bezpieczna strefa ~40% marginesu) w `public/icons/`
      oraz `public/favicon.png`. `public/favicon.svg` podmieniony z domyślnej fioletowej grafiki
      scaffoldu na tego samego grzyba. `index.html` dostał `apple-touch-icon` i PNG-fallback.
- [x] **Animowany splash screen przy starcie PWA** (2026-09-14) - `src/components/AppSplash.tsx`:
      natywny splash (biały/kolorowy ekran z ikoną przy zimnym starcie) generuje system z
      manifestu (`display: standalone`, `theme_color`, `icons` - już skonfigurowane), poza
      kontrolą JS; ten komponent dodaje krótki (900ms), animowany ekran z `Logo` NAD appką zaraz
      po montowaniu, żeby przejście z natywnego splasha nie było nagłe. Tylko w trybie standalone
      (`matchMedia('(display-mode: standalone)')` + fallback iOS `navigator.standalone`) i tylko
      raz na sesję (`sessionStorage`) - zwykłe otwarcie w karcie przeglądarki nie potrzebuje tego
      teatru.
- [x] **Tekstura/ziarno tła** - zrobione wcześniej przy okazji trybu "W lesie" (`index.css`):
      SVG `feTurbulence` jako `background-image` na `body`, bardzo niska nieprzezroczystość, brak
      wpływu na kontrast/czytelność.
- [x] **Hover/tap mikrointerakcje na kartach list** - zrobione wcześniej przy okazji integracji
      `ToolsMenu`/trybu "W lesie" w widokach: `JournalView.tsx`/`EncyclopediaView.tsx`, karty listy
      mają `motion.div` z `whileTap={{ scale: 0.98 }}` na wewnętrznym wrapperze (nie na `Card`
      samej, żeby nie kolidować z transformacjami `useAutoAnimate`).

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
