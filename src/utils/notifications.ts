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

// Powiadomienia idą przez Service Workera (showNotification), a nie konstruktor
// `new Notification()` - na Androidzie/Chrome mobile konstruktor jest niedostępny
// dla zainstalowanych PWA, trzeba korzystać z rejestracji SW.
export async function showLocalNotification(title: string, options?: NotificationOptions): Promise<void> {
  if (!isNotificationSupported() || Notification.permission !== 'granted') return
  const registration = await navigator.serviceWorker.ready
  await registration.showNotification(title, options)
}
