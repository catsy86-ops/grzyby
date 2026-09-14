// Natywny URI `sms:` otwiera domyślną aplikację SMS telefonu z gotową treścią - użytkownik sam
// wybiera odbiorcę i wysyła. Żadne dane nie przechodzą przez serwer tej apki (zero backendu).
export function buildLocationSmsUrl(
  latitude: number,
  longitude: number,
  userAgent: string = typeof navigator !== 'undefined' ? navigator.userAgent : '',
): string {
  const body = encodeURIComponent(
    `Moja lokalizacja: ${latitude.toFixed(5)}, ${longitude.toFixed(5)} - https://www.google.com/maps?q=${latitude},${longitude}`,
  )
  // iOS historycznie wymaga `&` zamiast `?` przed `body`, gdy numer odbiorcy jest pusty -
  // z `?` na starszym Safari/iOS treść bywa ignorowana.
  const isIOS = /iPad|iPhone|iPod/.test(userAgent)
  return isIOS ? `sms:&body=${body}` : `sms:?body=${body}`
}
