import { useEffect } from 'react'
import { toast } from 'sonner'
import { useActiveTrip } from '../stores/useActiveTrip'
import { useOnlineStatus } from './useOnlineStatus'
import { getCurrentPosition } from '../utils/geolocation'
import { showLocalNotification } from '../utils/notifications'
import { fetchStormForecast } from '../utils/stormRisk'

const NOTIFIED_KEY_PREFIX = 'lysy-storm-warning-notified-'
const CHECK_INTERVAL_MS = 30 * 60_000

// Bezpieczeństwo, nie "czy warto szukać grzybów" (to useMushroomOutlook) - podczas aktywnej
// wyprawy okresowo (jednorazowy odczyt GPS, nie ciągły watch - oszczędza baterię) sprawdza
// prognozę na dziś pod kątem burzy/silnego wiatru. Powiadamia raz na wyprawę, żeby nie zasypać
// użytkownika powtórkami tego samego ostrzeżenia.
export function useStormWarning() {
  const { activeTripId, activeTrip } = useActiveTrip()
  const isOnline = useOnlineStatus()

  useEffect(() => {
    if (activeTripId == null || !activeTrip || !isOnline) return
    const key = `${NOTIFIED_KEY_PREFIX}${activeTripId}`

    async function checkStorm() {
      if (localStorage.getItem(key) === '1') return
      try {
        const position = await getCurrentPosition()
        const forecast = await fetchStormForecast(position.latitude, position.longitude)
        if (!forecast.isStormRisk) return
        localStorage.setItem(key, '1')
        const body =
          'Dzisiejsza prognoza zapowiada burzę lub silny wiatr w Twojej okolicy - rozważ wcześniejszy powrót z lasu.'
        const shown = await showLocalNotification('Ostrzeżenie pogodowe', {
          body,
          tag: 'lysy-storm-warning',
        })
        // Kanał zapasowy w apce, gdy powiadomienia systemowe są niedostępne lub odmówione.
        // Prognoza jest już w ręku, więc nie kosztuje to dodatkowego zapytania - a bez tego
        // ostrzeżenie o burzy było jedynym przypomnieniem bez ŻADNEJ drogi dotarcia do
        // użytkownika (`utils/notificationCenter.ts` świadomie pomija je w dzwonku, bo tam
        // wymagałoby powtórnego fetchu pogody).
        if (!shown) toast.warning(body)
      } catch {
        // brak GPS/sieci - spróbujemy ponownie przy kolejnym sprawdzeniu
      }
    }

    checkStorm()
    const interval = setInterval(checkStorm, CHECK_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [activeTripId, activeTrip, isOnline])
}
