# Audyt src/hooks/ + src/utils/ 2026-09-24: architektura/clean code, wydajność, UX/testy

Wygenerowane przez trzy równoległe agenty `audit-specialist` (architektura, wydajność, UX) czytające
świeżo `src/hooks/` i `src/utils/` (kod współdzielony między wszystkimi widokami, nie przypisany do
jednej zakładki).

**Nic z tego nie jest jeszcze zaimplementowane w chwili pisania tego dokumentu.**

---

## Tier 0: wymaga decyzji przed realizacją

Brak.

---

## Tier 1: realne problemy/luki, niska-średnia złożoność - bezpieczne do zrobienia od razu

1. **Zduplikowany mechanizm cache'a "localStorage + próg staleności" w dwóch hookach prognozy
   grzybowej.** `useMushroomOutlook.ts:16-39` i `useSpotMushroomOutlook.ts:20-43` implementują niemal
   identyczną logikę (`JSON.parse` z `try/catch`, próg `now - timestamp > MAX_AGE` OR przesunięcie
   współrzędnych). Różnica w strukturze przechowywania (pojedynczy klucz vs mapa per spot) jest
   realna i uzasadniona, ale sam kształt "cache wpisu + próg staleności" da się wydzielić do wspólnej
   funkcji generycznej (`isStaleByAgeOrMove(entry, lat, lon, now, maxAgeMs, moveThresholdDeg)`).
   Złożoność: **niska-średnia** (oba call site'y mają testy).

2. **`downloadBlob` (generyczna funkcja DOM) mieszka w domenowym `exportImport.ts`.**
   `exportImport.ts:183-190` eksportuje `downloadBlob(blob, filename)`, używaną przez 4 różne miejsca
   (`NotificationCenter.tsx`, `EncyclopediaView.tsx`, `JournalView.tsx`, `SpotManager.tsx`) do
   pobierania PDF/GPX/CSV/JSON - nic wspólnego z modelem `ExportPayload` w tym samym pliku. Fix:
   przenieść do `src/utils/downloadBlob.ts`. Złożoność: **niska**.

3. **`useSpeechToText` nie zgłasza błędu użytkownikowi przy odmowie/awarii rozpoznawania mowy.**
   `useSpeechToText.ts:81` (`recognition.onerror = () => setIsListening(false)`) nie przekazuje
   przyczyny na zewnątrz - `UseSpeechToTextResult` nie ma pola na błąd. W `AddFindingForm.tsx`
   przycisk mikrofonu po prostu milknie bez komunikatu. Fix: dodać `error: string | null` do
   `UseSpeechToTextResult`, ustawiane w `onerror` z `event.error`, pokazać komunikat w
   `AddFindingForm.tsx` analogicznie do `locateError` w `useMapGeolocation.ts`. Złożoność: **niska**.

4. **`useMediaQuery` nie ma żadnego testu**, mimo że jest współdzielony przez 11 różnych miejsc i
   steruje realnymi decyzjami layoutu (np. kierunek wysuwania Drawer). Wszystkie inne hooki
   reagujące na globalne zdarzenia przeglądarki (`useOnlineStatus`, `useBatteryStatus`,
   `useDeviceHeading`) mają odpowiadający test - `useMediaQuery` jest wyjątkiem. Fix:
   `useMediaQuery.test.ts` wzorowany na `useOnlineStatus.test.ts` (mock `matchMedia` + zdarzenie
   `change`). Złożoność: **niska**.

---

## Sprawdzone i potwierdzone jako OK (nie zmieniać)

- Płaska struktura `src/hooks/`/`src/utils/` (bez `features/*/utils`) to świadoma, jednolita
  konwencja całego repo (zero wyników na `features/*/utils/**`/`features/*/hooks/**`).
- `bearing.ts` - duplikacja z wcześniejszego audytu Mapy już naprawiona (`getBearingInfo` używane
  wszędzie).
- `notifications.ts`/`notificationCenter.ts`/`useNotificationItems.ts` - trójwarstwowy podział
  (API/logika czysta/spinacz Dexie), nie duplikacja.
- `useOverdueTripReminder`/`useStormWarning`/`useTickReminders` - powtarzający się kształt
  "interval + localStorage" nie wart wydzielania, realnie się różnią; już udokumentowane w
  `pruneTripNotifications.ts` jako zaakceptowany kompromis.
- Brak importów `features/*` w `src/hooks/`/`src/utils/` - poprawny kierunek zależności.
- `duplicateFindingCheck.ts` vs `countLikelyDuplicates` - różne funkcje, różny cel, poprawnie
  rozdzielone.
- `useMapGeolocation.ts` - złożony, ale spójność uzasadniona komentarzami (visibility pause + power
  save + stale check współzależne).
- `useAndroidWidgetSync.ts` czyta z cache `useMushroomOutlook` przez eksportowaną funkcję, nie
  duplikuje fetch/cache.
- N+1 na Dexie nieobecne - `bulkGet`/przekazywanie już załadowanych tablic wszędzie sprawdzone.
- `useMushroomOutlook`/`useSpotMushroomOutlook` - przemyślany cache, zaokrąglanie GPS zapobiega
  fetchowi przy szumie `watchPosition`.
- `useMapGeolocation` pauzuje GPS przy `visibilitychange`, wspiera `powerSave`.
- `useTripTrail` throttluje zapis co ~20m, nie co tick GPS.
- TF.js/jsPDF code-split-owane, nie obciążają głównego bundla.
- `offlineMapTiles.ts` - ograniczona współbieżność + limit liczby kafelków.
- `AchievementsDrawer.tsx` brak `useMemo` - już opisane i świadomie zostawione w
  `JOURNAL-AUDIT-ROADMAP.md`, nie duplikować.
- `getCacheInfo()` w `storageInfo.ts` - jednorazowy koszt przy jawnej akcji użytkownika, nieistotne.
- `showLocalNotification` cicho nic nie robi bez uprawnienia - obsłużone osobno przez
  `NotificationPermissionBanner.tsx`.
- `useStormWarning.ts` połyka błąd GPS/sieci celowo - retry przy kolejnym sprawdzeniu za 30 min.
- `useSpeechToText` - brak race condition przy podwójnym kliknięciu (`isListening` ustawiane
  synchronicznie).
- `useAmbientAudio.ts` - `eslint-disable` przy efekcie zależnym tylko od `enabled` jest świadomy,
  udokumentowany.
- `useDeviceHeading.ts` poprawnie rozróżnia `unsupported`/`prompt`/`denied`, nie woła
  `requestPermission()` automatycznie (iOS wymaga gestu użytkownika).

---

## Rekomendowana kolejność realizacji

Wszystkie 4 punkty Tier 1 są w pełni niezależne od siebie - bezpieczne do zrobienia w jednej sesji,
w dowolnej kolejności. Sensownie najpierw pkt 4 (test `useMediaQuery`, czysto addytywny, zero
ryzyka), potem pkt 3 (rozszerzenie `useSpeechToText` o `error`, przy okazji dopisując test ścieżki
błędu).

---

**Tier 1 w całości zaimplementowane (2026-09-24).** Pkt 1: nowy `utils/outlookCacheStaleness.ts`
(`isOutlookCacheStale`) - wspólna reguła staleness używana teraz przez `useMushroomOutlook.ts` i
`useSpotMushroomOutlook.ts`, każdy zachowuje własną strukturę przechowywania (pojedynczy klucz vs
mapa per spot). Pkt 2: `downloadBlob` przeniesiony z `exportImport.ts` do nowego
`utils/downloadBlob.ts`, wszystkie 4 miejsca użycia (`NotificationCenter`, `EncyclopediaView`,
`JournalView`, `SpotManager`) i test `SpotManager.test.tsx` zaktualizowane. Pkt 3:
`UseSpeechToTextResult` dostał pole `error: string | null` z czytelnym komunikatem
(`describeSpeechError`), `AddFindingForm.tsx` pokazuje go pod polem notatek, nowy test w
`useSpeechToText.test.ts`. Pkt 4: nowy `useMediaQuery.test.ts` (stan początkowy, reakcja na zmianę,
odpięcie listenera). tsc/oxlint/build czyste, testy 711/712 (1 znana flaka pod pełnym obciążeniem,
niezwiązana z tymi zmianami).
