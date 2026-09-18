// Natywny URI `sms:` otwiera domyślną aplikację SMS telefonu z gotową treścią - użytkownik sam
// wybiera odbiorcę i wysyła. Żadne dane nie przechodzą przez serwer tej apki (zero backendu).
export function buildLocationSmsUrl(
  latitude: number,
  longitude: number,
  recipientPhone: string = '',
  userAgent: string = typeof navigator !== 'undefined' ? navigator.userAgent : '',
): string {
  const body = encodeURIComponent(
    `Moja lokalizacja: ${latitude.toFixed(5)}, ${longitude.toFixed(5)} - https://www.google.com/maps?q=${latitude},${longitude}`,
  )
  const recipient = recipientPhone.trim()
  // iOS historycznie wymaga `&` zamiast `?` przed `body`, gdy numer odbiorcy jest pusty -
  // z `?` na starszym Safari/iOS treść bywa ignorowana. Z podanym odbiorcą (np. kontakt
  // awaryjny z EmergencyCard.tsx) `?` działa poprawnie na obu platformach.
  const isIOS = /iPad|iPhone|iPod/.test(userAgent)
  const separator = recipient === '' && isIOS ? '&' : '?'
  return `sms:${recipient}${separator}body=${body}`
}
