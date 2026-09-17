Bazę macie już całkiem dobrą (shadcn + Tailwind v4 z OKLCH tokenami, motion/react, dark/forest mode, lazy-loaded widoki). Plan poniżej buduje na tym, nie zaczyna od zera.

1. Fundament design systemu (zrób najpierw — wszystko inne z tego korzysta)

- Skala spacingu i typografii jako tokeny, nie ad-hoc klasy Tailwind rozrzucone po komponentach. W index.css dodać --font-size-_/--space-_ w @theme inline, żeby nagłówki sekcji (JournalView, EncyclopediaView) miały jeden spójny rytm zamiast osobno dobieranych text-lg/text-xl.
- Elevation system: obecnie cienie są ad-hoc (shadow-sm shadow-brand-accent/20 w headerze). Zdefiniuj 3 poziomy (--shadow-card, --shadow-sheet, --shadow-floating) w tokenach, użyj konsekwentnie w kartach, Drawer/Dialog, FAB-ach.
- Ikonografia: lucide-react już jest — ujednolić grubość/rozmiar (size-[18px] vs size-4.5 mieszane w kodzie) jedną stałą ICON_SIZE per kontekst (nav, header, inline).

2. Layout — struktura ekranu

- Header: obecnie gradient primary→brand-accent na sztywno w każdej zakładce. Rozważ kontekstowy header (subtelnie inny akcent per tab — Mapa=zielony/las, Rozpoznaj=amber/skan, Dziennik=neutralny) żeby wzmocnić orientację, bez utraty spójności marki.
- Bottom nav: dodać safe-area już jest, ale brakuje wizualnego "lift" — 12px_rgb(0,0,0,0.06)]) żeby nav odklejał się od contentu, zwłaszcza namapie z pełnoekranowym Leafletem pod spodem. Content-adaptive layout: JournalView (681 linii) i EncyclopediaView prawdzić, czy mają sticky search/filter bar przy scrollu (dobra praktyka namobile). Jeśli nie, dodać sticky top-0 backdrop-blur pasek filtrów. Responsywność desktop: apka wygląda mobile-first (bottom nav, Drawer). = też desktop) warto dodać breakpoint md: przełączający bottom-nav naside-rail i Drawer na Dialog/Sheet z boku, żeby desktop nie wyglądał jak przeskalowany telefon.

3. Mikro-interakcje i "poczucie jakości"

- Skeletony — jest ViewSkeleton generyczny (spinner+pasek). Zrobić skeleton dopasowany do layoutu każdego widoku (karty-placeholdery w kształcie realnych kart Dziennika/Encyklopedii) — to najbardziej odczuwalna zmiana "premium" p
- Puste stany (empty states): sprawdzić czy Dziennik bez wpisów / Mapa bez znalezisk ma ilustrację+CTA, nie tylko pusty ekran. To miejsce na illustrations (już jest chunk illustrations-\*.js w buildzie — sprawdzić czy jest wykorzystany wszędz
- Stagger animations: listy (Dziennik, Encyklopedia) renderowane bez staggeru wejścia — motion już w projekcie, dodać staggerChildren przy pierwszym renderze listy dla efektu "elegancji", nie tylko przy przełączaniu tabów.
- Haptics/feedback na mobile: navigator.vibrate przy kluczowych akcjach (zapis znaleziska, oznaczenie klastra na mapie) — tanie, bardzo odczuwalne na telefonie.

4. Specyficzne dla widoków

┌──────────────┬───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Widok │ │
├──────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Mapa │ Custom markery już są (mapMarkerIcons) — dodać płynne fi wizualnie wydzielić FAB "dodaj znalezisko" (obecnie prawdopodobnie │
│ │ zwykły przycisk w toolbarze) jako pływający, cieniowany okrąg w rogu — konwencja map-appek. │
├──────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Rozpoznaj │ Ekran skanu to najważniejszy "wow moment" apki — dodać animowaną ramkę skanowania / pulsujący overlay podczas inferencji zamiast statycznego spinnera. │
│ (AI) │ │
├──────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Dziennik │ Karty wpisów: dodać miniaturkę zdjęcia jako hero z graddibilityBadge bardziej wizualny (kolor tła karty subtelnie tinted wg │
│ │ jadalności). │
├──────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Baza wiedzy │ Siatka gatunków z dużymi zdjęciami zamiast listy — grid 2-kolumnowy z aspect-ratio kartami, hover/tap scale (już macie wzorzec whileTap w nav). │
└──────────────┴──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘

5. Technologie/techniki do wykorzystania (masz je już w zależnościach —

- motion/react — jest, ale niedoużywany poza nav i przejściami tabów. Ro.
- Tailwind v4 @theme inline + OKLCH — trzymać się tego, unikać wracania do hardkodowanych hexów.
- View Transitions API (natywne, wspierane w Chrome/Vercel-hosted PWA) jejść między tabami zamiast/obok AnimatePresence — tańsze, natywnie płynnena mobile.
- @fontsource-variable/geist już wgrany — wykorzystać zmienne wagi fontuast tylko font-semibold/font-bold (np. font-[550] na nagłówkach kart dlasubtelnie innego niż button-weight).

Kolejność wdrożenia (fazowo, każda faza deployowalna osobno)

1. Faza A — fundament: tokeny spacing/shadow, ujednolicenie ikon → commit sam w sobie, zero ryzyka regresji.
2. Faza B — layout: sticky filter bars, desktop breakpoint dla nav/Drawe
3. Faza C — mikrointerakcje: dedykowane skeletony, stagger list, empty states.
4. Faza D — widoki: karty Dziennika z hero-image, siatka Encyklopedii, o

Chcesz, żebym zaczął od Fazy A i zrobił konkretne zmiany w kodzie, czy nty wizualne do zaakceptowania?
