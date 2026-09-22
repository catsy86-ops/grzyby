# Audyt src/components/ 2026-09-22: architektura/clean code, wydajność, UX/testy

Wygenerowane przez trzy równoległe agenty `audit-specialist` (architektura, wydajność, UX) czytające
świeżo `src/components/` (bez `src/components/ui/` - to biblioteka prymitywów shadcn, poza
zakresem) - analogicznie do `docs/MAP-AUDIT-ROADMAP.md`/`docs/JOURNAL-AUDIT-ROADMAP.md`/
`docs/BAZA-WIEDZY-AUDIT-ROADMAP.md`.

**Nic z tego nie jest jeszcze zaimplementowane w chwili pisania tego dokumentu.**

---

## Tier 0: wymaga decyzji przed realizacją

Brak. Żadne znalezisko nie wymaga decyzji produktowej - to wyłącznie umiejscowienie plików,
memoizacja i testy.

---

## Tier 1: realne problemy/luki, niska-średnia złożoność - bezpieczne do zrobienia od razu

1. **`StatTiles.tsx` ma trzech konsumentów, wszyscy w `journal`** - `JournalView.tsx:13`,
   `TripManager.tsx:14`, `SeasonSummary.tsx:4`, zero użyć poza tym feature'em. Ustalony wzorzec w
   repo (`FindingThumbnail.tsx`, `CompassPanel.tsx`) trzyma komponenty jednego feature'u w jego
   folderze, nie w `src/components/`. Fix: `git mv` do `src/features/journal/StatTiles.tsx` +
   aktualizacja 3 importów. Złożoność: **niska**.

2. **`NotificationPermissionBanner.tsx` ma jednego konsumenta** - tylko `JournalView.tsx:65`, i
   koncepcyjnie wiąże się z logiką wypraw (długie wyprawy → powiadomienia), nie z czymś
   ogólnoaplikacyjnym. Kandydat do `src/features/journal/`. Złożoność: **niska**.

3. **`BackupReminderBanner.tsx` ma jednego konsumenta** - tylko `JournalView.tsx:66`. Kandydat do
   `src/features/journal/`. Złożoność: **niska**.

4. **`SeasonCalendarStrip.tsx` ma jednego konsumenta** - tylko `EncyclopediaView.tsx:20`. Kandydat
   do `src/features/encyclopedia/`. Złożoność: **niska**.

   *(Uwaga do 1-4: cztery niezależne, mechaniczne przenosiny plik+test - bezpieczne razem w jednym
   PR, żadna nie zmienia zachowania/logiki, tylko ścieżki importu.)*

5. **`AnimatedHeaderBackground`/`AnimatedHeaderTitle` re-renderują się bez potrzeby na każdym
   re-renderze `App`**, mimo że nie przyjmują propsów zależnych od stanu. `App` re-renderuje się
   przy każdej zmianie zakładki i co 60s z timera `useNotificationItems` - oba komponenty
   (nagłówek widoczny na KAŻDEJ zakładce) niepotrzebnie rekoncyliują animowane elementy przy każdym
   z tych zdarzeń. Fix: `React.memo()` na obu - bez propsów zależnych od stanu, całkowicie
   eliminuje koszt bez ryzyka. Złożoność: **niska**.

6. **`BackupReminderBanner` zamraża `now` raz przy montowaniu** (`useState(() => Date.now())`),
   podczas gdy analogiczny warunek czasowy w `useNotificationItems.ts` (dzwonek powiadomień w
   nagłówku) jawnie odświeża `now` co 60s właśnie po to, żeby te warunki się aktualizowały bez
   zewnętrznego triggera. **Zbieżność dwóch niezależnych audytów (wydajność + UX) na tym samym
   miejscu** - realny efekt: przy długiej sesji (np. wielogodzinna wyprawa z otwartym Dziennikiem)
   baner backupu może pokazywać nieaktualny stan, podczas gdy dzwonek w nagłówku już się
   zaktualizował - dwa niespójne źródła prawdy dla tego samego przypomnienia. Fix: albo dodać ten
   sam interwał 60s co w `useNotificationItems`, albo zasilić baner bezpośrednio z
   `computeNotificationItems`/`useNotificationItems` zamiast duplikować `shouldRemindBackup`
   osobno. Złożoność: **niska**.

7. **Brak testów dla 8 z 15 komponentów, w tym trzech z realną logiką warunkową**:
   `BackupReminderBanner.tsx` (snooze + `shouldRemindBackup`), `NotificationPermissionBanner.tsx`
   (dismiss/`localStorage`/wsparcie `Notification` API), `SpeciesComparator.tsx` (używany z 3
   miejsc - `EncyclopediaView`, `LookalikesWarning`, `SpeciesComparePicker` - zero testu na samą
   porównywarkę). Pozostałe bez testów (`AnimatedHeaderBackground`/`AnimatedHeaderTitle`/
   `AppSplash`/`EdibilityBadge`/`StatTiles`) są głównie prezentacją/animacją - niższy priorytet, ale
   `EdibilityBadge.tsx` eksportuje też `speciesCardClassName`/`edibilityChartColor`/
   `edibilityCardAccentClass` używane w 4 miejscach bez testu pilnującego mapowania
   `EdibilityStatus → wariant/kolor`. Złożoność: **niska-średnia** (najpierw
   `BackupReminderBanner`+`NotificationPermissionBanner`, potem `SpeciesComparator`, potem
   opcjonalnie `EdibilityBadge`).

