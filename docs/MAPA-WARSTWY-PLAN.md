# Mapa: warstwy i wygląd - plan wdrożenia krok po kroku

Data: 2026-10-03. Szczegółowe rozpisanie **Fazy 30** z `docs/ROADMAP.md` (oraz Fazy 29 pkt 4 - zakazy
wstępu) na kolejne, małe kroki do wykonania po kolei. Każdy krok kończy się działającą aplikacją, testami i
osobnym commitem - można przerwać po dowolnym z nich.

Źródła planu: przegląd kodu mapy (`src/data/mapLayers.ts`, `src/features/map/`, `src/sw.ts`,
`src/utils/offlineMapTiles.ts`, `src/index.css`), raport agenta planującego z 2026-10-03 i własne pomiary
endpointów (niżej). Status kroków odhaczamy tutaj **i** w `docs/ROADMAP.md` (Faza 30).

---

## 0. Zasady wspólne dla każdego kroku

1. **Zakres** - tylko to, co opisuje krok. Nowe pomysły dopisujemy do Etapu E (backlog), nie robimy "przy okazji".
2. **Sprawdzenia przed commitem** (wszystkie muszą przejść):
   ```bash
   npx tsc -b
   npx oxlint          # 0 błędów; ostrzeżenia tylko te, które były wcześniej
   npx vitest run
   npm run build
   ```
3. **Test w przeglądarce** (chrome-devtools albo claude-in-chrome):
   - zwykłe zmiany: `npm run dev` (port 5173), wejście na `http://127.0.0.1:5173/`;
   - zmiany Service Workera / cache (kroki 1, 2, 5, 6): SW działa **tylko w buildzie** -
     `npm run build && npx vite preview` (port 4173), DevTools -> Application -> Service Workers -> aktywny;
   - oba motywy (jasny i ciemny) przy każdej zmianie wyglądu mapy;
   - GPS w teście: nadpisanie `navigator.geolocation` skryptem startowym strony (tak jak przy teście
     "Gdzie szukać": Puszcza Bukowa, 53.352, 14.640).
4. **Dokumentacja** - odhaczenie kroku tutaj i w `docs/ROADMAP.md` (Faza 30 / Faza 29).
5. **Commit + push**, potem sprawdzenie, że CI (`lint`, `test`, `build`, `e2e`) jest zielone: `gh run list --limit 1`.

Oznaczenia wielkości: **S** = do ~2 h, **M** = pół dnia - dzień.

---

## 1. Stan wyjściowy (jak działa mapa dziś)

| Element | Gdzie | Uwagi |
|---|---|---|
| Definicje podkładów (OSM, OpenTopoMap, ortofoto GUGiK) i nakładek (Drzewostany BDL, Obszary chronione GDOŚ, Szlaki) | `src/data/mapLayers.ts` | `MapLayerDef`, `MapOverlayDef`, `getMapOverlays`, `isCacheableOverlayRequest`, `overlayCacheKey` |
| Render warstwy (WMS albo XYZ) | `src/features/map/MapTileLayers.tsx` | wszystkie nakładki `zIndex: 10`, WMS nakładek 512 px, ponowienia `retryWmsTile` |
| Wybór warstw | `src/features/map/MapHeaderActions.tsx` (menu "Więcej narzędzi mapy") | sekcje "Warstwa mapy" (radio) i "Nakładki" (checkbox) |
| Stan | `src/stores/appStore.ts` | `mapLayerId`, `mapOverlayIds` (utrwalane) |
| Cache Service Workera | `src/sw.ts` | `map-tiles` (CacheFirst, 90 dni, regex na `[abc].tile.openstreetmap.org` i `[abc].tile.opentopomap.org`), `map-overlays` (CacheFirst, 60 dni, po hoście) |
| Pobieranie obszaru offline | `src/utils/offlineMapTiles.ts`, `OfflineAreaDownload.tsx` | zapisuje kafle pod `a.tile...`, z13-16, max 4500 kafli, 6 równoległych zapytań |
| Kolory kafli | `src/index.css` (~linia 491) | filtr na **całym** `.leaflet-tile-pane`, w ciemnym motywie `invert(1)` |
| Mapa | `src/features/map/MapView.tsx` | `REGION_BOUNDS`, `REGION_MIN_ZOOM = 8`, brak `maxZoom` na `MapContainer` |

---

## 2. Zweryfikowane endpointy (pomiar 2026-10-03)

GetMap w EPSG:3857 (kafel 256 px nad Szczecinem), nagłówek CORS przy `Origin: http://127.0.0.1:5173`.

| Warstwa | Adres usługi | Parametry | Wynik | CORS |
|---|---|---|---|---|
| Zakazy wstępu (BDL) | `https://mapserver.bdl.lasy.gov.pl/ArcGIS/services/WMS_zakazy_wstepu_do_lasu/MapServer/WMSServer` | `LAYERS=3` | 200 PNG | odbija origin |
| Zagrożenie pożarowe (BDL) | `https://mapserver.bdl.lasy.gov.pl/ArcGIS/services/WMS_zagrozenie_pozarowe_w_lasach/MapServer/WMSServer` | `LAYERS=0` | 200 PNG | odbija origin |
| Cieniowanie rzeźby NMT (GUGiK) | `https://mapy.geoportal.gov.pl/wss/service/PZGIK/NMT/GRID1/WMS/ShadedRelief` | `LAYERS=Raster` | 200 PNG, ~51 KB | `*` |
| Mapa topograficzna (GUGiK) | `https://mapy.geoportal.gov.pl/wss/service/img/guest/TOPO/MapServer/WMSServer` | `LAYERS=Raster`, **`FORMAT=image/jpeg`** | 200 JPEG **~29 KB** (PNG: ~132 KB) | `*` |
| CyclOSM | `https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png` | - | 200 PNG | `*` |
| OSM bez subdomen | `https://tile.openstreetmap.org/{z}/{x}/{y}.png` | - | 200 PNG | `*` |
| GDOŚ - dodatkowe formy ochrony | `https://sdi.gdos.gov.pl/wms` | `LAYERS=GDOS:UzytkiEkologiczne,GDOS:ZespolyPrzyrodniczoKrajobrazowe` | 200 PNG | `*` |

**Uwagi z weryfikacji, ważne przy implementacji:**

- **Zakazy: numeracja WMS jest odwrotna niż REST.** WMS: `0` Leśnictwa, `1` Nadleśnictwa, `2` RDLP,
  **`3` = zakazy**. REST (`.../WMS_zakazy_wstepu_do_lasu/MapServer/<id>`): **`0` = zakazy**, 1-3 granice.
  Do mapy bierzemy WMS `3`, do zapytań "czy tu wolno" REST `0`.
