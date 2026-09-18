import { useEffect, useState } from 'react'

// Battery Status API - eksperymentalne, wspierane w Chrome/Android (dokładnie platforma, na
// którą realnie celuje ta apka - patrz LAN-testing na telefonie w pamięci projektu), ale
// nieobecne w Firefox i Safari/iOS z powodów prywatności. Typ nie jest częścią lib.dom.d.ts,
// stąd ręczna deklaracja zamiast @types/battery-status - pakiet ten nie jest utrzymywany.
interface BatteryManager extends EventTarget {
  level: number
  charging: boolean
}

interface NavigatorWithBattery extends Navigator {
  getBattery?: () => Promise<BatteryManager>
}

export interface BatteryStatus {
  level: number
  charging: boolean
}

// `null` dopóki API jest niewspierane lub odczyt jeszcze nie nadszedł - w obu przypadkach
// wołający (np. tryb "auto" oszczędzania baterii) powinien po prostu zachować się tak, jakby
// tryb oszczędzania nie mógł się automatycznie włączyć.
export function useBatteryStatus(): BatteryStatus | null {
  const [status, setStatus] = useState<BatteryStatus | null>(null)

  useEffect(() => {
    const getBattery = (navigator as NavigatorWithBattery).getBattery
    if (!getBattery) return

    let cancelled = false
    let battery: BatteryManager | null = null

    function updateFromBattery() {
      if (battery) setStatus({ level: battery.level, charging: battery.charging })
    }

    getBattery.call(navigator).then((b) => {
      if (cancelled) return
      battery = b
      updateFromBattery()
      b.addEventListener('levelchange', updateFromBattery)
      b.addEventListener('chargingchange', updateFromBattery)
    })

    return () => {
      cancelled = true
      battery?.removeEventListener('levelchange', updateFromBattery)
      battery?.removeEventListener('chargingchange', updateFromBattery)
    }
  }, [])

  return status
}