8. **`LookalikesWarning` w Encyklopedii jest schowane w domyślnie zwiniętej sekcji "Szczegóły",
   mimo że komentarz tuż obok wprost mówi, że to bezpieczeństwo, nie ciekawostka do zwinięcia.**
   `EncyclopediaView.tsx:305-307` - komentarz przy `legalProtection` brzmi: *"Ostrzeżenie o ochronie
   prawnej zostaje zawsze widoczne... to, razem z `LookalikesWarning` w widoku Rozpoznaj, jest
   bezpieczeństwo/legalność, nie ciekawostka do zwinięcia."* `legalProtection` faktycznie renderuje
   się poza `Collapsible` (zawsze widoczny), ale `LookalikesWarning` (linia 329) leży WEWNĄTRZ
   `CollapsibleContent` (`defaultOpen={false}`) - dokładnie w kategorii, której własny komentarz
   dokumentu zaprzecza dla tego komponentu. Efekt: użytkownik przeglądający Bazę wiedzy pod kątem
   niebezpiecznego sobowtóra musi ręcznie rozwinąć "Szczegóły", żeby to zobaczyć, podczas gdy w
   widoku Rozpoznaj (`PredictionCard.tsx:72`) to samo ostrzeżenie jest zawsze widoczne. Fix:
   przenieść `<LookalikesWarning>` poza `Collapsible`, obok `legalProtection`/`EdibilityBadge` -
   zgodnie z tym, co już mówi komentarz. Złożoność: **niska** (przesunięcie JSX).

---

## Sprawdzone i potwierdzone jako OK (nie zmieniać)

- **`EdibilityBadge.tsx`, `SpeciesComparator.tsx`, `LookalikesWarning.tsx`, `icons/illustrations.tsx`,
  `icons/speciesShapeIcons.tsx`** - poprawnie umiejscowione w `src/components/`, realnie
  współdzielone (każdy używany w 3+ różnych features, potwierdzone grepem). `EdibilityBadge`
  dodatkowo eksportuje `speciesCardClassName` z jawnym komentarzem tłumaczącym celowe DRY-wydzielenie.
- **`AnimatedHeaderBackground`/`AnimatedHeaderTitle`/`AppSplash`/`OnboardingOverlay`/`ThemeToggle`/
  `Logo`/`NotificationCenter`/`ErrorBoundary`** - jedyny konsument to `App.tsx` (powłoka aplikacji),
  co jest architektonicznie poprawne mimo pojedynczego importera - to komponenty poziomu shellu, nie
  feature'u, nie mają "swojego" folderu feature'u, do którego dałoby się je przenieść.
- **Brak martwego kodu** - wszystkie 15 komponentów + 2 pliki `icons/` mają co najmniej jednego
  realnego konsumenta (potwierdzone grepem per plik).
- **Dwie niezależne subskrypcje `useNotificationItems`** (dzwonek w `App.tsx` + pełna lista w
  `NotificationCenter.tsx`) - jawnie udokumentowany, świadomy wybór w kodzie ("ten sam wzorzec co
  wielokrotne wywołania `useActiveTrip()`"), koszt nieistotny przy tej skali.
- **Brak memoizacji `getLookalikes`/`SeasonCalendarStrip`'s parsing/inne drobne obliczenia per
  render** - świadomie NIE rekomendowane dodawanie `useMemo` przy ~28 gatunkach - koszt obliczenia
  niższy niż koszt utrzymania memoizacji.
- **`NotificationCenter.tsx:25-28`** - komentarz jawnie odrzuca wydzielenie wspólnej funkcji eksportu
  z `JournalView.handleExport`, bo to tylko 3 linie - świadoma decyzja przeciw nad-DRY.
- **Animacje respektują `prefers-reduced-motion` globalnie** (`main.tsx:16`
  `<MotionConfig reducedMotion="user">`) - pokrywa wszystkie animowane komponenty w tym katalogu.
- **Snooze backupu współdzielony** między `BackupReminderBanner` a `NotificationCenter` (ten sam
  klucz `localStorage`) - brak rozjazdu stanu poza opisanym w pkt 6 problemem z `now`.
- **Brak `LookalikesWarning` w `FindingCard.tsx` (Dziennik)** - NIE jest luką: to samo ostrzeżenie
  jest realizowane lepiej, w trafniejszym momencie - `ConsumptionTracker.tsx:41-50` pokazuje je przy
  oznaczaniu "zjedzone", z jawnym komentarzem uzasadniającym ten wybór.
- **`ErrorBoundary`** - jedno użycie w `App.tsx` (owija cały routowany widok zakładki) to naturalny
  efekt architektury z jednym globalnym boundary, nie zły wzorzec.

---

## Rekomendowana kolejność realizacji

Pkt 1-4 (przenosiny plików) są całkowicie niezależne od siebie i od reszty - zrobić razem, bez
mieszania z jakąkolwiek zmianą logiki w tym samym commicie. Pkt 5 (memo) jest mechaniczny i
niezależny. Pkt 6 (naprawa `now` w `BackupReminderBanner`) warto zrobić po/przy okazji pkt 5, bo
dotyka tego samego obszaru (nagłówek/powiadomienia). Pkt 8 (LookalikesWarning poza Collapsible) jest
jednoliniową zmianą JSX, niezależną od reszty - warto zrobić szybko, bo dotyczy bezpieczeństwa
informacji w polu. Pkt 7 (testy) jest niezależny i można go rozłożyć w dowolnej kolejności w tej
samej sesji.
