import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  getNotificationPermission,
  isNotificationSupported,
  requestNotificationPermission,
  showLocalNotification,
} from './notifications'

function mockNotification(permission: NotificationPermission, requestResult?: NotificationPermission) {
  vi.stubGlobal('Notification', {
    permission,
    requestPermission: vi.fn(() => Promise.resolve(requestResult ?? permission)),
  })
}

function mockServiceWorker(showNotification = vi.fn(() => Promise.resolve())) {
  vi.stubGlobal('navigator', {
    ...navigator,
    serviceWorker: { ready: Promise.resolve({ showNotification }) },
  })
  return showNotification
}

describe('notifications', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('zgłasza brak wsparcia, gdy nie ma Notification lub serviceWorker', () => {
    vi.stubGlobal('navigator', { ...navigator, serviceWorker: undefined })
    expect(isNotificationSupported()).toBe(false)
    expect(getNotificationPermission()).toBeNull()
  })

  it('zwraca aktualne uprawnienie, gdy API jest wspierane', () => {
    mockNotification('granted')
    mockServiceWorker()
    expect(isNotificationSupported()).toBe(true)
    expect(getNotificationPermission()).toBe('granted')
  })

  it('odrzuca prośbę o uprawnienie bez rzucania, gdy API nie jest wspierane', async () => {
    vi.stubGlobal('navigator', { ...navigator, serviceWorker: undefined })
    await expect(requestNotificationPermission()).resolves.toBe('denied')
  })

  it('deleguje prośbę o uprawnienie do Notification.requestPermission', async () => {
    mockNotification('default', 'granted')
    mockServiceWorker()
    await expect(requestNotificationPermission()).resolves.toBe('granted')
  })

  it('nie wywołuje showNotification, gdy uprawnienie nie jest przyznane', async () => {
    mockNotification('denied')
    const showNotification = mockServiceWorker()
    await showLocalNotification('Tytuł')
    expect(showNotification).not.toHaveBeenCalled()
  })

  it('wywołuje showNotification z rejestracji Service Workera, gdy uprawnienie jest przyznane', async () => {
    mockNotification('granted')
    const showNotification = mockServiceWorker()
    await showLocalNotification('Tytuł', { body: 'Treść' })
    expect(showNotification).toHaveBeenCalledWith('Tytuł', { body: 'Treść' })
  })
})
