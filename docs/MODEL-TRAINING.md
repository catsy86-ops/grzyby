# Dostarczenie modelu rozpoznawania AI

`src/features/identify` (zakładka "Rozpoznaj") jest gotowe do działania od strony kodu i UI -
brakuje tylko samego wytrenowanego modelu w `public/models/`. Ten dokument opisuje dwie ścieżki,
jak go dostarczyć, w pełni za darmo, bez żadnego klucza API i bez backendu (rozpoznawanie działa
lokalnie w przeglądarce przez TensorFlow.js, `src/utils/mushroomModel.ts`).

**Uczciwie: nie da się tego w pełni zautomatyzować bez Twojego udziału.** Zebranie i weryfikacja
zdjęć treningowych to kwestia bezpieczeństwa (część gatunków w `src/data/species.json` jest
trująca lub śmiertelnie trująca) - żaden automatyczny skrobak zdjęć z internetu nie może tego
zastąpić bez ręcznego przeglądu. Poniżej dokładnie zaznaczone jest, co jest już zrobione w kodzie
i co wymaga Twojego działania.

## Wymagania techniczne modelu (już wymuszone przez kod, nie do zmiany bez edycji `mushroomModel.ts`)

- Format: TensorFlow.js **LayersModel** (`tf.loadLayersModel`), czyli plik `model.json` + wagi
  `*.bin` w `public/models/`. Nie GraphModel/SavedModel.
- Wejście: obraz RGB 224×224, wartości znormalizowane do zakresu **[0, 1]** (dzielenie przez 255,
  bez dodatkowego przesunięcia w kodzie przeglądarki - patrz `INPUT_SIZE` i preprocessing w
  `src/utils/mushroomModel.ts`).
- Wyjście: wektor prawdopodobieństw o długości = liczba gatunków w `src/data/species.json`
  (obecnie 19), plus opcjonalnie jedna dodatkowa klasa "inne" (patrz niżej).
- Kolejność klas wyjściowych: albo dokładnie kolejność `id` w `species.json` (domyślne założenie),
  albo dowolna inna kolejność opisana w opcjonalnym `public/models/metadata.json` (patrz niżej) -
  `mushroomModel.ts` obsługuje oba przypadki automatycznie.

## Ścieżka A: Google Teachable Machine (najszybsza, w pełni ręczna, zalecana na start)

1. Zbierz zdjęcia per gatunek (patrz `scripts/prepare-dataset/README.md` - można wspomóc się
   skryptem pobierającym kandydatów z Wikimedia Commons, ale **każde zdjęcie trzeba ręcznie
   zweryfikować**). Rekomendowane minimum: 80-150 zdjęć/gatunek, zróżnicowane kątem/tłem/
   oświetleniem.
2. Dodaj też klasę **"inne"** (zdjęcia niebędące żadnym z 19 gatunków - ręka, liście, ściółka,
   puste tło; `scripts/prepare-dataset/fetch-negative-images.mjs` pobiera dla niej kandydatów z
   Commons tak samo jak dla gatunków) - ogranicza to fałszywie pewne trafienia na zdjęciach
   niezwiązanych z grzybami. `mushroomModel.ts` nie ma tej klasy w `species.json`, więc trafia do
   `species: null` - `PredictionCard.tsx` pokazuje wtedy czytelny tekst "To raczej nie jest grzyb"
   zamiast surowej etykiety `inne`.
