import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as notifications from '../../utils/notifications'
import { NotificationPermissionBanner } from './NotificationPermissionBanner'

const DISMISS_KEY = 'lysy-notif-banner-dismissed'

beforeEach(() => {
  localStorage.removeItem(DISMISS_KEY)
  vi.restoreAllMocks()
})

afterEach(() => cleanup())

describe('NotificationPermissionBanner', () => {
  it('nie pokazuje się, gdy przeglądarka nie wspiera powiadomień', () => {
    vi.spyOn(notifications, 'isNotificationSupported').mockReturnValue(false)
    vi.spyOn(notifications, 'getNotificationPermission').mockReturnValue(null)

    render(<NotificationPermissionBanner />)
    expect(screen.queryByText(/Włącz powiadomienia/)).not.toBeInTheDocument()
  })

  it('nie pokazuje się, gdy uprawnienie już rozstrzygnięte (nie "default")', () => {
    vi.spyOn(notifications, 'isNotificationSupported').mockReturnValue(true)
    vi.spyOn(notifications, 'getNotificationPermission').mockReturnValue('granted')

    render(<NotificationPermissionBanner />)
    expect(screen.queryByText(/Włącz powiadomienia/)).not.toBeInTheDocument()
  })

  it('pokazuje się, gdy wsparcie jest i uprawnienie jeszcze nierozstrzygnięte', () => {
    vi.spyOn(notifications, 'isNotificationSupported').mockReturnValue(true)
    vi.spyOn(notifications, 'getNotificationPermission').mockReturnValue('default')

    render(<NotificationPermissionBanner />)
    expect(screen.getByText(/Włącz powiadomienia/)).toBeInTheDocument()
  })

  it('"Włącz" woła requestNotificationPermission i chowa baner po przyznaniu', async () => {
    vi.spyOn(notifications, 'isNotificationSupported').mockReturnValue(true)
    vi.spyOn(notifications, 'getNotificationPermission').mockReturnValue('default')
    const requestSpy = vi.spyOn(notifications, 'requestNotificationPermission').mockResolvedValue('granted')

    render(<NotificationPermissionBanner />)
    fireEvent.click(screen.getByRole('button', { name: 'Włącz' }))

    expect(requestSpy).toHaveBeenCalledOnce()
    await waitFor(() => expect(screen.queryByText(/Włącz powiadomienia/)).not.toBeInTheDocument())
  })

  it('"Nie teraz" zapisuje odrzucenie w localStorage i chowa baner na stałe (do odświeżenia)', () => {
    vi.spyOn(notifications, 'isNotificationSupported').mockReturnValue(true)
    vi.spyOn(notifications, 'getNotificationPermission').mockReturnValue('default')

    render(<NotificationPermissionBanner />)
    fireEvent.click(screen.getByRole('button', { name: 'Nie teraz' }))

    expect(screen.queryByText(/Włącz powiadomienia/)).not.toBeInTheDocument()
    expect(localStorage.getItem(DISMISS_KEY)).toBe('1')
  })
})
