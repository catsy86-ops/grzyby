# Grzybobranie — dziennik grzybiarza

PWA (Progressive Web App) do zbierania grzybów: mapa znalezisk, rozpoznawanie gatunków ze zdjęcia (on-device AI), dziennik zbiorów i baza wiedzy o gatunkach. Działa w pełni offline — dane zapisywane są lokalnie w przeglądarce (IndexedDB), bez konta i bez backendu.

## Uruchomienie

```bash
npm install
npm run dev       # tryb deweloperski (Service Worker nieaktywny)
npm run build     # build produkcyjny (tsc + vite)
npm run preview   # podgląd builda z aktywnym Service Workerem/PWA
npm run lint      # oxlint
npm test          # testy jednostkowe i komponentów (vitest)
npm run test:e2e  # scenariusze Playwright (e2e/)
```

## Funkcje

- **Mapa** — znaleziska, grzybowiska i punkt "auto" na mapie (Leaflet, region Szczecin i woj.
  zachodniopomorskie); warstwy: standardowa, terenowa, satelitarna (ortofoto GUGiK) oraz nakładki
  Drzewostany (BDL, z podglądem "co tu rośnie"), Obszary chronione (GDOŚ) i Szlaki; heatmapa znalezisk,
  filtr gatunków, nawigacja do auta i do zapisanego grzybowiska, ślad GPS wyprawy, pobieranie obszaru
  mapy do pracy offline, kompas, tryb oszczędzania baterii.
- **Rozpoznaj** — identyfikacja gatunku ze zdjęcia modelem TensorFlow.js działającym lokalnie
  (bez wysyłania zdjęć), z przejściem "Dodaj do dziennika".
- **Dziennik** — znaleziska i wyprawy, statystyki, wykresy, osiągnięcia, podsumowanie sezonu,
  filtry (gatunek, data, drzewostan), ilość i waga (także po suszeniu), eksport JSON/CSV/PDF/GPX
  i import JSON, przypomnienie o kopii zapasowej.
- **Baza wiedzy** — atlas 45 gatunków z jadalnością, sobowtórami, kalendarzem sezonu, "Leśny
  asystent", porównywarka gatunków i quiz sobowtórów.
- **Narzędzia** — karta ratunkowa (SMS z lokalizacją, 112), pierwsza pomoc, lista sprzętu,
  "Pamięć i dane" (pamięć offline i ochrona danych przed usunięciem przez przeglądarkę),
  odtwarzacz ambient.

Dane są tylko na urządzeniu (IndexedDB) — jedyną kopią poza nim jest ręczny eksport JSON.

## Powiadomienia i widget na Androida

- **Powiadomienia lokalne** — długa lub przeterminowana wyprawa, ostrzeżenie przed burzą/wiatrem,
  przypomnienie o grzybowisku "do sprawdzenia w sezonie". Działają przez Service Workera, bez
  backendu/push.
- **Widget na ekran główny Androida** — osobny natywny projekt w `android/` (WebView + mostek JS),
  patrz `android/README.md`. Wymaga zbudowania w Android Studio — nie jest częścią `npm run build`.

## Model rozpoznawania AI

Model (`public/models/model.json` + wagi, ładowany przez `src/utils/mushroomModel.ts`) to wersja
**alpha**: rozpoznaje 19 z 45 gatunków atlasu oraz klasę "inne" (`public/models/metadata.json`),
około 69% trafień na zbiorze walidacyjnym. Klasy są mapowane po nazwie z `metadata.json`.
Przygotowanie zbioru danych i trening opisują [`scripts/prepare-dataset/README.md`](scripts/prepare-dataset/README.md)
i [`docs/MODEL-TRAINING.md`](docs/MODEL-TRAINING.md).

Historia i plan rozwoju aplikacji: [`docs/ROADMAP.md`](docs/ROADMAP.md).

Krótki opis aplikacji, jej wyróżników i porównanie z innymi aplikacjami dla grzybiarzy:
[`docs/O-APLIKACJI.md`](docs/O-APLIKACJI.md).

## ⚠️ Ważne zastrzeżenie

Rozpoznawanie AI **nie jest profesjonalną weryfikacją**. Aplikacja zawsze wyświetla ostrzeżenie, by nie spożywać grzyba wyłącznie na podstawie wyniku — w razie wątpliwości należy skonsultować się z mikologiem lub punktem klasyfikacji grzybów (Sanepid).
