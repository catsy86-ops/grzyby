import { AnimatePresence, motion } from 'motion/react'
import { Alert, AlertDescription } from '../../components/ui/alert'
import { Button } from '../../components/ui/button'

interface MapOverlayMessagesProps {
  tileLoadIssue: boolean
  onDismissTileLoadIssue: () => void
  locateError: string | null
  onDismissLocateError: () => void
  showPinHint: boolean
}

// Stos komunikatów w prawym dolnym rogu mapy - wydzielony z MapView (Faza 19). Logika
// pierwszeństwa (błąd kafli > błąd lokalizacji > podpowiedź) żyje tutaj, w jednym miejscu,
// zamiast rozproszona po warunkach w JSX-ie głównego widoku. Oba typy błędów żyły dotąd w tym
// samym wąskim rogu i mogły być widoczne naraz - ważniejszy komunikat (wymaga reakcji) zawsze
// wygrywa z samą podpowiedzią UX.
export function MapOverlayMessages({
  tileLoadIssue,
  onDismissTileLoadIssue,
  locateError,
  onDismissLocateError,
  showPinHint,
}: MapOverlayMessagesProps) {
  return (
    <AnimatePresence>
      {tileLoadIssue && (
        <motion.div
          key="tile-load-issue"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.18 }}
        >
          <Alert variant="destructive-soft" className="max-w-56 shadow">
            <AlertDescription className="text-current">
              Brak zapisanych kafelków mapy dla tego obszaru offline. Pobierz obszar będąc online.
            </AlertDescription>
            <Button
              variant="ghost"
              size="sm"
              className="mt-1 h-auto p-0 text-xs underline"
              onClick={onDismissTileLoadIssue}
            >
              Rozumiem
            </Button>
          </Alert>
        </motion.div>
      )}
      {!tileLoadIssue && locateError && (
        <motion.div
          key="locate-error"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.18 }}
        >
          <Alert variant="destructive-soft" className="max-w-56 shadow">
            <AlertDescription className="text-current">{locateError}</AlertDescription>
            <Button
              variant="ghost"
              size="sm"
              className="mt-1 h-auto p-0 text-xs underline"
              onClick={onDismissLocateError}
            >
              Rozumiem
            </Button>
          </Alert>
        </motion.div>
      )}
      {!tileLoadIssue && !locateError && showPinHint && (
        <motion.p
          key="pin-hint"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.18 }}
          className="max-w-56 rounded bg-card/90 p-2 text-xs text-muted-foreground shadow"
        >
          Stuknij na mapie, aby wybrać dokładne miejsce znaleziska (domyślnie Twoja pozycja)
        </motion.p>
      )}
    </AnimatePresence>
  )
}
