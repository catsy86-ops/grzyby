# ŁYSY na Androida (WebView + widget na ekranie głównym)

Ten katalog to **osobny natywny projekt Android**, który opakowuje zbudowaną PWA (`../dist`) w
`WebView` i dodaje prawdziwy widget na ekran główny pokazujący statystyki aktywnej wyprawy.

**Stan: zbudowane i uruchomione na emulatorze (Pixel_4a, API dla `android-37.1`)** — build
`assembleDebug` przechodzi, apka startuje, UI (mapa, nawigacja, formularze) renderuje się
poprawnie, prośba o uprawnienie geolokalizacji faktycznie pojawia się i działa. Zobacz "Co zostało
zweryfikowane" niżej dla szczegółów i znanych luk.

## Dlaczego WebView, a nie Trusted Web Activity (TWA)?

TWA (Custom Tabs) renderuje stronę w Chrome poza procesem aplikacji i **nie pozwala** na
`addJavascriptInterface` — nie ma więc sposobu, żeby strona przekazała dane (aktywna wyprawa,
liczba znalezisk) do natywnego widgetu. Ten projekt używa zwykłego `WebView` z mostkiem JS
(`WidgetBridge.kt` / `src/utils/androidWidgetBridge.ts` po stronie web), kosztem pewnej
funkcjonalności Chrome (autofill, część rozszerzeń Custom Tabs), które i tak nie są tu potrzebne.

Treść jest serwowana z `https://appassets.androidplatform.net` (przez `WebViewAssetLoader`), a
nie z gołego `file://` — `file://` dostaje w WebView nieprzezroczyste ("opaque") origin, co psuje
IndexedDB (Dexie) i uniemożliwia rejestrację Service Workera. Nie jest wymagany dostęp do sieci —
`WebViewAssetLoader` przechwytuje te żądania lokalnie, zanim trafią do sieci, więc apka **nie ma
uprawnienia INTERNET** w manifeście.

**Ważne:** `index.html` generowany przez Vite odwołuje się do zasobów ścieżkami bezwzględnymi
względem roota (`/assets/index-xxx.js`), więc strona **musi** być serwowana z roota wirtualnej
domeny (`AssetsPathHandler` zarejestrowany pod `/`, `loadUrl(".../index.html")`, pliki `dist/`
skopiowane bezpośrednio do `assets/`, bez podfolderu). Wcześniejsza wersja używała prefiksu
`/assets/` i podfolderu `assets/www/` — to się kompilowało, ale w runtime dawało
`FileNotFoundException` dla każdego pliku CSS/JS, bo strona pod `/assets/www/index.html` i tak
prosiła o zasoby spod `/assets/...` (roota), a nie `/assets/www/assets/...`.

Rejestracja Service Workera też wymaga osobnej konfiguracji: `WebViewClient.shouldInterceptRequest`
widzi tylko żądania głównej ramki, nie żądania samego Service Workera. Bez
`ServiceWorkerControllerCompat.setServiceWorkerClient(...)` (patrz `MainActivity.kt`) rejestracja
`sw.js` cicho failuje z "unknown error occurred when fetching the script".

## Struktura

```
android/
  app/
    src/main/
      java/com/lysy/app/
        MainActivity.kt        — hostuje WebView, WebViewAssetLoader, ServiceWorker client, prośba o lokalizację
        WidgetBridge.kt        — window.AndroidWidget.updateStats(json) wywoływane z web appki
        WidgetStats.kt         — SharedPreferences (odczyt/zapis stanu widgetu)
        StatsWidgetProvider.kt — AppWidgetProvider, rysuje RemoteViews
      res/
        layout/widget_stats.xml
        xml/widget_stats_info.xml   — konfiguracja widgetu (rozmiar, updatePeriodMillis)
      assets/                  — TU trafia zawartość ../dist bezpośrednio (patrz niżej), pusty w repo
  gradlew, gradlew.bat, gradle/wrapper/  — Gradle Wrapper (Gradle 9.3.1), już wygenerowany
```

## Wersje

AGP 9.1.1 + wbudowana obsługa Kotlina w AGP (od AGP 9.0 osobny plugin
`org.jetbrains.kotlin.android` jest zbędny i się nie ładuje — `kotlinOptions {}` też zniknął z DSL,
`jvmTarget` bierze się z `compileOptions`), Gradle 9.3.1, compileSdk/targetSdk 36, minSdk 26.

## Wymagania

