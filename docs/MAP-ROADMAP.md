# Plan rozbudowy mapy - propozycje do wyboru

Wygenerowane 2026-09-17 przez dwóch równoległych agentów (funkcje/UX grzybiarza w terenie +
strona techniczna/architektura), na bazie stanu mapy PO sesji poprawek tego samego dnia (patrz
`ROADMAP.md` i historia commitów - kontrolki Leaflet na tokenach motywu, animacje markerów,
usuwanie znaleziska z popupu, `maxBounds` do woj. zachodniopomorskiego, naprawiony race w
`RecenterOnLocate`, poprawka GPS spoza regionu).

**To jest materiał do przejrzenia i wyboru, nic z tego nie zostało zaimplementowane.** Żaden
punkt nie jest pilny - projekt jest solowy/hobbystyczny, obecna skala daleko od granic
opisanych tu mechanizmów.

---

## Część 1: Nowe funkcje (perspektywa grzybiarza w terenie)

### Warte zrobienia szybko

1. **Nawigacja do zapisanego grzybowiska** (nie tylko do auta). Dziś dystans/kierunek działa
   wyłącznie dla punktu powrotu - `getBearingDegrees`/`getDistanceMeters` z `utils/bearing.ts`
   już istnieją, wystarczy dodać wybór celu (aktywny spot) i badge analogiczny do tego z auta.
   Złożoność: **mała**, zero nowych zależności.

2. **Prognoza grzybowa per zapisane grzybowisko**, nie tylko bieżąca pozycja użytkownika. Dziś
   `useMushroomOutlook` liczy się tylko "tu i teraz" - nie da się sprawdzić z kanapy "czy warto
   jechać na Grzybowisko X". Ten sam `fetchMushroomOutlook(lat, lng)` wywołany per spot (z
   cache'em, żeby nie pruć limitu darmowego API Open-Meteo przy każdym otwarciu SpotManagera).
   Naturalne rozszerzenie karty spotu w `SpotManager.tsx`. Złożoność: **mała/średnia**.

3. **Ślad GPS z wyprawy** (trasa, nie tylko punkt startu/końca). `watchPosition` już działa w
   `useMapGeolocation`, trzeba dodać zapis punktów trasy do IndexedDB podczas aktywnej wyprawy
   (koncept `useActiveTrip` już istnieje) i narysować `Polyline` (natywny komponent
   react-leaflet, zero nowej zależności). Uwaga na throttling zapisu (np. co ~20m, nie co tick)
   ze względu na baterię/pamięć przy długich wyprawach. Złożoność: **średnia**.

### Większe, do przemyślenia

4. **Heatmapa własnych znalezisk** ("gorące miejsca"). Wymaga nowej zależności (`leaflet.heat`
   lub ręczna implementacja przez `CircleMarker` z opacity wg gęstości). Dane już są. Ryzyko:
   przy małej liczbie znalezisk (typowe dla solowego użytkownika) może wyglądać ubogo - warto
   próg minimalnej liczby punktów zanim się włączy. Złożoność: **średnia**.

5. **Sezonowość gatunków jako nakładka na mapie** (kolor/pulsowanie spotu wg tego, czy w tym
   miesiącu historycznie coś tam rosło) - łączy `season` gatunku (Encyklopedia) z historią
   konkretnego spotu (`createdAt`+`speciesId` w Findings). Ryzykowne przy małej próbce danych
   (1 znalezisko z zeszłego roku != pewność) - sensowne dopiero gdy Dziennik ma realną historię.
   Złożoność: **średnia/duża**.

6. **Współdzielenie znaleziska/grzybowiska** (link/obraz do wysłania znajomemu). Apka jest
   offline-first bez własnego backendu - nie ma gdzie hostować danych pod linkiem. Realistyczna
   wersja: eksport jako obraz (`html2canvas`, już w zależnościach) + `navigator.share()`, NIE
   prawdziwy deep-link. Do doprecyzowania z użytkownikiem, czego dokładnie oczekuje, zanim się
   to zbuduje. Złożoność: **średnia**.