- Pola zakazu (REST `0`): `nazwa_nadl`, `lesnictwo`, `kod` (przyczyna, dziś zawsze "inne przyczyny"),
  `data` (od), `data_koncowa` (do), `adr_lesny`.
- Na 2026-10-03 w obszarze województwa i okolic jest **79 aktywnych zakazów** (m.in. nadleśnictwa Gościno i
  Głusko) - jest na czym testować.
- Zagrożenie pożarowe - renderer po polu `kod`, kolory do legendy:
  `3` duże `#ff0000`, `2` średnie `#ffff00`, `1` małe `#55ff00`, `0` brak `#0070ff`,
  `-1` rejon nieobjęty prognozowaniem `#000000`, `-2` brak danych `#cccccc`.
- Zakazy - wypełnienie `#ff0000`, obrys `#686868`.
- BDL i zakazy/pożary są na **tym samym hoście** (`mapserver.bdl.lasy.gov.pl`) - dzisiejsza reguła cache
  nakładek "po hoście" złapałaby zakazy do 60-dniowego cache. Stąd krok 5 musi być przed krokiem 6.

**Odrzucone** (sprawdzone przez agenta): WMTS Geoportalu G2_MOBILE_500 (tylko EPSG:2180), BDOT PZGIK (401),
Esri World Imagery (licencja), CARTO / Stadia / Tracestrack (klucze lub warunki komercyjne).

---

## 3. Kolejność i zależności

```
Etap A (naprawy)        1 ──► 2            3 ──► 4            5
                                            │     │            │
Etap B (nowe warstwy)                       │     ▼            ▼
                                            └──► 7 (blend)     6 ──► 14 (Etap D)
                                                  8, 9, 10 (niezależne)
Etap C (wygląd)         11 (panel) ◄── 4, 6-10;   12 (legenda) ◄── 6, 10, 11;   13 (niezależny)
Etap D (funkcje)        14 ◄── 6;   15 ◄── Faza 29 pkt 2 (zrobione)
```

Kolejność wykonania = numeracja kroków. Mapowanie na `ROADMAP.md`:

| Krok | Faza 30 | Krok | Faza 30 |
|---|---|---|---|
| 1 | pkt 1 | 9 | pkt 9 |
| 2 | pkt 5 | 10 | pkt 10 |
| 3 | pkt 2 | 11 | pkt 11 |
| 4 | pkt 3 | 12 | pkt 11 (legenda) |
| 5 | pkt 4 | 13 | pkt 12 |
| 6 | pkt 6 (= Faza 29 pkt 4, krok 1) | 14 | Faza 29 pkt 4, krok 2 |
| 7 | pkt 7 | 15 | pkt 14 |
| 8 | pkt 8 | E | pkt 13 + reszta |

---

## Etap A - Naprawy

### Krok 1. Kafle offline: jeden klucz cache dla subdomen a/b/c (BŁĄD) - S

> **ZROBIONE 2026-10-03.** `mapTileCacheKey` w `mapLayers.ts`, użyty w `sw.ts` (trasa `map-tiles`) i
> `offlineMapTiles.ts`. Pomiar na buildzie (preview, domyślny obszar 5 km = 1066 kafli nad Puszczą Bukową): **przed** - na z16
> 13 z 20 widocznych kafli (wszystkie `b`/`c`) szło do sieci mimo pobranego obszaru; **po** - z14, z15 i z16:
> 0 nowych zapytań, wszystkie kafle z cache. Uwaga do weryfikacji: emulacja "Offline" w DevTools nie obejmuje
> zapytań samego Service Workera, więc miarą jest przyrost kluczy w `map-tiles` (CacheFirst idzie do sieci
> tylko przy braku trafienia w cache).

**Problem.** Leaflet rozkłada kafle `{s}` na subdomeny według `(x + y) % 3` (a, b, c). "Pobierz obszar
offline" zapisuje każdy kafel pod `a.tile...`, a trasa `map-tiles` w `sw.ts` (CacheFirst) szuka po
dokładnym URL-u. Offline trafia więc tylko ok. 1/3 pobranych kafli - w lesie mapa ma dziury.

**Pliki:** `src/data/mapLayers.ts`, `src/sw.ts`, `src/utils/offlineMapTiles.ts`, testy.

**Kroki:**
1. W `mapLayers.ts` dodać jedną funkcję normalizującą (wspólne źródło dla SW i pobierania):
   ```ts
   // Leaflet rotuje subdomeny {s} (a/b/c) - ten sam kafel ma trzy URL-e. Klucz cache'a zawsze
   // z "a", dokładnie tak, jak zapisuje go "Pobierz obszar offline" (utils/offlineMapTiles.ts).
   export function mapTileCacheKey(url: URL): string {
     return url.href.replace(/^https:\/\/[abc]\.tile\./, 'https://a.tile.')
   }
   ```
2. W `sw.ts`, w trasie `map-tiles`, dodać plugin (wzór: trasa nakładek):
   `{ cacheKeyWillBeUsed: async ({ request }) => mapTileCacheKey(new URL(request.url)) }`.
3. W `offlineMapTiles.ts` budować klucz zapisu przez `mapTileCacheKey` (zamiast osobnego założenia "a" w
   komentarzu), żeby oba miejsca nie mogły się rozjechać.
4. Testy (`mapLayers.test.ts`):
   - `b.tile.openstreetmap.org/...` i `c.tile.opentopomap.org/...` -> wersja z `a.`;
   - `a.` bez zmian; inne hosty (np. `tile.waymarkedtrails.org`, `tile.openstreetmap.org`) bez zmian.
   W `offlineMapTiles.test.ts`: klucz zapisu = `mapTileCacheKey` adresu, o który poprosi Leaflet dla
   kafla z `(x+y)%3 = 1` i `2`.
5. Stare wpisy pod `b.`/`c.` w cache zostaną osierocone - usunie je `ExpirationPlugin` (limit 4000 wpisów).

**Weryfikacja ręczna (build + preview):**
1. `npm run build && npx vite preview`, otworzyć `http://127.0.0.1:4173/`, poczekać na aktywny SW.
2. Pobrać obszar 2 km (Narzędzia mapy -> Pobierz obszar offline).
3. DevTools -> Network -> **Offline**. Przesuwać mapę w obrębie obszaru na z13-16.
4. Liczba niezaładowanych kafli w konsoli:
   `[...document.querySelectorAll('.leaflet-tile')].filter(i => !i.complete || i.naturalWidth === 0).length`
   -> przed poprawką ok. 2/3 kafli, po poprawce **0**.