- Android Studio **albo** JDK 17+ (testowane na JDK 21) + Android SDK (platform 36, build-tools) +
  `android/local.properties` z `sdk.dir=...` (nie jest częścią repo, patrz `.gitignore`).
- Jeśli lokalny ruch HTTPS idzie przez antywirusa/proxy z własnym CA (np. Avast) zaufanym tylko w
  systemowym magazynie certyfikatów Windows, a nie w magazynie JDK — Gradle dostanie
  `PKIX path building failed`. Obejście: dopisz do `org.gradle.jvmargs` w `gradle.properties`
  `-Djavax.net.ssl.trustStoreType=WINDOWS-ROOT` (już tam jest).

## Build

1. Zbuduj web appkę i skopiuj wynik **bezpośrednio** do `assets/` (bez podfolderu `www/`):

   ```bash
   cd ..
   npm run build
   rm -rf android/app/src/main/assets/*
   cp -r dist/* android/app/src/main/assets/
   ```

   Rób to przed **każdym** buildem Androida — `assets/` (poza `.gitkeep`) nie jest częścią repo
   (patrz `.gitignore`) i szybko się dezaktualizuje względem `src/`.

2. Zbuduj i zainstaluj:

   ```bash
   cd android
   ./gradlew assembleDebug
   adb install -r app/build/outputs/apk/debug/app-debug.apk
   ```

   (Windows: `.\gradlew.bat assembleDebug`.) Wrapper jest już w repo, nie trzeba nic generować.

3. Dodaj widget "ŁYSY" z poziomu ekranu głównego (długie przytrzymanie pustego miejsca → Widgety).

## Co zostało zweryfikowane (emulator Pixel_4a)

- `./gradlew assembleDebug` — buduje się czysto.
- Aplikacja startuje, `MainActivity` się wyświetla, brak crasha (`AndroidRuntime`/`FATAL` w logcat).
- CSS/JS/fonty ładują się poprawnie (po naprawie routingu asset loadera — patrz wyżej) — cały UI
  (mapa, belka nawigacyjna, przyciski shadcn) renderuje się identycznie jak w przeglądarce.
- Service Worker rejestruje się bez błędu w konsoli (po dodaniu `ServiceWorkerControllerCompat`).
- Prośba o `ACCESS_FINE_LOCATION` faktycznie pokazuje natywny dialog systemowy i po zaakceptowaniu
  geolokalizacja w WebView działa (`adb emu geo fix` + "Zlokalizuj mnie" → pinezka na mapie).

## Znane luki / środowiskowe ograniczenia

- Kafelki mapy (`maps.wikimedia.org`) i wstępny request geolokalizacji w tym konkretnym
  środowisku testowym failowały z `ERR_CERT_AUTHORITY_INVALID` / timeoutem — to ten sam lokalny
  MITM antywirusa co przy Gradle (patrz wyżej), emulator dziedziczy sieć hosta. Nie jest to błąd
  w kodzie apki — na urządzeniu/emulatorze bez takiej ingerencji w TLS powinno działać tak samo
  jak w zwykłej przeglądarce.
- Nie przetestowano: realnego działania IndexedDB (Dexie) pod kątem zapisu/odczytu w tej
  otoczce (strona się załadowała i nie rzuciła błędów, ale nie zweryfikowano zapisu znaleziska
  end-to-end), wyglądu widgetu na ekranie głównym po faktycznym dodaniu go (`StatsWidgetProvider`
  nie było klikane/oglądane), zachowania na starszych Androidach (testowano tylko na najnowszym
  obrazie systemowym), różnych launcherów/rozmiarów siatki widgetu.
- Ikona aplikacji (`ic_launcher_foreground.xml`) to prosty placeholder wektorowy — podmień na
  docelową ikonę przed publikacją.

## Aktualizacja widgetu

Web appka wywołuje `window.AndroidWidget?.updateStats(json)` (patrz
`src/utils/androidWidgetBridge.ts` i `src/hooks/useAndroidWidgetSync.ts`) za każdym razem, gdy
zmienia się aktywna wyprawa lub jej znaleziska — poza tą natywną otoczką `window.AndroidWidget`
nie istnieje, więc wywołanie jest no-opem i zwykłe PWA/przeglądarka działają bez zmian.
`StatsWidgetProvider` dodatkowo odświeża się co 30 minut (`updatePeriodMillis` w
`widget_stats_info.xml`) — to twardy dolny limit narzucony przez Android, niezależny od tej
wartości.
