import { buildGoogleMapsUrl } from './mapsLink'

// Natywny URI `sms:` otwiera domyślną aplikację SMS telefonu z gotową treścią - użytkownik sam
// wybiera odbiorcę i wysyła. Żadne dane nie przechodzą przez serwer tej apki (zero backendu).
// `latitude`/`longitude` mogą być `null`, gdy GPS zawiódł (częste w gęstym lesie) - treść wtedy
// prosi o pomoc bez linku do mapy, zamiast całkiem uniemożliwiać wysyłkę SMS-a.
export function buildLocationSmsUrl(
  latitude: number | null,
  longitude: number | null,
  recipientPhone: string = '',
  userAgent: string = typeof navigator !== 'undefined' ? navigator.userAgent : '',
): string {
  const body = encodeURIComponent(
    latitude != null && longitude != null
      ? `Moja lokalizacja: ${latitude.toFixed(5)}, ${longitude.toFixed(5)} - ${buildGoogleMapsUrl(latitude, longitude)}`
      : 'Potrzebuję pomocy, nie udało mi się ustalić dokładnej lokalizacji.',
  )
  const recipient = recipientPhone.trim()
  // iOS historycznie wymaga `&` zamiast `?` przed `body`, gdy numer odbiorcy jest pusty -
  // z `?` na starszym Safari/iOS treść bywa ignorowana. Z podanym odbiorcą (np. kontakt
  // awaryjny z EmergencyCard.tsx) `?` działa poprawnie na obu platformach.
  const isIOS = /iPad|iPhone|iPod/.test(userAgent)
  const separator = recipient === '' && isIOS ? '&' : '?'
  return `sms:${recipient}${separator}body=${body}`
}
