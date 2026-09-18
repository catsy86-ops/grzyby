import { useEffect, useRef, useState } from 'react'

export type CompassPermissionState = 'unsupported' | 'unknown' | 'prompt' | 'granted' | 'denied'

export interface UseDeviceHeadingResult {
  // Kąt 0-360 wg prawdziwej północy (0 = N), skorygowany o orientację ekranu (patrz niżej), lub
  // `null` dopóki nie nadszedł pierwszy odczyt czujnika.
  headingDegrees: number | null
  permissionState: CompassPermissionState
  requestPermission: () => Promise<void>
}

// Typ z propozycji specyfikacji (Chrome/Android) dla zdarzenia z odczytem wg prawdziwej północy
// zamiast dowolnego punktu odniesienia czujnika - unika ręcznej kalibracji względem bieguna
// magnetycznego, którą dałoby tylko `deviceorientation`+magnetometr osobno.
interface DeviceOrientationEventWithWebkit extends DeviceOrientationEvent {
  webkitCompassHeading?: number
}

type DeviceOrientationEventConstructorWithPermission = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<'granted' | 'denied'>
}

function currentScreenAngle(): number {
  // `screen.orientation.angle` jest standardem; `window.orientation` to starszy fallback (iOS
  // Safari < 16.4). Bez tej korekty kompas "kłamałby" po obróceniu telefonu do trybu poziomego -
  // czujnik mierzy kąt względem obudowy urządzenia, nie względem tego, co użytkownik widzi na
  // ekranie.
  if (typeof screen !== 'undefined' && screen.orientation && typeof screen.orientation.angle === 'number') {
    return screen.orientation.angle
  }
  const legacy = (window as Window & { orientation?: number }).orientation
  return typeof legacy === 'number' ? legacy : 0
}

// Kompas offline oparty wyłącznie na czujnikach urządzenia (magnetometr/żyroskop przez
// DeviceOrientationEvent) - zero zależności sieciowej, działa identycznie bez zasięgu w lesie.
// iOS 13+ wymaga jawnej zgody użytkownika (musi być wywołana z gestu - stąd `requestPermission`
// zwracane osobno, nie wołane automatycznie w efekcie), Android/Chrome nie wymaga promptu i
// wspiera dokładniejsze `deviceorientationabsolute`.
export function useDeviceHeading(): UseDeviceHeadingResult {
  const [headingDegrees, setHeadingDegrees] = useState<number | null>(null)
  const [permissionState, setPermissionState] = useState<CompassPermissionState>('unknown')
  const listenerAttachedRef = useRef(false)

  useEffect(() => {
    if (typeof DeviceOrientationEvent === 'undefined') {
      setPermissionState('unsupported')
      return
    }
    const needsPermission =
      typeof (DeviceOrientationEvent as DeviceOrientationEventConstructorWithPermission).requestPermission ===
      'function'
    setPermissionState(needsPermission ? 'prompt' : 'granted')
  }, [])

  useEffect(() => {
    if (permissionState !== 'granted' || listenerAttachedRef.current) return

    function handleOrientation(event: DeviceOrientationEventWithWebkit) {
      const screenAngle = currentScreenAngle()
      let heading: number | null = null
      if (typeof event.webkitCompassHeading === 'number') {
        // iOS Safari: już wg prawdziwej północy, kompensuje magnetic declination samodzielnie.
        heading = event.webkitCompassHeading - screenAngle
      } else if (event.alpha != null) {
        // `alpha` rośnie przeciwnie do azymutu (0 = urządzenie skierowane "od siebie" w chwili
        // kalibracji, rosnący w lewo) - stąd `360 - alpha`, potem korekta o obrót ekranu.
        heading = 360 - event.alpha - screenAngle
      }
      if (heading == null) return
      heading = ((heading % 360) + 360) % 360
      setHeadingDegrees(heading)
    }

    // `deviceorientationabsolute` (Chrome/Android) daje kąt zawsze wg prawdziwej północy;
    // zwykły `deviceorientation` bez `webkitCompassHeading` bywa względny wobec dowolnego punktu
    // startowego czujnika - wolimy dokładniejsze zdarzenie, gdy przeglądarka je wspiera.
    const supportsAbsolute = 'ondeviceorientationabsolute' in window
    const eventName = supportsAbsolute ? 'deviceorientationabsolute' : 'deviceorientation'
    window.addEventListener(eventName, handleOrientation as EventListener)
    listenerAttachedRef.current = true

    return () => {
      window.removeEventListener(eventName, handleOrientation as EventListener)
      listenerAttachedRef.current = false
    }
  }, [permissionState])

  async function requestPermission() {
    const ctor = DeviceOrientationEvent as DeviceOrientationEventConstructorWithPermission
    if (typeof ctor.requestPermission !== 'function') {
      setPermissionState('granted')
      return
    }
    try {
      const result = await ctor.requestPermission()
      setPermissionState(result === 'granted' ? 'granted' : 'denied')
    } catch {
      setPermissionState('denied')
    }
  }

  return { headingDegrees, permissionState, requestPermission }
}
