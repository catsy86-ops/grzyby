export interface Coordinates {
  latitude: number
  longitude: number
}

function describeGeolocationError(error: GeolocationPositionError): string {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return 'Brak zgody na dostęp do lokalizacji. Włącz uprawnienia lokalizacji dla tej aplikacji w ustawieniach przeglądarki/systemu.'
    case error.POSITION_UNAVAILABLE:
      return 'Nie udało się ustalić lokalizacji (brak sygnału GPS lub złe warunki odbioru).'
    case error.TIMEOUT:
      return 'Ustalanie lokalizacji trwało zbyt długo. Spróbuj ponownie w miejscu z lepszym odbiorem sygnału.'
    default:
      return 'Nie udało się ustalić lokalizacji'
  }
}

export function getCurrentPosition(): Promise<Coordinates> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('Geolokalizacja nie jest wspierana przez to urządzenie'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        })
      },
      (error) => reject(new Error(describeGeolocationError(error))),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
    )
  })
}