**Gotowe gdy:** offline cały pobrany obszar wyświetla się bez dziur, testy przechodzą.
**Commit:** `fix(map): kafle offline - wspolny klucz cache dla subdomen a/b/c (trafialo ~1/3 kafli)`

---

### Krok 2. Pobieranie offline zgodne z zasadami serwerów OSM - S

> **ZROBIONE 2026-10-03** (decyzja użytkownika: tak, przejście na adres bez subdomen).
> - OSM: `https://tile.openstreetmap.org/{z}/{x}/{y}.png`; trasa SW przez `isBaseMapTileRequest`;
> - Service Worker przy aktywacji usuwa stare kafle `[abc].tile.openstreetmap.org` (`isLegacyOsmTileUrl`) -
>   **obszary offline pobrane wcześniej trzeba pobrać ponownie**;
> - 2 zapytania naraz (pomiar: 5 km / 1066 kafli w 33 s, wcześniej 17 s); informacja w panelu pobierania;
> - domyślny promień zostaje **5 km** (nie 2 km, jak zakładał plan) - typowe wyjście do lasu obejmuje kilka km,
>   a 2 km zmuszałoby do kilku pobrań;
> - sprawdzone na buildzie: stare wpisy OSM usunięte, wpis OpenTopoMap zachowany, nowe kafle w `map-tiles`.

**Problem.** Zasady korzystania z kafli OSM (tile usage policy) nie pozwalają na masowe pobieranie z
wyprzedzeniem. Dziś do 4500 kafli, 6 zapytań naraz - ryzyko zablokowania.

**Pliki:** `src/utils/offlineMapTiles.ts`, `src/features/map/OfflineAreaDownload.tsx`, testy.

**Kroki:**
1. `CONCURRENCY` 6 -> **2**.
2. W `OfflineAreaDownload.tsx` krótka informacja pod wyborem promienia: "Kafle pochodzą z darmowych serwerów
   OpenStreetMap - pobieraj tylko obszar, na który się wybierasz."
3. Domyślnie zaznaczony preset **2 km** (sprawdzić obecny domyślny).
4. **Decyzja użytkownika (patrz sekcja "Decyzje")**: przejście OSM na `https://tile.openstreetmap.org/...`
   (bez subdomen, zalecane przez OSM). Jeśli tak: zmiana `urlTemplate` w `MAP_LAYERS`, regex trasy
   `map-tiles` w `sw.ts` musi łapać też `tile.openstreetmap.org`, a wcześniej pobrane obszary trzeba
   pobrać jeszcze raz (inne klucze cache).
5. Testy: `offlineMapTiles.test.ts` - maksymalnie 2 jednoczesne `fetch` (licznik w mocku).

**Weryfikacja:** pobranie 2 km działa, pasek postępu dochodzi do końca, w Network widać najwyżej 2 zapytania
naraz do `tile.openstreetmap.org`.
**Commit:** `fix(map): pobieranie offline oszczedniej (2 zapytania naraz) i informacja o zasadach OSM`

---

### Krok 3. Filtr kolorów tylko dla podkładów (BŁĄD) - S

> **ZROBIONE 2026-10-03.** Klasy `map-layer--<id>` / `map-overlay--<id>` na kontenerach warstw, filtry tylko
> na podkładach (OSM: tint / invert w ciemnym; terenowa: tylko przyciemnienie; ortofoto: `brightness(0.8)` w
> ciemnym). **Przy weryfikacji wyszedł drugi błąd:** podkład nie miał własnego `z-index` (przekazywane
> `undefined` nadpisywało domyślne 1 Leafleta), więc jego wewnętrzny kontener kafli (`z-index` = maxZoom, np. 19)
> przykrywał nakładkę (`z-index` 10) - nakładka nad ortofoto w jasnym motywie była niewidoczna. Wcześniej
> maskował to filtr (filtr tworzy osobny kontekst warstw). Poprawka: podkład `zIndex: 1` + test regresji.
> Sprawdzone zrzutami: ortofoto + Drzewostany (jasny i ciemny), terenowa w ciemnym, standardowa w ciemnym.

**Problem.** Filtr w `index.css` działa na cały `.leaflet-tile-pane`: w ciemnym motywie ortofotomapa jest
negatywem, a nakładki (drzewostany, obszary chronione, w przyszłości zakazy i pożary) zmieniają kolory, więc
legenda przestaje się zgadzać.

**Pliki:** `src/features/map/MapTileLayers.tsx`, `src/index.css`, nowy `MapTileLayers.test.tsx`.

**Kroki:**
1. `MapTileLayer` przekazuje opcję Leafleta `className` (trafia na kontener warstwy):
   - podkład: `map-layer map-layer--${def.id}`;
   - nakładka: `map-overlay map-overlay--${def.id}`.
   Klasa ustawiana tylko przy tworzeniu warstwy - w porządku, bo warstwy mają `key` po `id`.
2. `index.css`: usunąć reguły `.leaflet-tile-pane { filter }` i `.dark .leaflet-tile-pane { filter }`, w ich
   miejsce:
   ```css
   /* Tylko podkłady - nakładki (BDL, GDOŚ, zakazy) muszą zachować kolory zgodne z legendą. */
   .map-layer--street,
   .map-layer--topo { filter: saturate(0.85) sepia(0.12) hue-rotate(-6deg) brightness(1.02); }
   .dark .map-layer--street {
     filter: saturate(0.7) sepia(0.1) hue-rotate(-6deg) brightness(0.65) invert(1) hue-rotate(180deg) contrast(0.9);
   }
   /* Mapa terenowa: invert psuje cieniowanie rzeźby - tylko przyciemnienie. */
   .dark .map-layer--topo { filter: brightness(0.75) contrast(0.95) saturate(0.85); }
   /* Zdjęcia lotnicze: nigdy invert, tylko lekko ciemniej w nocnym motywie. */
   .dark .map-layer--satellite { filter: brightness(0.8); }
   ```
3. Zaktualizować komentarz nad regułami (dziś opisuje filtr całego panelu) i komentarz w bloku kontrolek
   Leafleta, który odsyła do `.dark .leaflet-tile-pane`.
4. Test `MapTileLayers.test.tsx`: render w `MapContainer` (jsdom, tak jak `App.test.tsx`) -> istnieje
   `.map-layer--street`; nakładka `forest` -> `.map-overlay--forest`, bez `map-layer`.

**Weryfikacja:** zrzuty ekranu w obu motywach dla: Standardowa, Terenowa, Satelitarna, Satelitarna +
Drzewostany. Ortofoto w ciemnym motywie = normalne zdjęcie (nie negatyw). Jeśli etykiety BDL na ciemnym
podkładzie są nieczytelne, dodać tylko `.dark .map-overlay--forest { filter: brightness(1.1); }` (bez zmiany
odcieni).
**Commit:** `fix(map): filtr ciemnego motywu tylko dla podkladow - ortofoto bez negatywu, nakladki w oryginalnych kolorach`

