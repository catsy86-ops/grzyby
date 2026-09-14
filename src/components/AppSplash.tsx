import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Logo } from './Logo'

// Prawdziwy natywny splash (biały ekran z ikoną przy zimnym starcie) generuje sam system z
// manifestu PWA - to poza kontrolą JS. To, co da się zrobić w kodzie: krótki, animowany ekran
// powitalny nad appką zaraz po pierwszym renderze, żeby przejście z natywnego splasha do
// właściwego UI nie było nagłe. Pokazywany tylko w trybie standalone (odinstalowana/dodana do
// ekranu głównego PWA) i tylko raz na sesję przeglądarki (sessionStorage) - zwykłe otwarcie karty
// w przeglądarce nie potrzebuje tego teatru.
const SPLASH_SEEN_KEY = 'grzybobranie-splash-seen'
const SPLASH_DURATION_MS = 900

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

  useEffect(() => {
    if (!visible) return
    const timer = setTimeout(() => {
      setVisible(false)
      try {
        sessionStorage.setItem(SPLASH_SEEN_KEY, '1')
      } catch {
        // localStorage/sessionStorage może być niedostępny (tryb prywatny) - splash po prostu
        // pokaże się ponownie przy następnym starcie, nic nie psuje.
      }
    }, SPLASH_DURATION_MS)
    return () => clearTimeout(timer)
  }, [visible])

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-primary"
        >
          <Logo className="size-16" />
          <span className="text-sm font-bold tracking-wide text-primary-foreground">
            Grzybobranie
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
