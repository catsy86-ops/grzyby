# Grzybobranie - o aplikacji

Stan na 2026-10-03. Krótki opis tego, jak działa aplikacja, co potrafi i czym różni się od innych aplikacji
dla grzybiarzy. Szczegóły techniczne: `README.md`, historia i plany: `docs/ROADMAP.md`.

---

## W jednym zdaniu

Darmowy dziennik grzybiarza z mapą lasów, który działa bez internetu i bez konta: zapisuje znaleziska na
telefonie, podpowiada, gdzie i kiedy szukać, rozpoznaje grzyby ze zdjęcia bezpośrednio w telefonie i pilnuje
bezpieczeństwa w lesie. Nastawiony na Szczecin i województwo zachodniopomorskie.

---

## Jak działa

- **Aplikacja webowa instalowana jak zwykła apka (PWA).** Otwiera się w przeglądarce, można ją dodać do
  ekranu głównego; na Androida jest też wersja z widżetem (`android/`). Nie wymaga sklepu z aplikacjami.
- **Wszystkie dane zostają na telefonie** (baza w przeglądarce, IndexedDB). Nie ma konta, serwera ani
  synchronizacji. Kopia zapasowa to eksport do pliku (JSON) - apka sama przypomina o nim co 30 dni i prosi
  przeglądarkę, żeby nie kasowała danych przy braku miejsca.
- **Działa offline.** Po pierwszym uruchomieniu aplikacja i atlas ze zdjęciami są w pamięci telefonu, a model
  rozpoznawania - po pierwszym użyciu skanera. Mapę wybranego obszaru (do 10 km) pobiera się przed wyjściem; obejrzane nakładki (drzewostany,
  obszary chronione, szlaki) też zostają dostępne bez zasięgu.
- **Rozpoznawanie ze zdjęcia liczy się w telefonie** (TensorFlow.js) - zdjęcie nigdzie nie jest wysyłane.
- **Zewnętrzne, darmowe źródła danych** są używane tylko wtedy, gdy są potrzebne:

| Co wychodzi z telefonu | Dokąd | Kiedy |
|---|---|---|
| Numery kafli mapy | OpenStreetMap, OpenTopoMap, Geoportal (GUGiK) | przy przeglądaniu mapy |
| Pozycja | Open-Meteo (pogoda) | prognoza "czy warto iść", ostrzeżenie przed burzą w trakcie wyprawy, sprawdzenie deszczu na koniec wyprawy |
| Punkt na mapie | Bank Danych o Lasach | tylko gdy włączona nakładka "Drzewostany" (karta "co tu rośnie", drzewostan przy znalezisku) |
| Pozycja | Bank Danych o Lasach | tylko po naciśnięciu "Szukaj drzewostanów w pobliżu" |

Bez kluczy API, bez reklam, bez analityki i śledzenia.

---

## Funkcje

### Mapa
- Znaleziska ze zdjęciem, gatunkiem, liczbą sztuk, wagą i notatką (także dyktowaną głosem); zapis jednym
  przyciskiem, także ze skrótu na ekranie głównym albo przez "Udostępnij" zdjęcie z galerii.
- Grzybowiska (ulubione miejsca) z prognozą grzybową dla każdego miejsca, oznaczeniem "sprawdzić w przyszłym
  sezonie" (przypomnienie i eksport do kalendarza) i rankingiem "dziś warto sprawdzić".
- Nawigacja: powrót do auta, prowadzenie do grzybowiska (kierunek i odległość), kompas działający bez sieci.
- Ślad GPS wyprawy, mapa cieplna znalezisk, pierścień sezonowości (gdzie w tym miesiącu znajdowałeś grzyby
  w poprzednich latach), filtr gatunków, lista zamiast mapy.
- Podkłady: standardowy, terenowy, zdjęcia lotnicze (GUGiK). Nakładki: drzewostany (Bank Danych o Lasach),
  obszary chronione (rezerwaty i parki narodowe - zbiór zakazany), szlaki piesze.
- "Co tu rośnie": dotknięcie lasu pokazuje gatunek i wiek drzew, typ siedliska i grzyby z atlasu typowe dla
  tych drzew.
- Pobieranie obszaru offline, tryb oszczędzania baterii (automatycznie poniżej 20%), 6 polecanych miejsc
  w okolicach Szczecina.

