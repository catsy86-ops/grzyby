# Audyt src/features/tools/ 2026-09-24: architektura/clean code, wydajność, UX/testy

Wygenerowane przez trzy równoległe agenty `audit-specialist` (architektura, wydajność, UX) czytające
świeżo `src/features/tools/` (ToolsMenu, EmergencyCard, AmbientPlayer, GearChecklist, CookingTimer,
FirstAidGuide, TickCareGuide, StorageInfoDrawer - offline narzędzia terenowe).

**Nic z tego nie jest jeszcze zaimplementowane w chwili pisania tego dokumentu.**

---

## Tier 0: wymaga decyzji przed realizacją

Brak. Zestaw małych, w większości niezależnych narzędzi bez współdzielonego stanu domenowego -
wszystkie znaleziska mają jednoznaczny kierunek naprawy.

---

## Tier 1: realne problemy/luki, niska-średnia złożoność - bezpieczne do zrobienia od razu

1. **[Bezpieczeństwo] `EmergencyCard` obiecuje SMS bez współrzędnych, ale przycisk zostaje
   zablokowany na zawsze, gdy GPS zawiedzie.** `EmergencyCard.tsx:90-95` pokazuje ostrzeżenie "SMS
   zostanie wysłany bez współrzędnych", ale `disabled={!contactPhone || !position}` (`:102`) -
   `position` przy błędzie geolokalizacji nigdy się nie ustawi. `buildLocationSmsUrl`
   (`locationSms.ts:5-21`) zawsze wymaga `latitude`/`longitude`. W gęstym lesie bez zasięgu GPS
   użytkownik traci jedyną szybką ścieżkę SMS-a do kontaktu awaryjnego. Fix: wariant
   `buildLocationSmsUrl` bez współrzędnych + odblokować przycisk przy błędzie GPS. Ten sam wzorzec
   występuje w `TripManager.tsx:114-120` (poza zakresem tego audytu) - fix w `locationSms.ts` naprawi
   oba miejsca. Złożoność: **średnia**.

2. **`FirstAidGuide` instruuje "Zadzwoń pod 112" bez przycisku jednym dotknięciem**, mimo że ten
   wzorzec (`tel:` link) już istnieje w `EmergencyCard.tsx:111-122`. `firstAid.ts:13-15` (krok 1) każe
   dzwonić na 112, ale `FirstAidGuide.tsx` nie ma linku `tel:112`. Narzędzie czytane w stresie -
   brak jednego kliknięcia to realna luka. Fix: `<Button>` z `tel:112` obok pierwszego kroku.
   Złożoność: **niska**.

3. **Grupa przycisków trybu oszczędzania baterii nie ma `role="radiogroup"`.**
   `ToolsMenu.tsx:113-133` - kontener `<div>` opakowuje trzy `<button role="radio">` bez nadrzędnego
   `role="radiogroup"`/`aria-label`. Fix: `role="radiogroup"` + `aria-label="Oszczędzanie baterii"`
   na kontenerze. Złożoność: **niska**.

4. **`GearChecklist.tsx` sam wynajduje `localStorage` zamiast użyć `appStore`.**
   `GearChecklist.tsx:7-17,25-31` ręcznie robi `localStorage.getItem`/`setItem`, mimo że ten sam
   problem (per-device stan między sesjami) ma już rozwiązanie w `appStore.ts` (`persist`
   middleware), użyte przez `emergencyInfo`/`ambientAudioVolume` z tego samego katalogu. Fix: dodać
   `gearChecklistChecked` do `appStore`+`partialize`, usunąć ręczny efekt. Złożoność: **niska**.

5. **Sześć niezależnych `useState<boolean>` w `App.tsx` zamiast jednego stanu "aktywne narzędzie".**
   `App.tsx:214-219` odtwarza ręcznie to, co `MapView.tsx:91` (`activeSheet: ActiveSheet | null`) już
   robi jednym stanem dla analogicznego zestawu wzajemnie wykluczających się arkuszy. Fix:
   `activeTool` zamiast 6 flag. Złożoność: **niska-średnia** (dotyka renderowania w `App.tsx:412-417`).