---

### Krok 4. Zoom natywny, ostrość ortofoto, stała kolejność nakładek - S

> **ZROBIONE 2026-10-03.** `maxNativeZoom` (terenowa 17 -> do z19, szlaki 18 -> do z19), `detectRetina` dla
> ortofoto, stały `zIndex` nakładek (drzewostany 10, chronione 11, szlaki 15; podkład 1 - z kroku 3),
> `MapContainer maxZoom={19}`. Sprawdzone w przeglądarce (ekran 2x): ortofoto prosi o 512x512 zamiast 256;
> terenowa przybliża się do z19 (kafle z17 powiększone, 16/16 załadowanych); szlaki widoczne na z19.

**Problemy.** OpenTopoMap ma `maxZoom: 17`, więc po przełączeniu na mapę terenową nie da się przybliżyć dalej;
Szlaki znikają na z19. Wszystkie nakładki mają `zIndex: 10`, więc kolejność zależy od kolejności włączania
(komentarz przy `getMapOverlays` obiecuje co innego). Ortofoto na telefonie jest rozmyte.

**Pliki:** `src/data/mapLayers.ts`, `src/features/map/MapTileLayers.tsx`, `src/features/map/MapView.tsx`, testy.

**Kroki:**
1. Typy: `MapLayerDef` i `MapOverlayDef` dostają `maxNativeZoom?: number`; `MapLayerDef` dostaje
   `detectRetina?: boolean`; `MapOverlayDef` dostaje **wymagane** `zIndex: number`.
2. Dane:
   - `topo`: `maxNativeZoom: 17`, `maxZoom: 19` (kafle z17 powiększane);
   - `trails`: `maxNativeZoom: 18`, `maxZoom: 19`;
   - `satellite`: `detectRetina: true` (Leaflet dla WMS prosi wtedy o obraz 512 px na kafel 256 px - ostrzej,
     bez zmiany poziomów zoomu; **nie** dla OSM i BDL - drobny tekst i 4x więcej kafli);
   - `zIndex` nakładek (plamy pod liniami): `relief 5`, `fire 6` (zmienione w kroku 6), `forest 10`, `protected 11`, `bans 12`,
     `trails 15` (wartości dla przyszłych nakładek zarezerwowane już teraz w komentarzu).
3. `MapTileLayer`: `maxNativeZoom: def.maxNativeZoom`, `detectRetina: 'detectRetina' in def ? def.detectRetina : undefined`,
   `zIndex: overlay?.zIndex`.
4. `MapView.tsx`: `MapContainer` dostaje `maxZoom={19}` - zmiana podkładu nie "przeskakuje" zoomem.
5. Komentarz przy `getMapOverlays`: kolejność rysowania wynika z `zIndex`, nie z kolejności listy.
6. Testy (`mapLayers.test.ts`): unikalne `zIndex` nakładek; `trails.zIndex` > `forest.zIndex`;
   każdy `maxNativeZoom` <= `maxZoom`.

**Weryfikacja:** Terenowa -> przybliżenie do z19 działa (kafle lekko rozmyte powyżej z17); włączenie Szlaków
**przed** Drzewostanami - szlaki i tak nad drzewostanami; ortofoto na z18 ostrzejsze (porównanie zrzutów).
**Commit:** `feat(map): maxNativeZoom (terenowa do z19), ostrzejsze ortofoto, stala kolejnosc nakladek`

---

### Krok 5. Cache per nakładka: długi / krótki / bez cache - S

> **ZROBIONE 2026-10-03.** `MapOverlayDef.cache`, `getOverlayCachePolicy` (prefiks usługi zamiast hosta),
> trasa `map-overlays-short` (NetworkFirst, 5 s, 1 doba) w `sw.ts`, nowa pozycja w "Pamięć i dane".
> Weryfikacja na buildzie razem z krokiem 6 (pierwsza nakładka z `cache: 'short'`).

**Problem.** Zakazy wstępu i zagrożenie pożarowe zmieniają się codziennie. Dzisiejsza reguła (każdy host z
`MAP_OVERLAYS` -> CacheFirst 60 dni) pokazałaby offline zakaz sprzed tygodni - błędna informacja
bezpieczeństwa. Zakazy są na tym samym hoście co BDL, więc trzeba rozróżniać po **ścieżce usługi**.

**Pliki:** `src/data/mapLayers.ts`, `src/sw.ts`, `src/utils/storageInfo.ts`,
`src/features/tools/StorageInfoDrawer.tsx`, testy.

**Kroki:**
1. `MapOverlayDef.cache: 'long' | 'short' | 'none'` (wymagane). Obecne: `forest`, `protected`, `trails` = `'long'`.
2. Zamiast `isCacheableOverlayRequest(url): boolean`:
   ```ts
   export type OverlayCachePolicy = 'long' | 'short'
   // Prefiks usługi: dla XYZ część szablonu przed pierwszym "{", dla WMS cały adres usługi
   // (Leaflet dokleja tylko "?parametry"). Liczone raz przy imporcie.
   export function getOverlayCachePolicy(url: URL): OverlayCachePolicy | null {
     if (url.searchParams.get('REQUEST') === 'GetFeatureInfo') return null
     const overlay = overlayPrefixes.find(({ prefix }) => url.href.startsWith(prefix))?.overlay
     return overlay && overlay.cache !== 'none' ? overlay.cache : null
   }
   ```
3. `sw.ts`:
   - trasa `map-overlays` (bez zmian w strategii): `({ url }) => getOverlayCachePolicy(url) === 'long'`;
   - nowa trasa `map-overlays-short`: `NetworkFirst` (`networkTimeoutSeconds: 5`), `ExpirationPlugin`
     `maxEntries: 1000`, `maxAgeSeconds: 60 * 60 * 24` (1 dzień), `CacheableResponsePlugin({ statuses: [200] })`,
     ten sam `cacheKeyWillBeUsed` co nakładki (bez parametru `retry`).
4. `storageInfo.ts`: nowy wpis `{ name: 'map-overlays-short', label: 'Nakładki bieżące (zakazy, pożary)' }`;
   `StorageInfoDrawer.tsx`: opis w `CLEAR_DESCRIPTIONS`.