### Rozpoznaj
- Zdjęcie -> kilka najbardziej prawdopodobnych gatunków z pewnością w procentach, kolorem jadalności i
  ostrzeżeniem o sobowtórach; "Dodaj do dziennika" jednym przyciskiem.
- **Uczciwe granice skanera:** poniżej 40% pewności wynik jest wstrzymany (bez nazwy gatunku); apka mówi,
  których gatunków atlasu skaner nie zna, i ostrzega, gdy wynik ma niebezpiecznego sobowtóra spoza modelu
  (np. opieńka -> zasłonak rudy).

### Dziennik
- Znaleziska i wyprawy (planowany powrót, czy padał deszcz, liczba gatunków), wyszukiwanie, filtry (gatunek,
  daty, drzewostan), sortowanie.
- Statystyki i wykresy (miesiące, gatunki, najlepsze miejscówki), podsumowanie sezonu i porównanie rok do roku,
  osiągnięcia.
- Drzewostan przy znalezisku ("najczęściej pod bukiem"), waga po suszeniu, śledzenie zjedzonych grzybów
  (z listą kontrolną sobowtórów przed oznaczeniem "zjedzone").
- Eksport: JSON (kopia), CSV (Excel), PDF, GPX (trasa); import JSON z wykrywaniem duplikatów; cofanie usunięcia.

### Baza wiedzy
- Atlas 45 gatunków: jadalność, opis, siedlisko, sezon (pasek 12 miesięcy), ochrona prawna, sobowtóry z
  porównaniem obok siebie, porady kulinarne, karta gatunku do PDF.
- Filtry: jadalność, w sezonie, chronione, typ lasu; wyszukiwanie bez polskich znaków ("gaska" znajduje "Gąska").
- **Leśny asystent:** wybierasz gatunek -> sezon, pogoda dziś i na kilka dni, Twoje miejsca, w których go
  znalazłeś, oraz **"Gdzie szukać"**: najbliższe drzewostany z drzewami, pod którymi rośnie (dane Banku Danych o
  Lasach), z filtrem wieku i nawigacją.
- Quiz "który to?" na parach sobowtórów, porównanie dowolnych dwóch gatunków.

### Narzędzia i bezpieczeństwo
- Karta awaryjna (grupa krwi, alergie, kontakt) z SMS-em z lokalizacją - działa także bez GPS.
- Ostrzeżenie o przekroczonym planowanym powrocie z wyprawy (z gotowym SMS-em), ostrzeżenie przed burzą i
  silnym wiatrem w trakcie wyprawy.
- Pierwsza pomoc przy podejrzeniu zatrucia (z przyciskiem 112), kleszcze, lista sprzętu, minutnik do gotowania.
- Tryb "W lesie" (duże przyciski, wysoki kontrast - na rękawiczki), ciemny motyw, wibracje, leśny ambient.
- Centrum powiadomień, "Pamięć i dane" (zajęte miejsce, czyszczenie map, ochrona danych).

---

## Czym się wyróżnia

1. **Prywatność bez kompromisów.** Bez konta, serwera, reklam i śledzenia. Tajne miejscówki nie opuszczają
   telefonu; zapytania o punkt na mapie idą do Banku Danych o Lasach tylko przy świadomie włączonej nakładce.
2. **Mapa lasu, nie tylko mapa terenu.** Dane o drzewostanach z Banku Danych o Lasach połączone z atlasem:
   "co tu rośnie" po dotknięciu lasu, drzewostan zapisywany przy znalezisku, statystyka "pod jakimi drzewami
   znajdujesz" i wyszukiwanie "gdzie szukać" po gatunku drzew.
3. **Legalność na mapie.** Obszary chronione (zakaz zbioru) jako nakładka; w planie (Faza 30) okresowe zakazy
   wstępu do lasu i zagrożenie pożarowe z danych Lasów Państwowych.
4. **Bezpieczeństwo jako funkcja, nie przypis.** Skaner wstrzymuje niepewne wyniki i przyznaje, czego nie zna;
   sobowtóry pokazywane są wszędzie tam, gdzie pada nazwa gatunku; lista kontrolna przed zjedzeniem; karta
   awaryjna, planowany powrót, ostrzeżenia pogodowe.