7. **Warianty podkładu mapy** (teren/satelitarna). Widok topograficzny realnie pomaga ocenić
   zalesienie z góry. Technicznie prosty przełącznik `TileLayer` URL (np. darmowy OpenTopoMap),
   ale satelitarne kafle bez klucza (Esri World Imagery ma darmowy tier z ograniczeniami
   licencyjnymi do sprawdzenia) i trzeba rozszerzyć `OfflineAreaDownload.tsx` o wybraną warstwę.
   Złożoność: **mała technicznie, koliduje z offline download**.

8. **Powiadomienia kontekstowe geofencingowe** ("wchodzisz w obszar ulubionego grzybowiska") -
   **rekomendacja: pominąć**. Background Geolocation ma słabe wsparcie mobile (szczególnie iOS
   Safari), a apka i tak jest aktywnie otwarta podczas wyprawy - koszt/złożoność nie odpowiada
   wartości.

---

## Część 2: Strona techniczna / architektura

### Warte rozważenia

1. **Ciągły `watchPosition` z `enableHighAccuracy: true` bez throttlingu**
   (`src/utils/geolocation.ts:64`, uruchamiany w `useMapGeolocation.ts:38` na cały czas życia
   zakładki Mapy). To apka do wielogodzinnego chodzenia po lesie z otwartą mapą - ciągły GPS
   wysokiej dokładności to zauważalny drenaż baterii, dokładnie w scenariuszu ze słabszym
   zasięgiem/sygnałem. Kierunek: throttling po ustabilizowaniu pozycji (np. przejście na
   `enableHighAccuracy: false` gdy pozycja się nie zmienia) lub pauza przez Page Visibility API
   gdy karta w tle. Nakład: **średni**.

2. **Brak testów dla `OfflineAreaDownload.tsx` i `SzczecinSpotsPanel.tsx`** - jedyne dwa pliki w
   `features/map/` bez dedykowanego `*.test.tsx`, mimo realnej logiki (retry/abort/progress
   pobierania kafelków; filtrowanie i "Pokaż na mapie"). `OfflineAreaDownload` jest krytyczna dla
   użycia bez zasięgu w lesie - cicha regresja tu boli najbardziej. Nakład: **średni** (offline,
   mock Cache API/fetch), **mały** (panel).

### Niski priorytet / czysto kosmetyczne

3. **Artefakt algorytmu klasteryzacji** - `clusterFindings.ts:24-32` grupuje kubełkowo po
   `floor(x/distancePx)`; dwa punkty tuż po obu stronach granicy kubełka nie łączą się mimo
   bliskości na ekranie. Wydajność jest w porządku (O(n), liczone tylko przy zmianie zoomu) -
   przy realnej skali projektu nieistotne, czysto wizualna niedoskonałość.

### Sprawdzone hipotezy, które NIE wypaliły (żeby nikt do nich nie wracał)

4. **"Jeden przycisk pobierz cały obszar offline"** skoro `maxBounds` już ogranicza region -
   **odrzucone**. Region zachodniopomorskie to ~270x270 km, przy zoom 13-16 to dziesiątki/setki
   tysięcy kafelków, drastycznie ponad `MAX_TILES_PER_DOWNLOAD=4500` w `offlineMapTiles.ts:26`
   (limit dobrany pod obecny największy preset, 10 km ~= 3940 kafelków). Obecny mechanizm
   (promień wokół aktualnego widoku) zostaje słuszny bez zmian.

### Bez zastrzeżeń (sprawdzone, solidne)

`useSunsetCountdown`/`useMushroomOutlook` poprawnie sprzątają interwały; `RecenterOnLocate`/
`MapInstanceCapture` w `MapLayers.tsx` mają kompletny cleanup (w tym świeżo naprawiony race z
remountem); `useReturnPointTracking` czysty; indeks `spotId` w Dexie pokrywa jedyne realne
zapytanie po nim; `db.findings.toArray()` bez indeksu na lat/lng jest w porządku przy tej skali
(lokalna baza, klasteryzacja w pamięci po stronie klienta).

---

## Sugerowany punkt startowy (subiektywna ocena)

Najwyższy stosunek wartość/koszt: **funkcja 1 (nawigacja do grzybowiska)** i **funkcja 2
(prognoza per spot)** z Części 1 - małe, zero nowych zależności, bezpośrednio reużywają już
istniejący kod. Z Części 2 warto **najpierw** ustalić throttling GPS (pkt 1) - jedyny punkt
techniczny z realnym wpływem na doświadczenie w terenie (bateria).
