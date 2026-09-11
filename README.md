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

- **Mapa** — geolokalizacja, dodawanie znalezisk ze zdjęciem, notatkami i współrzędnymi
- **Rozpoznaj** — identyfikacja gatunku ze zdjęcia modelem TensorFlow.js działającym lokalnie w przeglądarce
- **Dziennik** — historia znalezisk, statystyki, eksport/import danych jako JSON (backup / przenoszenie między urządzeniami)
- **Baza wiedzy** — wyszukiwarka gatunków z filtrowaniem po jadalności

## Model rozpoznawania AI

Moduł rozpoznawania (`src/utils/mushroomModel.ts`) oczekuje wytrenowanego modelu TensorFlow.js w `public/models/model.json` (+ pliki wag). **Model nie jest jeszcze dołączony** — to osobny etap wymagający zbioru danych treningowych i treningu (np. transfer learning na MobileNet, lub szybka ścieżka: Google Teachable Machine z eksportem do TFJS). Do czasu dodania modelu zakładka "Rozpoznaj" wyświetla stosowny komunikat zamiast wyniku.

Kolejność klas w `CLASS_LABELS` (plik `mushroomModel.ts`) musi odpowiadać etykietom użytym podczas treningu — obecnie zmapowana na `id` gatunków z `src/data/species.json`.

## ⚠️ Ważne zastrzeżenie

Rozpoznawanie AI **nie jest profesjonalną weryfikacją**. Aplikacja zawsze wyświetla ostrzeżenie, by nie spożywać grzyba wyłącznie na podstawie wyniku — w razie wątpliwości należy skonsultować się z mikologiem lub punktem klasyfikacji grzybów (Sanepid).
