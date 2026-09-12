import { useState } from 'react'
import { Alert, AlertDescription } from './ui/alert'
import { Button } from './ui/button'
import {
  getNotificationPermission,
  isNotificationSupported,
  requestNotificationPermission,
} from '../utils/notifications'

const DISMISS_KEY = 'lysy-notif-banner-dismissed'

export function NotificationPermissionBanner() {
  const [permission, setPermission] = useState(getNotificationPermission())
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISS_KEY) === '1')

  if (!isNotificationSupported() || permission !== 'default' || dismissed) return null

  async function handleEnable() {
    const result = await requestNotificationPermission()
    setPermission(result)
  }

  function handleDismiss() {
    localStorage.setItem(DISMISS_KEY, '1')
    setDismissed(true)
  }

  return (
    <Alert className="flex items-center justify-between gap-2">
      <AlertDescription className="text-current">
        Włącz powiadomienia, aby dostać przypomnienie, gdy wyprawa trwa bardzo długo.
      </AlertDescription>
      <div className="flex shrink-0 gap-2">
        <Button size="sm" onClick={handleEnable}>
          Włącz
        </Button>
        <Button size="sm" variant="ghost" onClick={handleDismiss}>
          Nie teraz
        </Button>
      </div>
    </Alert>
  )
}
