// Wspólny format linku do Google Maps - używany zarówno w treści SMS-a ratunkowego
// (locationSms.ts), jak i w przycisku "Otwórz w Mapach" przy zapisanym grzybowisku
// (SpotManager.tsx), żeby oba miejsca nie mogły rozjechać się formatem URL-a. Otwiera natywną
// apkę Map na telefonie (web-to-app linking) lub Google Maps w przeglądarce na desktopie.
export function buildGoogleMapsUrl(latitude: number, longitude: number): string {
  return `https://www.google.com/maps?q=${latitude},${longitude}`
}
