# Audyt src/features/identify/ 2026-09-24: architektura/clean code, wydajność, UX/testy

Wygenerowane przez trzy równoległe agenty `audit-specialist` (architektura, wydajność, UX) czytające
świeżo `src/features/identify/` (skaner AI gatunków przez model TF.js) i jego bezpośrednie zależności
(`src/utils/mushroomModel.ts`, `src/utils/mushroomWorkerClient.ts`, `src/workers/mushroomWorker.ts`).

**Nic z tego nie jest jeszcze zaimplementowane w chwili pisania tego dokumentu.**

---

## Tier 0: wymaga decyzji przed realizacją

1. **Wynik rozpoznania jest ślepym zaułkiem - brak jakiegokolwiek mostka do Dziennika.**
   `IdentifyView.tsx:198-200` renderuje `PredictionCard` dla top-3 gatunków, ale nic nie oferuje
   akcji "dodaj znalezisko z tym gatunkiem". `AddFindingForm.tsx` samodzielnie zarządza `speciesId`
   (lokalny `useState`, brak prefill-props/query-param), `appStore.ts` (jedyny istniejący cross-tab
   bridge) nie ma pola typu "pending species". Efekt: użytkownik robi zdjęcie w terenie, apka trafnie
   rozpoznaje gatunek, po czym musi ręcznie przełączyć się na Mapę, otworzyć formularz i ręcznie
   wyszukać ten sam gatunek z listy. Wymaga decyzji: gdzie ląduje przycisk "Dodaj do dziennika" (na
   karcie predykcji? przez Mapę z wymuszonym wyborem spota?), co z lokalizacją GPS, jeśli usera nie
   ma na mapie w danym momencie. Implementacja po decyzji jest mechanicznie prosta (nowe pole
   `pendingIdentifiedSpeciesId` w `appStore`, ten sam wzorzec co istniejące pola).

---

## Tier 1: realne problemy/luki, niska-średnia złożoność - bezpieczne do zrobienia od razu

1. **Zdjęcie trafia do `createImageBitmap` w pełnej rozdzielczości aparatu, mimo że model potrzebuje
   tylko 224x224.** `IdentifyView.tsx:67` - brak `resizeWidth/resizeHeight`. Pełnorozdzielczościowy
   bitmap trafia do workera, gdzie `mushroomModel.ts:155` wgrywa całą teksturę na GPU, dopiero potem
   `resizeBilinear([224,224])` ją zmniejsza. Fix: `{ resizeWidth: INPUT_SIZE, resizeHeight:
   INPUT_SIZE, resizeQuality: 'medium' }` w `createImageBitmap` (wymaga wyeksportowania `INPUT_SIZE`
   z `mushroomModel.ts:10`). Złożoność: **niska**.

2. **Podmiana zdjęcia w trakcie trwającej inferencji pokazuje wyniki dla poprzedniego zdjęcia pod
   nowym podglądem.** `IdentifyView.tsx:136-139` - przycisk "Zmień zdjęcie" nie ma `disabled`
   powiązanego z `loading`, w przeciwieństwie do przycisku "Rozpoznaj gatunek". Stara obietnica po
   rozstrzygnięciu nadpisuje świeżo wyczyszczony stan wynikami dopasowanymi do już niewidocznego
   zdjęcia. Fix: `disabled={loading}` na przycisku zmiany zdjęcia. Złożoność: **niska**.

3. **Brak testu komponentowego dla ścieżki `handleIdentify` (sukces/błąd) w `IdentifyView.test.tsx`.**
   Plik testuje wybór pliku, drag&drop, banery i `disabled`, ale nigdy nie klika "Rozpoznaj gatunek".
   Fix: zamockować `createImageBitmap` i `identifyMushroomInWorker`, kliknąć przycisk, zweryfikować
   render wyników i komunikatu błędu. Złożoność: **niska-średnia**.

---

## Sprawdzone i potwierdzone jako OK (nie zmieniać)

- Kierunek zależności worker <-> main thread poprawny i jednokierunkowy.
- `identifyMushroom()` nie jest martwym kodem - używana wyłącznie przez worker, celowo.
- Model TF.js i worker lazy-loadowane, nie ciągną się w głównym bundlu.
- `rankPredictions`/`applyTemperature` celowo czyste funkcje odseparowane od TF.js/canvasu.
- Reużycie `speciesData`/`EdibilityBadge`/`LookalikesWarning`, brak duplikacji.
- Cache promise'ów modelu/metadanych jednokrotny, uzasadniony.
- Worker nigdy nie jest terminowany - świadoma decyzja (jeden model, jedna sesja).
- `isModelAvailable()`/`loadDatasetReviewed()` cache'ują wynik w module-scope promise'ach.
- TF.js importowany wyłącznie dynamicznie, main bundle nieobciążony.
- Transfer `ImageBitmap` jako transferable, nie kopia.
- Tensor cleanup (`tf.tidy()` + ręczny `dispose()`) poprawny, brak wycieku GPU.
- Podwójny fetch `metadata.json` (main thread + worker) - nieistotne, mały plik.
- Twarde ukrywanie nazwy gatunku poniżej progu pewności - celowa decyzja bezpieczeństwa, testowana.
- Ostrzeżenia o statusie modelu/recenzji widoczne od razu, nie dopiero po wyniku.
- Ostrzeżenie "wersja alpha" przy każdym wyniku, poprawnie ogłaszane (`role="alert"`).
- Drag&drop odrzuca pliki niebędące obrazem, pokryte testem.
- Sprzątanie `URL.revokeObjectURL` przy zmianie/odmontowaniu.
- `capture="environment"` + `accept="image/*"` - właściwy wybór dla PWA w terenie.

---

## Rekomendowana kolejność realizacji

Tier 1 pkt 1-3 są w pełni niezależne od siebie i od Tier 0 - bezpieczne do zrobienia w dowolnej
kolejności w tej samej sesji. Sensownie najpierw pkt 3 (test dla `handleIdentify`), bo naturalnie
posłuży też do odtworzenia race condition z pkt 2. Tier 0 (most Identify -> Dziennik) wymaga
najpierw decyzji użytkownika co do docelowego przepływu.

---

**Tier 1 w całości zaimplementowane (2026-09-24).** Pkt 1: `INPUT_SIZE` wyeksportowany z
`mushroomModel.ts`, `createImageBitmap` w `IdentifyView.tsx` teraz robi natywny downscale do
224x224 od razu (`resizeWidth`/`resizeHeight`/`resizeQuality: 'medium'`). Pkt 2: przycisk "Zmień
zdjęcie" dostał `disabled={loading}`. Pkt 3: nowe testy `IdentifyView.test.tsx` (sukces workera,
błąd workera, race condition ze zmianą zdjęcia w trakcie analizy) - zamockowany globalny
`createImageBitmap` i `identifyMushroomInWorker`. tsc/oxlint/build czyste, testy 711/712 (1 znana
flaka pod pełnym obciążeniem, niezwiązana z tymi zmianami). **Tier 0** (most Identify -> Dziennik)
pozostaje otwarty - wymaga decyzji użytkownika co do docelowego przepływu.
