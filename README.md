# ŁYSY — dziennik grzybiarza

PWA (Progressive Web App) do zbierania grzybów: mapa znalezisk, rozpoznawanie gatunków ze zdjęcia (on-device AI), dziennik zbiorów i baza wiedzy o gatunkach. Działa w pełni offline — dane zapisywane są lokalnie w przeglądarce (IndexedDB), bez konta i bez backendu.

## Uruchomienie

```bash
npm install
npm run dev       # tryb deweloperski (Service Worker nieaktywny)
npm run build     # build produkcyjny
npm run preview   # podgląd builda z aktywnym Service Workerem/PWA
```

## Funkcje

- **Mapa** — geolokalizacja, dodawanie znalezisk ze zdjęciem, notatkami i współrzędnymi, oraz
  pobieranie obszaru mapy do trybu offline przed wyprawą (przycisk "Pobierz obszar offline")
- **Rozpoznaj** — identyfikacja gatunku ze zdjęcia modelem TensorFlow.js działającym lokalnie w przeglądarce
- **Dziennik** — historia znalezisk, statystyki, eksport/import danych jako JSON (backup / przenoszenie między urządzeniami)
- **Baza wiedzy** — wyszukiwarka gatunków z filtrowaniem po jadalności

## Powiadomienia i widget na Androida

- **Powiadomienia offline** — apka może przypomnieć o bardzo długiej (4h+) aktywnej wyprawie
  (`src/utils/notifications.ts`, `src/features/journal/TripManager.tsx`). Działają lokalnie przez
  Service Workera, bez backendu/push.
- **Widget na ekran główny Androida** — osobny natywny projekt w `android/` (WebView + mostek JS),
  patrz `android/README.md`. Wymaga zbudowania w Android Studio — nie jest częścią `npm run build`.

## Model rozpoznawania AI

Moduł rozpoznawania (`src/utils/mushroomModel.ts`) oczekuje wytrenowanego modelu TensorFlow.js w `public/models/model.json` (+ pliki wag). **Model nie jest jeszcze dołączony** — to osobny etap wymagający zbioru danych treningowych i treningu. Do czasu dodania modelu zakładka "Rozpoznaj" wyświetla stosowny komunikat zamiast wyniku.

Pełna instrukcja dostarczenia modelu (dwie darmowe ścieżki, bez kluczy API, bez backendu) jest w [`docs/MODEL-TRAINING.md`](docs/MODEL-TRAINING.md). Kolejność klas wyjściowych modelu domyślnie odpowiada kolejności `id` gatunków z `src/data/species.json`, ale `mushroomModel.ts` odczyta też opcjonalny `public/models/metadata.json` (eksport Google Teachable Machine) i zmapuje klasy po nazwie zamiast pozycyjnie.

Plan dalszej rozbudowy aplikacji (offline, UI/animacje) jest w [`docs/ROADMAP.md`](docs/ROADMAP.md).

## ⚠️ Ważne zastrzeżenie

Rozpoznawanie AI **nie jest profesjonalną weryfikacją**. Aplikacja zawsze wyświetla ostrzeżenie, by nie spożywać grzyba wyłącznie na podstawie wyniku — w razie wątpliwości należy skonsultować się z mikologiem lub punktem klasyfikacji grzybów (Sanepid).