5. Testy:
   - `mapLayers.test.ts`: kafel BDL drzewostanów -> `'long'`; GetFeatureInfo -> `null`; ortofoto -> `null`;
     szlaki -> `'long'`; (po kroku 6) zakazy i pożary -> `'short'`;
   - `storageInfo.test.ts` i `StorageInfoDrawer.test.tsx` - nowa pozycja listy.

**Weryfikacja (build + preview):** w Application -> Cache Storage po obejrzeniu drzewostanów online jest wpis
w `map-overlays`; po kroku 6 zakazy trafiają do `map-overlays-short`.
**Commit:** `feat(map): polityka cache per nakladka - krotki cache (1 dzien) dla warstw zmiennych`

---

## Etap B - Nowe warstwy

### Krok 6. Nakładki "Zakazy wstępu" i "Zagrożenie pożarowe" (BDL) - S

> **ZROBIONE 2026-10-03.** Sprawdzone na buildzie nad nadl. Gościno (leśnictwo Grzybowo, zakazy do 31.12.2026):
> zakazy widoczne od z10, kafle zakazów i pożarów w `map-overlays-short`, drzewostanów w `map-overlays`.
> **Różnice względem planu wykryte przy weryfikacji:**
> - WMS rysuje zakazy na **żółto (`#ffff4d`)**, nie na czerwono, jak opisuje renderer REST - legenda poprawiona
>   na kolor zmierzony z pikseli kafla;
> - kolory pożarów w WMS to kolory REST rozjaśnione ~30% bielą (zmierzone: małe `#88ff4d`, brak `#4d9bff`;
>   duże `#ff4d4d` i średnie `#ffff4d` wyliczone tym samym przekształceniem);
> - pożary pokrywają cały region, więc dostały **`zIndex: 6`** (pod drzewostanami i zakazami, nie 13) - nad
>   nimi zielone tło zmieniało kolor zakazów.
> - Do kroku 12 (legenda): zakazy i "średnie" zagrożenie mają w WMS ten sam żółty - rozważyć `hue-rotate` dla
>   zakazów (z legendą liczoną po filtrze), żeby zakaz zawsze był jednoznaczny.

**Cel.** Legalność i bezpieczeństwo: czasowe zakazy wstępu do lasu (mandat) i strefy zagrożenia pożarowego.
To realizuje Fazę 29 pkt 4, krok 1.

**Pliki:** `src/data/mapLayers.ts`, testy.

**Kroki:**
1. `MapOverlayDef.id` += `'bans' | 'fire'`; nowe opcjonalne pole `legend?: { color: string; label: string }[]`
   (wykorzysta je krok 11-12).
2. Definicje:
   ```ts
   {
     id: 'bans',
     label: 'Zakazy wstępu',
     description: 'Okresowe zakazy wstępu do lasu (Lasy Państwowe), aktualizowane na bieżąco',
     urlTemplate: 'https://mapserver.bdl.lasy.gov.pl/ArcGIS/services/WMS_zakazy_wstepu_do_lasu/MapServer/WMSServer',
     attribution: '<a href="https://www.bdl.lasy.gov.pl">Bank Danych o Lasach</a>',
     minZoom: 10, maxZoom: 19, opacity: 0.6, zIndex: 12, cache: 'short',
     // WMS numeruje odwrotnie niż REST: 3 = zakazy (0-2 to granice leśnictw, nadleśnictw, RDLP).
     wms: { layers: '3', format: 'image/png', transparent: true },
     legend: [{ color: '#ff0000', label: 'Okresowy zakaz wstępu' }],
   },
   {
     id: 'fire',
     label: 'Zagrożenie pożarowe',
     description: 'Strefy zagrożenia pożarowego lasów - prognoza Lasów Państwowych',
     urlTemplate: 'https://mapserver.bdl.lasy.gov.pl/ArcGIS/services/WMS_zagrozenie_pozarowe_w_lasach/MapServer/WMSServer',
     attribution: '<a href="https://www.bdl.lasy.gov.pl">Bank Danych o Lasach</a>',
     minZoom: 8, maxZoom: 19, opacity: 0.35, zIndex: 13, cache: 'short',
     wms: { layers: '0', format: 'image/png', transparent: true },
     legend: [
       { color: '#ff0000', label: 'Duże' }, { color: '#ffff00', label: 'Średnie' },
       { color: '#55ff00', label: 'Małe' }, { color: '#0070ff', label: 'Brak zagrożenia' },
     ],
   },
   ```
3. Kolejność w `MAP_OVERLAYS`: Drzewostany, Obszary chronione, **Zakazy wstępu**, Zagrożenie pożarowe, Szlaki
   (do czasu panelu z grupami - krok 11 - menu pokazuje listę w tej kolejności).
4. Testy (`mapLayers.test.ts`): `getOverlayCachePolicy` -> `'short'` dla obu; przykładowy kafel WMS zakazów
   (`?SERVICE=WMS&REQUEST=GetMap&LAYERS=3...`) **nie** jest `'long'`.

**Weryfikacja:**
- online: włączyć "Zakazy wstępu", przejść nad nadleśnictwo Gościno lub Głusko (aktywne zakazy 2026-10-03),
  zoom >= 11 - czerwone oddziały; "Zagrożenie pożarowe" - kolorowe strefy na całym regionie;
- preview + Cache Storage: kafle zakazów w `map-overlays-short`, nie w `map-overlays`;
- oba motywy: kolory zgodne z legendą (dzięki krokowi 3).

**Gotowe gdy:** obie nakładki działają, krótki cache potwierdzony. Odhaczyć Fazę 29 pkt 4 (krok 1) i Fazę 30 pkt 6.
**Commit:** `feat(map): nakladki "Zakazy wstepu" i "Zagrozenie pozarowe" (BDL) z krotkim cache`

---

### Krok 7. Nakładka "Rzeźba terenu" (cieniowanie NMT, GUGiK) - S

**Cel.** Cieniowanie z lotniczego skanowania laserowego pokazuje wąwozy, skarpy, zagłębienia, mokradła i
stare rowy pod koronami drzew - tego nie widać na ortofoto ani OSM.

**Pliki:** `src/data/mapLayers.ts`, `src/index.css`, testy.

**Kroki:**
1. `MapOverlayDef.id` += `'relief'`; opcjonalne `blend?: 'multiply'`.
2. Definicja:
   ```ts
   {
     id: 'relief',
     label: 'Rzeźba terenu',
     description: 'Cieniowanie z lotniczego skanowania laserowego - wąwozy, skarpy, mokradła i rowy pod drzewami',
     urlTemplate: 'https://mapy.geoportal.gov.pl/wss/service/PZGIK/NMT/GRID1/WMS/ShadedRelief',
     attribution: 'NMT &copy; <a href="https://www.geoportal.gov.pl">GUGiK</a>',
     minZoom: 11, maxZoom: 19, opacity: 0.45, zIndex: 5,
     // GUGiK zabrania gromadzenia kafli (jak ortofoto) - bez cache SW.
     cache: 'none',
     blend: 'multiply',
     wms: { layers: 'Raster', format: 'image/png', transparent: true },
   }
   ```
