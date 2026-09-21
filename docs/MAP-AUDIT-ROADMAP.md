# Audyt Mapy 2026-09-21: architektura/clean code, wydajność, biblioteki/a11y

Wygenerowane przez trzy równoległe agenty (`architect`, `performance-engineer`, `frontend-expert`)
czytające świeżo `src/features/map/` i powiązane hooki/utils - nie ufając wcześniejszym notatkom w
`docs/MAP-ROADMAP.md` (który jest w pełni zamknięty, patrz `docs/ROADMAP.md` Faza 27). To NIE jest
lista nowych funkcji jak `MAP-ROADMAP.md` - to audyt jakości istniejącego kodu (clean code, KISS,
DRY, wydajność, biblioteki) w skali jednoosobowego, offline-first projektu.

**Nic z tego nie jest jeszcze zaimplementowane w chwili pisania tego dokumentu** - status będzie
aktualizowany checkmarkami w miarę realizacji (konwencja z `ROZBUDOWA-ROADMAP.md`).

---

## Tier 1: realne bugi, niska złożoność - warte zrobienia od razu

1. ✅ **`createSpotMarkerIcon()` nie jest cache'owana - re-renderuje SVG ikonę dla KAŻDEGO
   zapisanego grzybowiska przy KAŻDYM ticku GPS.** `mapMarkerIcons.tsx:97-104` woła
   `renderToStaticMarkup` + `L.divIcon(...)` bez cache'a, wywoływana z `MapView.tsx:261-268`
   wewnątrz `spots?.map(...)` - a `MapView` re-renderuje się przy każdej aktualizacji
   `userPosition` z `useMapGeolocation` (~1×/s przy aktywnym GPS). Sąsiednie funkcje w tym samym
   pliku (`findingMarkerIconFor`, `createClusterIcon`) już mają `Map`-cache z komentarzem
   dokładnie na ten temat - ten przypadek po prostu pominięto. Realny, ciągły koszt CPU/baterii
   przez cały czas trwania wyprawy z otwartą mapą - dokładnie główny use case apki. Fix: cache
   po `(seasonalMatch: boolean)`, dwuelementowa `Map`, ten sam wzorzec co sąsiednie funkcje.
   Złożoność: **niska**.

2. ✅ **`MapInstanceCapture`'s `onReady` łamie własny udokumentowany niezmiennik.**
   `MapView.tsx:218-222` przekazuje inline lambdę `(map) => { mapRef.current = map }`, mimo że
   komentarz w `MapLayers.tsx:253-256` explicite mówi, że `onReady` musi mieć stabilną referencję,
   bo inline lambda odpala efekt przy każdym renderze rodzica (każdy tick GPS). Obecnie
   nieszkodliwe funkcjonalnie (cleanup+setup synchroniczne w tej samej fazie commitu), ale to
   żywa niespójność z komentarzem i zbędna praca ~1×/s. Fix: `useCallback(() => {...}, [])` w
   `MapView.tsx`. Złożoność: **niska**.

3. ✅ **`.forest-mode` nie powiększa natywnych przycisków zoom Leaflet.** `index.css:413-416`
   celuje w `a[role='button']`, którym Leaflet faktycznie renderuje przyciski zoom - ale osobny
   blok stylowania kontrolek (`index.css:492-501`, `.leaflet-control-zoom a { width: 34px
   !important; height: 34px !important }`) nadpisuje to na sztywne 34px. Jedyny interaktywny
   element mapy, który w trybie terenowym (projektowanym pod rękawiczki/zimne ręce) zostaje
   poniżej 44px - wbrew własnej deklarowanej intencji trybu. Fix: dodać
   `.forest-mode .leaflet-control-zoom a { width/height/line-height: 2.75rem !important }`.
   Złożoność: **niska**.

4. ✅ **`TileLayer`'s `eventHandlers` to świeży literał obiektu przy każdym renderze.**
   `MapView.tsx:203-211` (`tileerror`/`tileload`) - ten sam efekt uboczny co pkt 1-2 (rebinding
   nasłuchiwaczy Leaflet ~1×/s). Tani fix przy okazji tych samych GPS-tick-owych poprawek:
   `useMemo`/stała referencja. Złożoność: **niska**.

