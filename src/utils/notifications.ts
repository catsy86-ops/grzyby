export function isNotificationSupported(): boolean {
  return 'Notification' in window && 'serviceWorker' in navigator
}

export function getNotificationPermission(): NotificationPermission | null {
  return isNotificationSupported() ? Notification.permission : null
}

export function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isNotificationSupported()) return Promise.resolve('denied')
  return Notification.requestPermission()
}

// Czy powiadomienie ma w ogóle szansę się pokazać - sprawdzane SYNCHRONICZNIE, przed zapisaniem
// znacznika "już powiadomiono" w localStorage.
//
// Wszystkie przypomnienia w tej apce są jednorazowe per encja (wyprawa, grzybowisko) i chronione
// takim znacznikiem. Dotąd każde z nich zapisywało znacznik PRZED wywołaniem
// `showLocalNotification`, które przy braku zgody cicho wychodziło - więc użytkownik, który nie
// dał zgody na powiadomienia (albo jeszcze nie był o nią pytany, bo banner z prośbą żyje tylko w
// Dzienniku), tracił dane przypomnienie NA ZAWSZE: po późniejszym włączeniu zgody znacznik już
// mówił "wysłane". Najdotkliwiej dotyczyło to kontroli po kleszczach 14 dni po wyprawie
// (rumień wędrujący), czyli przypomnienia o realnych konsekwencjach zdrowotnych.
export function canShowNotifications(): boolean {
  return isNotificationSupported() && Notification.permission === 'granted'
}

// Powiadomienia idą przez Service Workera (showNotification), a nie konstruktor
// `new Notification()` - na Androidzie/Chrome mobile konstruktor jest niedostępny
// dla zainstalowanych PWA, trzeba korzystać z rejestracji SW.
//
// Zwraca `true` tylko gdy powiadomienie faktycznie zostało pokazane. Wywołania są celowo
// "fire and forget" (nikt na nie nie czeka), więc błąd z `showNotification` byłby inaczej
// nieobsłużonym odrzuceniem promisy - stąd try/catch zamiast propagowania wyjątku.
export async function showLocalNotification(title: string, options?: NotificationOptions): Promise<boolean> {
  if (!canShowNotifications()) return false
  try {
    const registration = await navigator.serviceWorker.ready
    await registration.showNotification(title, options)
    return true
  } catch {
    return false
  }
}