3. `MapTileLayer`: gdy `def.blend`, dopisać klasę `map-overlay--blend-multiply`.
4. CSS: `.map-overlay--blend-multiply { mix-blend-mode: multiply; }`. W ciemnym motywie multiply na ciemnym
   podkładzie prawie znika - punkt startowy do dobrania na żywo:
   `.dark .map-overlay--blend-multiply { mix-blend-mode: soft-light; opacity: 0.7 !important; }`.
5. Testy: `getOverlayCachePolicy` dla adresu NMT -> `null`; klasa blend w `MapTileLayers.test.tsx`.

**Weryfikacja:** Puszcza Bukowa, z13-15, Standardowa i Terenowa, oba motywy: rzeźba czytelna, nie zasłania
mapy; DevTools: odpowiedzi NMT nie trafiają do żadnego cache.
**Commit:** `feat(map): nakladka "Rzezba terenu" (cieniowanie NMT GUGiK, mix-blend multiply)`

---

### Krok 8. Podkład "Topograficzna (GUGiK)" - S

**Cel.** Polska mapa topograficzna: drogi leśne, przecinki, oddziały, bagna.

**Pliki:** `src/data/mapLayers.ts`, `src/index.css`, testy.

**Kroki:**
1. `MapLayerDef.id` += `'topoPl'`; definicja: `label: 'Topograficzna (GUGiK)'`,
   `urlTemplate: 'https://mapy.geoportal.gov.pl/wss/service/img/guest/TOPO/MapServer/WMSServer'`,
   `wms: { layers: 'Raster', format: 'image/jpeg', transparent: false }` (**JPEG: ~29 KB zamiast ~132 KB PNG**),
   `attribution: '&copy; <a href="https://www.geoportal.gov.pl">GUGiK</a>'`, `maxZoom: 19`,
   `offline: false` (zakaz harvestingu GUGiK - `getOfflineMapLayer` wraca wtedy do OSM, jak dla ortofoto).
2. Ustalić `maxNativeZoom` na żywo: przybliżać do z19 i sprawdzić, od którego poziomu obraz przestaje
   zyskiwać szczegóły (wpisać tę wartość).
3. CSS: `.dark .map-layer--topoPl` - jak `topo` (przyciemnienie, bez invert).
4. Testy: `getOfflineMapLayer('topoPl')` -> OSM; unikalne id.

**Weryfikacja:** przełączenie podkładu, oba motywy, rozsądny czas ładowania kafli (Network).
**Commit:** `feat(map): podklad "Topograficzna (GUGiK)" (WMS, JPEG)`

---

### Krok 9. Podkład "Dukty i ścieżki (CyclOSM)" - S

**Pliki:** `src/data/mapLayers.ts`, `src/index.css`, testy.

**Kroki:**
1. `MapLayerDef.id` += `'cyclosm'`; `urlTemplate: 'https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png'`,
   `attribution: 'Styl: <a href="https://www.cyclosm.org">CyclOSM</a> | Dane: &copy; OpenStreetMap contributors'`,
   `maxZoom: 19`, `offline: false` (serwer społecznościowy - bez masowego pobierania).
2. CSS: `.map-layer--cyclosm` - te same reguły co `street` (tint w jasnym, invert w ciemnym).
3. Testy: `getOfflineMapLayer('cyclosm')` -> OSM.

**Weryfikacja:** dukty leśne widoczne wyraźniej niż w Standardowej (Puszcza Bukowa, z14-16).
**Commit:** `feat(map): podklad "Dukty i sciezki" (CyclOSM)`

---

### Krok 10. Obszary chronione rozszerzone (+ opcjonalnie szlaki rowerowe) - S

**Kroki:**
1. `protected.wms.layers`: dodać `GDOS:UzytkiEkologiczne,GDOS:ZespolyPrzyrodniczoKrajobrazowe`.
   **Bez** Natury 2000 i parków krajobrazowych - tam zbiór grzybów jest dozwolony, byłby to fałszywy alarm.
2. `protected.description`: "Rezerwaty i parki narodowe (zbiór zakazany), użytki ekologiczne i zespoły
   przyrodniczo-krajobrazowe (sprawdź zakazy w uchwale)".
3. Legenda `protected`: kolory odczytać z `GetLegendGraphic` GDOŚ
   (`https://sdi.gdos.gov.pl/wms?SERVICE=WMS&REQUEST=GetLegendGraphic&FORMAT=image/png&LAYER=GDOS:Rezerwaty` itd.).
4. Opcjonalnie nakładka `cyclingTrails`: `https://tile.waymarkedtrails.org/cycling/{z}/{x}/{y}.png`,
   `zIndex: 16`, `cache: 'long'` (ten sam host co szlaki piesze).
5. Testy: zaktualizować oczekiwania w `mapLayers.test.ts`.

**Weryfikacja:** w okolicach Szczecina widoczne nowe formy ochrony; opis w menu.
**Commit:** `feat(map): obszary chronione - uzytki ekologiczne i zespoly przyrodniczo-krajobrazowe`

---

## Etap C - Wygląd

### Krok 11. Panel warstw zamiast sekcji w menu "Więcej" - M

**Cel.** Przy 6+ podkładach i 6+ nakładkach rozwijane menu przestaje być czytelne. Panel z miniaturami,
grupami, suwakiem przezroczystości i legendą.

**Pliki:** nowe `src/features/map/MapLayersPanel.tsx`, `src/features/map/overlayIcons.ts`,
`src/components/ui/slider.tsx`; zmiany `MapHeaderActions.tsx`, `MapView.tsx`, `MapTileLayers.tsx`,
`src/stores/appStore.ts`, `src/data/mapLayers.ts`; `public/map-previews/*`; testy.

**Kroki:**
1. **Slider**: `npx shadcn@latest add slider` (styl `base-nova`, base-ui ma `slider`); sprawdzić wygląd w obu
   motywach. (Dziś jedyny suwak to natywny `input type="range"` w `AmbientPlayer` - zostaje bez zmian.)
2. **Store** (`appStore.ts`, utrwalane w `partialize`):
   `overlayOpacity: Partial<Record<MapOverlayId, number>>` + `setOverlayOpacity(id, value)`;
   brak wpisu = `def.opacity`.