5. **Kiedy i gdzie iść.** Prognoza grzybowa z pogody (opady, temperatura, wilgotność gleby) dla Twojej pozycji
   i dla każdego grzybowiska, sezonowość Twoich miejsc, ranking "dziś warto sprawdzić".
6. **Dziennik dla kogoś, kto zbiera latami.** Wyprawy, ilości, wagi, suszenie, drzewostany, porównanie
   sezonów, eksport do arkusza i GPX.
7. **Za darmo i bez instalacji ze sklepu.** Aplikacja webowa: działa na Androidzie, iPhonie i komputerze,
   aktualizuje się sama.
8. **Lokalnie.** Region Szczecina i województwa zachodniopomorskiego, polecane miejsca w okolicy.

---

## Na tle innych aplikacji

Porównanie na podstawie opisów producentów i zestawień z 2025-2026 (źródła niżej). "?" = brak informacji
w opisie, nie "brak funkcji".

| | **Grzybobranie** | Grzybiarz | Picture Mushroom | Atlasy (Na grzyby, Atlas Grzybów) |
|---|---|---|---|---|
| Rozpoznawanie ze zdjęcia | tak, w telefonie (alpha, 19 gatunków) | tak, w telefonie (wykrywanie owocników + rozpoznawanie gatunku) | tak, w chmurze | nie (atlas / klucz) |
| Atlas | 45 gatunków | 125 gatunków | bardzo duży | 170-200+ gatunków |
| Mapa offline | pobierany obszar do 10 km | wektorowe mapy całej Polski (~1,3 GB) | nie | częściowo (np. miejsce parkowania) |
| Drzewostany | tak, + "co tu rośnie" i "gdzie szukać" | tak (na mapie) | nie | nie |
| Obszary chronione / zakazy | tak (chronione), zakazy w planie | ? | nie | nie |
| Dziennik i wyprawy | rozbudowany + eksport JSON/CSV/PDF/GPX | sesje, ślad GPS, GPX | historia rozpoznań | nie |
| Konto | nie | tak (synchronizacja wypraw) | ? | ? |
| Cena | darmowa, bez reklam | ? | abonament (ok. 30 USD/rok) | darmowe |
| Platformy | przeglądarka/PWA (także iPhone), Android | Android, iOS (testy), web | Android, iOS | ? |

**Gdzie Grzybobranie ustępuje (do nadrobienia):**
- **Skaner** zna dziś 19 z 45 gatunków atlasu (~69% trafień na zbiorze walidacyjnym) - retrening na pełny
  atlas to Etap 2 Fazy 28.
- **Atlas** jest mniejszy (45 gatunków wobec 125-250 w innych aplikacjach).
- **Mapa offline** to pobrany obszar kafli, a nie mapa całego kraju; nakładki offline tylko tam, gdzie się
  już oglądało.
- **Brak synchronizacji** między urządzeniami - jedyną kopią jest eksport do pliku (świadomie odłożone).
- **Region** mapy ograniczony do Szczecina i województwa zachodniopomorskiego.

---

## Liczby

| | |
|---|---|
| Gatunki w atlasie | 45 |
| Gatunki znane skanerowi | 19 + klasa "to nie grzyb" |
| Testy automatyczne | 812 jednostkowych i komponentów + 4 scenariusze E2E (Playwright, w CI) |
| Technologia | React 19 + TypeScript, Vite, Leaflet, Dexie (IndexedDB), TensorFlow.js, Workbox |

---

## Źródła porównania

Stan stron na 2026-10-03:
- [Grzybiarz - strona aplikacji](https://grzybiarz.app/)
- [Aplikacja do rozpoznawania grzybów (TOP 7) - Komputronik](https://nano.komputronik.pl/n/ktora-aplikacja-do-rozpoznawania-grzybow-jest-najlepsza/)
- [Picture Mushroom: Identifier - App Store](https://apps.apple.com/us/app/picture-mushroom-identifier/id1474578078)
- [Picture Mushroom - opis i cennik (mwm.ai)](https://mwm.ai/apps/picture-mushroom-identifier/1474578078)
- [Jaka aplikacja do rozpoznawania grzybów? - Interia GeekWeek](https://geekweek.interia.pl/technologia/news-jaka-aplikacja-do-rozpoznawania-grzybow-z-nimi-sie-nie-zatru,nId,7826736)