5. ✅ **`SpotRow` w `SpotManager.tsx` robi osobne zapytanie Dexie per wiersz (N+1) zamiast użyć już
   załadowanych danych.** `SpotManager.tsx:98` woła własny `useLiveQuery` per spot, mimo że
   rodzic już ładuje `allFindings` przez pełne zapytanie (`:356`) do rankingu spotów. Przy
   dziesiątkach spotów OK, ale to zbędna duplikacja zapytań przy każdej zmianie w tabeli findings
   gdy Spot Manager jest otwarty. Fix: wyprowadzić per-spot findings z już załadowanego
   `allFindings` zamiast drugiego zapytania. Złożoność: **niska**.

6. ✅ **Powtórzona logika formatowania dystans+kierunek (3×) i surowego wyliczenia bearing/dystans
   (2×).** Sformatowany string `` `${formatDistance(d)} ${getCardinalDirection(b)}` `` dosłownie
   powtórzony w `MapStatusBadges.tsx:167-169`, `:197-199` i `FindingsListView.tsx:35-40`. Surowe
   `{distanceMeters, bearingDegrees}` liczone niemal identycznym `useMemo` w
   `useSpotNavigation.ts:35-42` i `useReturnPointTracking.ts:33-40`. Czysto funkcyjne, bezpieczne
   wydzielenie (nie dotyka GPS/race-condition logiki) - `useBearingInfo(from, to)` +
   `describeBearing(distance, bearing)`. Złożoność: **niska**.

7. ⏸️ **Niespójne użycie `React.memo` - świadomie pominięte.** `FindingMarkers`/`FindingsHeatmap`
   są już owinięte w memo z jawnym komentarzem o GPS-tickach - ten sam wzorzec nie objął
   `MapStatusBadges`/`MapToolbar`/`MapOverlayMessages`/`MapHeaderActions`/`SpotManager`/
   `OfflineAreaDownload`/`SzczecinSpotsPanel`/`CompassPanel`. Sprawdzone przy realizacji: samo
   owinięcie w `memo()` byłoby kosmetycznym non-fixem - `MapView.tsx` przekazuje im ~15 inline
   lambd jako propsy (`onLocate`, `onOpenSheet`, `onToggleHeatmapView` itd.), więc referencje
   propsów i tak zmieniają się przy każdym renderze rodzica, memo nic by nie ucięło. Realna
   naprawa wymagałaby `useCallback` na każdym z tych ~15 callbacków - więcej ryzyka (możliwość
   przypadkowego złapania stale closure) niż uzasadnia realny zysk przy tej skali. Zostawione
   bez zmian.

8. ✅ **Brak testu ścieżki błędu `watchPosition` (np. `PERMISSION_DENIED`) w `useMapGeolocation`.**
   `useMapGeolocation.test.ts` testuje `reportError`/`clearLocateError` z zewnątrz, ale nigdy nie
   emituje błędu przez faktyczny callback `onError` przekazany do `watchPosition`
   (`useMapGeolocation.ts:66`) - realny scenariusz "użytkownik cofnął zgodę na GPS w trakcie"
   nie jest zweryfikowany end-to-end na poziomie hooka. Złożoność: **niska**.

9. ✅ **Doc-only: `docs/MAP-ROADMAP.md` Część 2 pkt 2 jest nieaktualny** - mówi o braku testów dla
   `OfflineAreaDownload`/`SzczecinSpotsPanel`, ale oba mają dziś solidne testy (retry/abort/
   progress, stany offline/błędów). Do poprawki przy najbliższej okazji edycji tego dokumentu.

---

## Tier 2: realne, ale wymagają decyzji o zakresie - średnia złożoność