6. **`TOOLS` i `SECTIONS` w `ToolsMenu.tsx` to dwie ręcznie synchronizowane listy tych samych kluczy.**
   `ToolsMenu.tsx:34-48` (`TOOLS`) i `:57-61` (`SECTIONS`) - non-null assertion przy renderze
   (`:148`), rozjazd przy dodaniu nowego narzędzia tylko do jednej listy nie da błędu kompilacji.
   Fix: pojedyncze źródło prawdy (pole `section` w `TOOLS`, `SECTIONS` wyprowadzone przez `groupBy`).
   Złożoność: **niska**.

7. **`ToolsMenu.tsx:136` wymusza pełny remount listy narzędzi (`key={open ? 'open' : 'closed'}`)
   zamiast pozwolić `animate`/`variants` obsłużyć przejście.** Framer Motion już dostaje
   `animate={open ? 'visible' : 'hidden'}` - to wystarcza do retriggerowania stagger-animacji. Fix:
   usunąć prop `key`. Złożoność: **niska**.

8. **`GearChecklist.tsx:34-36` przelicza `checkedCount` przez zagnieżdżone `some()` w `some()`.**
   Prostszy fix: `GEAR_CHECKLIST.flatMap(...).filter(item => checked.has(item.id)).length`.
   Złożoność: **niska**.

---

## Sprawdzone i potwierdzone jako OK (nie zmieniać)

- `ToolDialog.tsx` jako wspólny szkielet 4 narzędzi - celowe wydzielenie, żadnego duplikatu.
- `EmergencyCard`/`StorageInfoDrawer` świadomie NIE używają `ToolDialog` (potrzebują `Drawer`).
- `AmbientPlayer` celowo niezależny od tokenów motywu (nawiązanie do Winampa).
- `useAmbientAudio` - pauza (nie stop) przy `visibilitychange`, `volume` celowo poza deps.
- `appStore.ts` celowo NIE persystuje `ambientAudioEnabled` (polityka autoplay).
- Treść narzędzi z osobnych plików w `src/data/`, zgodne z resztą projektu.
- Wszystkie 6 komponentów narzędzi importowane eagerly - sprawdzone, żaden nie ciągnie ciężkiej
  biblioteki, code-splitting nic by nie zyskał.
- `AmbientPlayer`/`useAmbientAudio.ts` - jeden globalny `AudioContext`, poprawnie posprzątany.
- `CookingTimer.tsx` - `setInterval` poprawnie czyszczony przy odmontowaniu/pauzie.
- `useBatteryStatus.ts` - listenery poprawnie odpinane, `cancelled` flag chroni przed race condition.
- `CookingTimer` faktycznie odlicza w tle przy zamkniętym dialogu - zamierzone (wszystkie narzędzia
  trwale zamontowane, `open` steruje tylko widocznością).
- Animacja equalizera w `AmbientPlayer` respektuje `prefers-reduced-motion`.
- `GearChecklist` trwałość zaznaczeń między sesjami (nie per-wyprawa) - zamierzona, testowana.
- `StorageInfoDrawer` jasno komunikuje, że dane dziennika/wypraw nie są dotykane czyszczeniem cache.

---

## Rekomendowana kolejność realizacji

Punkty 2, 3, 4, 6, 7, 8 są w pełni niezależne, niskiego ryzyka - bezpieczne do zrobienia razem w
jednej sesji. Punkt 5 (konsolidacja `App.tsx` do `activeTool`) warto zrobić jako osobny commit -
dotyka renderowania wszystkich sześciu dialogów naraz, zasługuje na ręczną weryfikację w
przeglądarce. Punkt 1 (SMS bez GPS) wymaga wcześniej krótkiej decyzji redakcyjnej (treść SMS-a bez
współrzędnych) - technicznie niezależny od pozostałych, ale dotyka współdzielonego `locationSms.ts`.
