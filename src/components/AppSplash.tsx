import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'

// Prawdziwy natywny splash (biały ekran z ikoną przy zimnym starcie) generuje sam system z
// manifestu PWA - to poza kontrolą JS. To, co da się zrobić w kodzie: animowany ekran powitalny
// nad appką zaraz po pierwszym renderze. Pokazywany tylko w trybie standalone (zainstalowana/
// dodana do ekranu głównego PWA) i tylko raz na sesję przeglądarki (sessionStorage) - zwykłe
// otwarcie karty w przeglądarce nie potrzebuje tego teatru.
const SPLASH_SEEN_KEY = 'grzybobranie-splash-seen'
// Długość jednego przebiegu animowanego logo (suma opóźnień klatek logo-grzybobranie.webp).
// Logo z napisem pojawia się dopiero w drugiej połowie, więc splash czeka na pełny przebieg -
// dotknięcie ekranu pozwala go pominąć.
const SPLASH_DURATION_MS = 8000

function isStandalone() {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    // iOS Safari starsze wersje
    (navigator as unknown as { standalone?: boolean }).standalone === true
  )
}

export function AppSplash() {
  const [visible, setVisible] = useState(() => {
    try {
      return isStandalone() && sessionStorage.getItem(SPLASH_SEEN_KEY) !== '1'
    } catch {
      return false
    }
  })

  const dismiss = useCallback(() => {
    setVisible(false)
    try {
      sessionStorage.setItem(SPLASH_SEEN_KEY, '1')
    } catch {
      // sessionStorage może być niedostępny (tryb prywatny) - splash po prostu pokaże się
      // ponownie przy następnym starcie, nic nie psuje.
    }
  }, [])

  useEffect(() => {
    if (!visible) return
    const timer = setTimeout(dismiss, SPLASH_DURATION_MS)
    return () => clearTimeout(timer)
  }, [visible, dismiss])

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          onClick={dismiss}
          role="button"
          aria-label="Pomiń ekran powitalny"
          className="fixed inset-0 z-50 flex cursor-pointer flex-col items-center justify-center gap-3 bg-[#0d1220]"
        >
          <img
            src={`${import.meta.env.BASE_URL}logo-grzybobranie.webp`}
            alt="Grzybobranie"
            width={240}
            height={135}
            className="w-full max-w-sm"
          />
          <span className="text-xs text-white/50">Dotknij, aby pominąć</span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