3. Wejdź na [Teachable Machine](https://teachablemachine.withgoogle.com/) → "Image Project" →
   "Standard image model".
4. Utwórz jedną klasę na gatunek. **Nazwij każdą klasę dokładnie tak jak `id` w
   `src/data/species.json`** (np. `borowik-szlachetny`, nie "Borowik szlachetny") - to najprostszy
   sposób, by uniknąć pomyłki w mapowaniu; jeśli wolisz czytelniejsze nazwy w Teachable Machine,
   zobacz krok 6.
5. Wgraj zdjęcia do każdej klasy, kliknij "Train Model" (trening w przeglądarce, kilka minut, bez
   GPU).
6. Eksportuj: "Export Model" → zakładka "Tensorflow.js" → "Download". Rozpakuj archiwum - powinno
   zawierać `model.json`, jeden lub więcej plików `weights.bin` (lub podobnie nazwanych) oraz
   `metadata.json`.
7. Skopiuj **wszystkie** te pliki do `public/models/` w repo (bez podkatalogu).
8. Otwórz skopiowany `metadata.json` i sprawdź pole `"labels"` - to lista nazw klas w kolejności
   wyjścia modelu. `mushroomModel.ts` (`loadClassLabels()`) **automatycznie z niego skorzysta**,
   jeśli każda nazwa w `labels` dokładnie odpowiada jakiemuś `id` w `species.json` (patrz krok 4 -
   dlatego zalecane jest nazywanie klas dokładnie jak `id`). Jeśli nazwałeś klasy inaczej (np. po
   polsku), zamień ręcznie wartości w `labels` na odpowiadające `id` ze `species.json`, zachowując
   tę samą kolejność.
9. Uruchom `npm run build && npm run preview`, otwórz zakładkę "Rozpoznaj" - baner "model
   niezainstalowany" powinien zniknąć, a rozpoznawanie zwracać realne wyniki.

## Ścieżka B: własny trening (`scripts/train-model/train.py`) - więcej kontroli, wymaga Pythona

Dla kogoś, kto woli pełną kontrolę nad architekturą/augmentacją i ma lokalnie Pythona (GPU nie
jest wymagane, ale trening będzie szybszy).

1. Przygotuj `dataset/<species-id>/*.jpg` (jeden podkatalog na każdy `id` ze `species.json`, plus
   opcjonalnie `dataset/inne/*.jpg` dla klasy negatywnej) - patrz `scripts/prepare-dataset/README.md`.
   `scripts/prepare-dataset/sanity-filter.mjs` odrzuca uszkodzone/zbyt małe pliki i duplikaty z
   `raw/` i kopiuje resztę do `dataset/` - to filtr techniczny, nie merytoryczny.
   **Obowiązkowo** uruchom potem `scripts/prepare-dataset/review-gate.mjs` - `train.py` (krok 3)
   odmówi treningu, jeśli dla któregoś gatunku brakuje manifestu ręcznej recenzji
   `scripts/prepare-dataset/reviewed/<id>.json` albo jest za mało zrecenzjonowanych zdjęć (patrz
   sekcja "Bramka recenzji" w `scripts/prepare-dataset/README.md`).
2. `pip install -r scripts/train-model/requirements.txt` (TensorFlow + tensorflowjs). Uwaga: na
   Windows z Pythonem 3.12 pakiet `tensorflow-decision-forests` (zależność `tensorflowjs`) nie ma
   koła binarnego zgodnego z żadną wersją TensorFlow dostępną dla 3.12 - użyj Pythona 3.10 lub
   3.11 dla tego środowiska.
3. `python scripts/train-model/train.py --epochs 15 --fine-tune-epochs 5` - transfer learning na
   MobileNetV2, zamrożona baza w pierwszej fazie, częściowy fine-tuning ostatnich warstw w drugiej.
   Skrypt sam wymusza kolejność klas = kolejność w `species.json` (+ `inne` na końcu, jeśli istnieje
   `dataset/inne/`) i wypisuje ją na końcu do weryfikacji. Wynikowy `model-export/model.h5` ma
   wbudowany preprocessing dopasowany do `mushroomModel.ts` (wejście `[0,1]`, przesunięcie do
   zakresu MobileNetV2 dzieje się wewnątrz modelu) - nie trzeba nic dodatkowo zmieniać w kodzie
   przeglądarki.
4. Konwersja do TensorFlow.js:
   ```bash
   tensorflowjs_converter --input_format=keras --quantize_uint8=1 model-export/model.h5 public/models
   cp model-export/metadata.json public/models/metadata.json
   ```
   `--quantize_uint8` zmniejsza rozmiar wag (istotne dla precache w Service Workerze i transferu w
   terenie na słabym łączu) - **koniecznie z `=1`**, bez tego argparse `tensorflowjs_converter`
   łyka ścieżkę wejściową jako wartość flagi i converter kończy się błędem "Missing output_path
   argument" (zweryfikowane przy pierwszym realnym użyciu tego polecenia). `train.py` zapisuje też `model-export/metadata.json` z jawną listą
   klas w kolejności wyjścia modelu - skopiuj go obok `model.json`, żeby `loadClassLabels()` w
   `mushroomModel.ts` nie musiał zgadywać kolejności (istotne zwłaszcza z klasą `inne`, która nie
   ma odpowiednika w `species.json`).
5. `npm run build && npm run preview`, sprawdź zakładkę "Rozpoznaj" jak w kroku 9 ścieżki A.

## Po dostarczeniu modelu

- Ścieżka B (`train.py`) zapisuje `model-export/eval-report.json` (precision/recall/F1 per gatunek
  na zbiorze walidacyjnym) i `model-export/confusion-matrix.png` - przejrzyj oba PRZED wdrożeniem.
  Niska precision/recall na gatunku trującym (fałszywie rozpoznany jako jadalny) jest poważniejszym
  problemem niż niska ogólna accuracy, którą łatwo zawyżyć nierównomiernym rozkładem klas.
- Zweryfikuj na kilku znanych zdjęciach z każdej klasy, czy top-1 wynik się zgadza - to podstawowy
  sanity check przed jakimkolwiek zaufaniem do modelu.
- `src/utils/mushroomModel.test.ts` ma test strażniczy sprawdzający zgodność długości/kolejności
  etykiet - uruchom `npm test` po podmianie modelu.
- Ścieżka B (`train.py`) dopasowuje też "temperature scaling" - skalar zapisywany jako
  `temperature` w `metadata.json`, którym `src/utils/mushroomModel.ts` (`applyTemperature`) łagodzi
  nadmierną pewność siebie surowego softmaxa małych, douczanych modeli. Dzięki temu próg
  `LOW_CONFIDENCE_THRESHOLD` w `src/features/identify/PredictionCard.tsx` odnosi się do realnie
  skalibrowanej pewności, nie surowego wyjścia sieci - wciąż może wymagać ręcznego dostrojenia po
  zobaczeniu realnych wyników (zbyt niski próg = fałszywa pewność przy słabym modelu, zbyt wysoki =
  model prawie nigdy nie pokazuje wyniku). Ścieżka A (Teachable Machine) nie generuje tego pola -
  `loadTemperature()` domyślnie zwraca `1` (brak skalowania) w jego braku.
- Zdjęcia referencyjne w `species.json` (`imageUrls`, obecnie puste) warto uzupełnić osobno dla
  bazy wiedzy (Encyklopedia) - mogą, po weryfikacji jakości, pochodzić z tego samego zbioru co
  dataset treningowy.
- Apka zawsze pokazuje ostrzeżenie, że rozpoznawanie AI nie jest profesjonalną weryfikacją - to
  zostaje niezależnie od jakości modelu (patrz README.md, sekcja "Ważne zastrzeżenie").
