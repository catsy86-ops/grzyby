import { useState } from 'react'
import { Alert, AlertDescription } from '../../components/ui/alert'
import { Button } from '../../components/ui/button'
import {
  getNotificationPermission,
  isNotificationSupported,
  requestNotificationPermission,
} from '../../utils/notifications'

const DISMISS_KEY = 'lysy-notif-banner-dismissed'

export function NotificationPermissionBanner() {
  const [permission, setPermission] = useState(getNotificationPermission())
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISS_KEY) === '1')

  if (!isNotificationSupported() || permission === 'granted' || dismissed) return null

  async function handleEnable() {
    const result = await requestNotificationPermission()
    setPermission(result)
  }

  function handleDismiss() {
    localStorage.setItem(DISMISS_KEY, '1')
    setDismissed(true)
  }

  // Stan "odmówiono" nie dawał dotąd ŻADNEJ informacji - banner po prostu znikał. Użytkownik nie
  // miał skąd wiedzieć, że wyłączył sobie ostrzeżenie o burzy, przypomnienie o kleszczach,
  // o przeciągającej się wyprawie i o rewizycie grzybowiska. Zgody nie da się odzyskać z poziomu
  // strony (przeglądarka wymaga zmiany w ustawieniach witryny), więc tu jest sam komunikat,
  // spokojny w tonie i bez przycisku, który i tak by nie zadziałał.
  if (permission === 'denied') {
    return (
      <Alert className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <AlertDescription className="text-current">
          Powiadomienia są zablokowane, więc nie dostaniesz ostrzeżenia o burzy, przypomnienia
          o kleszczach ani o przeciągającej się wyprawie. Możesz to zmienić w ustawieniach witryny
          w przeglądarce.
        </AlertDescription>
        <div className="flex shrink-0 gap-2 self-end sm:self-auto">
          <Button size="sm" variant="ghost" onClick={handleDismiss}>
            Rozumiem
          </Button>
        </div>
      </Alert>
    )
  }

  return (
    <Alert className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <AlertDescription className="text-current">
        Włącz powiadomienia, aby dostać ostrzeżenie o burzy, przypomnienie o kleszczach i o tym,
        że wyprawa trwa bardzo długo.
      </AlertDescription>
      <div className="flex shrink-0 gap-2 self-end sm:self-auto">
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