3. **MapTileLayer** dostaje `opacity?: number` (liczba = stabilna wartość, bez ryzyka przeładowań przy ticku
   GPS); `MapView` przekazuje `overlayOpacity[overlay.id] ?? overlay.opacity`.
4. **Dane**: `MapOverlayDef.group: 'teren' | 'przepisy' | 'turystyka'` (Teren: drzewostany, rzeźba;
   Przepisy: obszary chronione, zakazy, pożary; Turystyka: szlaki).
5. **Ikony** (`overlayIcons.ts`, lucide): drzewostany `TreePineIcon`, rzeźba `MountainIcon`, obszary chronione
   `ShieldAlertIcon`, zakazy `BanIcon`, pożary `FlameIcon`, szlaki `FootprintsIcon`.
6. **Miniatury podkładów**: skrypt `scripts/map-previews.mjs` pobiera **jeden** kafel z13 nad Puszczą Bukową
   dla każdego podkładu i zapisuje `public/map-previews/<id>.png` (<= 30 KB każdy, trafiają do precache, działają
   offline). Alternatywa bez pobierania - patrz "Decyzje".
7. **MapLayersPanel** (`Drawer`, ten sam wzorzec co `SpotManager`: z prawej na `lg:`, z dołu na telefonie):
   - "Podkład": siatka kart z miniaturą i nazwą, zaznaczenie `ring-2 ring-primary`, `role="radiogroup"`;
   - "Nakładki" w grupach: ikona, nazwa, opis, przełącznik; po włączeniu rozwija się suwak przezroczystości
     (`aria-label="Przezroczystość: <nazwa>"`) i legenda (kolorowe kwadraty z `legend`);
   - gdy bieżący zoom < `minZoom` nakładki: "Widoczna od przybliżenia N" + przycisk "Przybliż"
     (`map.flyTo(map.getCenter(), minZoom)` - `MapView` przekazuje `getZoom` i `onZoomTo` przez `mapRef`).
8. **Przycisk "Warstwy"** w wierszu nagłówka mapy (`MapHeaderActions`, obok "Grzybowiska"): `LayersIcon` +
   plakietka z liczbą włączonych nakładek; z menu "Więcej" usunąć sekcje "Warstwa mapy" i "Nakładki"
   (props `mapLayerId`, `onChangeMapLayer`, `mapOverlayIds`, `onToggleMapOverlay` przenoszą się do panelu).
9. **Testy:**
   - nowy `MapLayersPanel.test.tsx`: zmiana podkładu woła `setMapLayerId`; przełączenie nakładki; suwak zmienia
     `overlayOpacity`; podpowiedź "Widoczna od przybliżenia" przy zoomie < `minZoom`; grupy i legenda;
   - `MapHeaderActions.test.tsx`: usunąć przypadki sekcji warstw, dodać przycisk "Warstwy" z licznikiem;
   - `MapView.test.tsx`: panel otwiera się z nagłówka;
   - e2e: sprawdzić, czy żaden scenariusz nie używa starego menu warstw (dziś nie używa).

**Weryfikacja:** telefon (DevTools device mode, 390 px) i desktop; oba motywy; suwak realnie zmienia
przezroczystość; po przeładowaniu ustawienia zostają.
**Commit:** `feat(map): panel warstw - miniatury podkladow, nakladki w grupach, suwak przezroczystosci, legenda`

---

### Krok 12. Legenda na mapie - S

**Pliki:** nowy `src/features/map/MapLegend.tsx`, `MapView.tsx`, `index.css`, test.

**Kroki:**
1. Mała, zwijana "pastylka" w lewym dolnym rogu (nad komunikatami `MapOverlayMessages`), tylko dla włączonych
   nakładek, które mają `legend` (zakazy, pożary, obszary chronione).
2. Styl jak `.leaflet-control-attribution` (karta, `--shadow-card`, `--radius-md`); stan zwinięcia w
   `localStorage` (wygoda, nie dane).
3. Offline i nakładka z `cache: 'short'`: dopisek "offline - stan sprzed max 1 dnia".
4. Test: legenda pojawia się po włączeniu `bans`, znika po wyłączeniu; dopisek offline przy `navigator.onLine = false`.

**Commit:** `feat(map): legenda wlaczonych nakladek na mapie`

---

### Krok 13. Skala i płynne przejścia - S

**Pliki:** `MapView.tsx`, `MapLayers.tsx`, nowy `src/utils/mapMotion.ts`, `index.css`, testy.

**Kroki:**
1. `<ScaleControl position="bottomleft" imperial={false} />` (react-leaflet); styl
   `.leaflet-control-scale-line` na tokenach (tło karty, linia w `--color-foreground`).
2. `utils/mapMotion.ts`:
   ```ts
   const prefersReducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
   export function moveMap(map: L.Map, center: L.LatLngExpression, zoom: number) {
     if (prefersReducedMotion()) map.setView(center, zoom)
     else map.flyTo(center, zoom, { duration: 0.8 })
   }
   export function moveMapToBounds(map: L.Map, bounds: L.LatLngBoundsExpression, maxZoom: number) { /* analogicznie: fitBounds / flyToBounds, padding 40 px */ }
   ```
3. Użycie: `RecenterOnLocate` (`setView` -> `moveMap`), klik w klaster (`setView(zoom + 2)` ->
   `moveMapToBounds` punktów klastra), "Pokaż na mapie" w `SzczecinSpotsPanel`.
4. Testy: `mapMotion.test.ts` (mock mapy: `flyTo` vs `setView` zależnie od `matchMedia`);
   `MapLayers.test.tsx` - zaktualizować oczekiwania `setView`.

**Commit:** `feat(map): skala metryczna i plynne przejscia (flyTo, z poszanowaniem reduced-motion)`

---

## Etap D - Funkcje oparte na nowych warstwach

### Krok 14. "Czy tu wolno?" - karta po dotknięciu i ostrzeżenie przy zapisie - M

**Cel.** Faza 29 pkt 4, krok 2. Dotknięcie mapy pokazuje, czy w tym miejscu jest zakaz wstępu lub obszar
chroniony; przy zapisie znaleziska apka ostrzega.

**Zasada prywatności (jak drzewostan przy znalezisku):** zapytanie o punkt idzie do BDL/GDOŚ **tylko gdy
odpowiednia nakładka jest włączona**. Bez tego nic nie jest wysyłane.

**Pliki:** nowy `src/utils/forestBans.ts`, `ForestStandPopup.tsx` (uogólnienie na `MapPointInfoPopup`),
`AddFindingForm.tsx`, testy.

