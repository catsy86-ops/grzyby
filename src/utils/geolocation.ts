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

export interface WatchedPosition extends Coordinates {
  accuracyMeters: number
}

// Ciągłe śledzenie pozycji (watchPosition) zamiast pojedynczego odpytania - standardowa technika
// nawigacji GPS w aplikacjach webowych: pierwszy odczyt z GPS bywa niedokładny (zimny start
// odbiornika), kolejne odczyty z tego samego strumienia szybko się poprawiają, a użytkownik w
// ruchu (np. wracając przez las) potrzebuje aktualizowanej pozycji bez ręcznego odświeżania.
// Zwraca funkcję czyszczącą (clearWatch) - wywołać przy odmontowaniu komponentu.
export function watchPosition(
  onUpdate: (position: WatchedPosition) => void,
  onError: (message: string) => void,
): () => void {
  if (!('geolocation' in navigator)) {
    onError('Geolokalizacja nie jest wspierana przez to urządzenie')
    return () => {}
  }
  const watchId = navigator.geolocation.watchPosition(
    (position) => {
      onUpdate({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracyMeters: position.coords.accuracy,
      })
    },
    (error) => onError(describeGeolocationError(error)),
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 },
  )
  return () => navigator.geolocation.clearWatch(watchId)
}