10. **Duplikacja logiki cache'a localStorage między `useMushroomOutlook.ts` i
    `useSpotMushroomOutlook.ts`.** Oba pliki (odpowiednio linie 16-38 i 20-43) mają niemal
    identyczne `readCache`/`writeCache`/`isStale` - różnią się kształtem klucza (pojedynczy wpis
    vs `Record<spotId, entry>`) i progiem "przesunięcia". ~40 powtórzonych linii, realne ryzyko
    rozjazdu przy przyszłej zmianie progu. Wymaga przemyślanego generycznego API (parametryzowany
    kształt cache'a), nie prostego kopiuj-wklej wydzielenia. Złożoność: **średnia**.

11. **`MapView.tsx` (9× `useState`) mógłby wydzielić klaster filtrów widoku do osobnego,
    Leaflet-wolnego hooka.** `isListView`/`isHeatmapView`/`isSeasonalOverlayEnabled`/
    `speciesFilterIds` + powiązane `useMemo` (`presentSpeciesOptions`/`filteredFindings`/
    `hasAnySeasonalMatch`) nie zależą od Leaflet, ale dziś testowalne tylko pośrednio przez ciężki
    `MapView.test.tsx` (2-case smoke test, montujący cały `MapContainer`). Wydzielenie do
    `useMapFilters` zredukowałoby liczbę `useState` w `MapView` z 9 do ~5 i umożliwiło test bez
    Leaflet. **Świadomie NIE dotykać** `mapRef`/`suppressNextRecenterRef`/stanów GPS - to inna
    kategoria z udokumentowanymi race conditions, nie ruszać bez pełnego zrozumienia. Co do 20
    propsów `MapHeaderActions`: to jeden "hop" przez portal, nie głębokie prop-drillowanie -
    Context dodałby więcej niejawności niż zysku. Jeśli warto ograniczyć "worek propsów", lepszy
    kierunek to rozbicie zawartości `DropdownMenu` na małe podkomponenty per-koncern (warstwa
    mapy, filtr gatunku, oszczędzanie baterii), nie Context. Złożoność: **średnia**, zysk
    umiarkowany.

---

## Sprawdzone i potwierdzone jako OK (nie zmieniać)

- **Granica Leaflet-only** (`useMap`/`useMapEvent` wyłącznie w `MapLayers.tsx`) konsekwentnie
  utrzymana - `MapView.tsx` używa tylko deklaratywnych komponentów react-leaflet.
- **Podział appStore vs lokalny stan** spójny i uzasadniony komentarzami.
- **Klastrowanie** (`clusterFindings.ts`) to poprawny O(n) grid-bucket w pikselach ekranu, z
  `findingsById` Map unikającą O(n×m). Znany artefakt granic kubełków - już opisany w
  `MAP-ROADMAP.md` jako nie warty naprawy przy obecnej skali.
- **SVG renderer (brak `preferCanvas`)** - teoretyczny problem, klastrowanie i tak ogranicza
  jednocześnie widoczne markery do dziesiątek, nie tysięcy. Nie zmieniać.
- **Dexie `findings.toArray()`/`spots.toArray()` bez limitu** - mikrosekundy/KB przy realnej
  skali (dziesiątki-setki rekordów). Nie dodawać paginacji teraz.
- **Cache/throttling zapytań Open-Meteo** (`useMushroomOutlook`/`useSpotMushroomOutlook`) -
  poprawne: rounding pozycji, 6h cache, lazy fetch per-spot tylko przy rozwinięciu karty.
- **Code-splitting** - `MapView` (i Leaflet) ładowany przez `React.lazy` w `App.tsx`, nie w
  głównym bundle.
- **GPS/bateria** (`useMapGeolocation`, `useTripTrail`, `useBatteryStatus`, `powerSave.ts`) -
  dobrze zaprojektowane: pauza `watchPosition` na `visibilitychange`, `enableHighAccuracy: false`
  + `maximumAge: 20000` w power-save, throttling trasy 50m vs 20m, auto-aktywacja <20% baterii.
- **`key={activeMapLayer.id}` na `TileLayer`** - potwierdzone w źródle react-leaflet jako
  uzasadnione (tylko `url`/`opacity`/`zIndex` są reaktywne po mount, `maxZoom` różni się między
  warstwami) - nie code smell, nie zmieniać.
- **MapLibre GL JS** - nie rekomendowane. Obecne rastrowe kafle OSM/OpenTopoMap cache'owane przez
  Cache API są kluczowe dla wymogu 100%-offline; MapLibre wymagałby innego formatu kafli i
  większego bundle bez realnej korzyści przy tej skali.
- **Klawiszowa dostępność markerów** - Leaflet domyślnie ustawia `tabIndex=0` (`keyboard: true`),
  własne `role="img"`/`aria-label` na ikonach `divIcon` już dodane świadomie.
- **Cleanup efektów** we wszystkich sprawdzonych hookach GPS-owych - brak wycieków pamięci.

---

## Rekomendowana kolejność realizacji

Cały Tier 1 (pkt 1-9) to niskie ryzyko, wysoka pewność, szybkie do zrobienia razem w jednej sesji -
realny zysk baterii/CPU (pkt 1) + kilka drobnych spójności/testów. Tier 2 (pkt 10-11) wymaga więcej
namysłu nad kształtem API i przynosi umiarkowany zysk - do zrobienia osobno, bez pośpiechu.