**Kroki:**
1. `utils/forestBans.ts`: `fetchForestBanAt(lat, lon, signal)` - REST
   `https://mapserver.bdl.lasy.gov.pl/ArcGIS/rest/services/WMS_zakazy_wstepu_do_lasu/MapServer/0/query`
   z `geometry=lon,lat`, `geometryType=esriGeometryPoint`, `inSR=4326`, `spatialRel=esriSpatialRelIntersects`,
   `outFields=nazwa_nadl,lesnictwo,kod,data_koncowa`, `returnGeometry=false`, `f=json`
   (REST: warstwa **0** = zakazy). Parsowanie: przycięcie spacji, data `DD-MM-YYYY`, błąd ArcGIS jako HTTP 200
   z polem `error` (wzór: `forestStandSearch.ts`).
2. Obszary chronione: sprawdzić `GetFeatureInfo` na `sdi.gdos.gov.pl/wms` (CORS `*`, format
   `application/json`); jeśli działa - `fetchProtectedAreaAt`.
3. Karta po dotknięciu (dziś `ForestStandPopup` przy włączonych Drzewostanach): wspólny popup z sekcjami
   zależnymi od włączonych nakładek - "Drzewostan", "Zakaz wstępu do DD.MM.RRRR (Nadleśnictwo X)",
   "Rezerwat X - zbiór zakazany".
4. Zapis znaleziska (`AddFindingForm`, po zapisie, jak `attachForestStand`): jeśli nakładka zakazów włączona i
   punkt w zakazie - `toast.warning` "To miejsce jest objęte okresowym zakazem wstępu do DD.MM.RRRR".
   Niekrytyczne: błąd sieci = brak komunikatu.
5. Testy: parsowanie odpowiedzi (zakaz / brak / błąd ArcGIS); popup pokazuje sekcję zakazu tylko przy
   włączonej nakładce; ostrzeżenie przy zapisie (mock `fetchForestBanAt`).

**Weryfikacja:** online nad aktywnym zakazem (Gościno/Głusko) - karta pokazuje datę końcową; bez włączonej
nakładki - w Network brak zapytań do usługi zakazów.
**Commit:** `feat(map): "czy tu wolno" - zakaz wstepu i obszar chroniony w karcie punktu oraz przy zapisie`

---

### Krok 15. Wielokąty "Gdzie szukać" na mapie + wyniki offline - M

**Cel.** Faza 30 pkt 14 i dokończenie Fazy 29 pkt 2: wyniki wyszukiwania drzewostanów widać na mapie, a
ostatnie wyszukiwanie działa bez zasięgu.

**Pliki:** `src/utils/forestStandSearch.ts`, `NearbyStandsSection.tsx`, `appStore.ts`, `MapView.tsx`,
nowy `src/features/map/StandSearchLayer.tsx`, ewentualnie `src/db/db.ts`, testy.

**Kroki:**
1. `parseStandSearch` zachowuje uproszczoną geometrię (`polygon: [number, number][]`) obok środka.
2. Store (nieutrwalany): `standSearch: { speciesName: string; stands: MatchingStand[] } | null`.
3. W `NearbyStandsSection` przycisk "Pokaż na mapie": zapis wyników do store, przejście na Mapę.
4. `StandSearchLayer` (react-leaflet `Polygon`): obrys w kolorze `--color-primary`, wypełnienie 15%, popup z
   drzewem, wiekiem i "Prowadź" (ta sama funkcja zapisu grzybowiska co w panelu); przycisk "Wyczyść" w
   `MapOverlayMessages`.
5. Offline: tabela Dexie `standSearches` (nowa wersja bazy) z kluczem `speciesId + pozycja zaokrąglona do
   ~1 km`, ważność 30 dni; przy braku sieci `NearbyStandsSection` pokazuje ostatni wynik z dopiskiem
   "zapisane DD.MM".
6. Testy: parsowanie geometrii; warstwa renderuje N wielokątów; odczyt z cache przy błędzie sieci.

**Commit:** `feat(map): wyniki "Gdzie szukac" jako wielokaty na mapie i dostepne offline`

---

## Etap E - Później (backlog, bez kolejności)

- Klaster jako pierścień udziałów jadalności (`conic-gradient`, kolory `edibilityChartColor`; klaster z
  trującymi wyróżniony).
- Wspólny `MapPopupCard` dla popupów (tytuł z glifem, linia meta, przyciski `Button size="sm"`).
- Stożek kierunku przy kropce pozycji (`useDeviceHeading` już istnieje).
- Poświata pod śladem wyprawy (druga, szersza linia pod `Polyline`) dla czytelności na ortofoto.
- Pasek ładowania warstw WMS (zdarzenia `loading`/`load`) - BDL i GUGiK bywają wolne.
- Płynne przejście przy zmianie podkładu (stara warstwa zostaje do `load` nowej).
- Zwijana atrybucja (przycisk "i") przy wielu nakładkach.
- Przyciemnienie terenu poza województwem (maska `Polygon` z dziurą).
- Radar opadów RainViewer (M; licencja tylko do użytku osobistego, `maxNativeZoom: 7`, bez cache).
- Offline'owa paczka drzewostanów okolic Szczecina (Faza 29 pkt 9) - miejsce na przełącznik w panelu warstw.

---

## Decyzje do podjęcia przez użytkownika

| # | Krok | Pytanie | Rekomendacja |
|---|---|---|---|
| 1 | 2 | Przejść z `{s}.tile.openstreetmap.org` na `tile.openstreetmap.org` (zalecane przez OSM)? Wymaga ponownego pobrania obszarów offline. | Tak, ale **po** kroku 1 i w jednym commicie z migracją regexu. |
| 2 | 11 | Miniatury podkładów z prawdziwych kafli (skrypt, ~6 plików po <= 30 KB) czy same ikony/kolory? | Kafle - użytkownik od razu widzi, czym różnią się podkłady. |
| 3 | E | Radar RainViewer przy licencji "tylko użytek osobisty"? | Dopiero gdy apka nie trafia do sklepu (Google Play zmienia ocenę). |
| 4 | 6 | `minZoom` zakazów: 10 (widać cały region) czy 12 (mniej zapytań)? | 10 - zakazy to informacja, którą trzeba zobaczyć przed wyjazdem. |

---

## Podsumowanie wysiłku

| Etap | Kroki | Szacunek |
|---|---|---|
| A - naprawy | 1-5 | 5 x S (~1 dzień) |
| B - nowe warstwy | 6-10 | 5 x S (~1 dzień) |
| C - wygląd | 11-13 | M + 2 x S (~1,5 dnia) |
| D - funkcje | 14-15 | 2 x M (~1,5 dnia) |

Najpierw Etap A: dwa realne błędy (kroki 1 i 3) dotyczą obietnicy "działa offline" i czytelności mapy nocą.
