import { useEffect, useRef, useState } from 'react'
import { PauseIcon, PlayIcon, RotateCcwIcon, TimerIcon } from 'lucide-react'
import { toast } from 'sonner'
import { formatCountdown } from '../utils/cookingTimer'
import { showLocalNotification } from '../utils/notifications'
import { Button } from './ui/button'
import { Dialog, DialogContent, DialogTitle } from './ui/dialog'

const PRESETS = [
  { label: 'Blanszowanie (5 min)', seconds: 5 * 60 },
  { label: 'Krótkie gotowanie (15 min)', seconds: 15 * 60 },
  { label: 'Smardz/piestrzenica - dokładne ugotowanie (20 min)', seconds: 20 * 60 },
]

// Timer do blanszowania/gotowania grzybów. Działa tylko, gdy karta jest otwarta (odliczanie
// oparte o setInterval w przeglądarce - bez backendu nie ma realnego timera w tle), dlatego przy
// zakończeniu wysyła zarówno powiadomienie lokalne (na wypadek zminimalizowanej karty), jak i
// wibrację/toast (gdy apka jest na pierwszym planie).
export function CookingTimer({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [customMinutes, setCustomMinutes] = useState('10')
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!isRunning) return
    intervalRef.current = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev == null) return prev
        if (prev <= 1) {
          setIsRunning(false)
          toast.success('Timer zakończony')
          if ('vibrate' in navigator) navigator.vibrate([200, 100, 200])
          showLocalNotification('Timer zakończony', { body: 'Czas minął - sprawdź, co gotujesz.', tag: 'lysy-cooking-timer' })
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isRunning])

  function start(seconds: number) {
    setRemainingSeconds(seconds)
    setIsRunning(true)
  }

  function togglePause() {
    if (remainingSeconds == null) return
    setIsRunning((r) => !r)
  }

  function reset() {
    setIsRunning(false)
    setRemainingSeconds(null)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-[calc(100%-2rem)] overflow-y-auto sm:max-w-md">
        <DialogTitle className="flex items-center gap-2">
          <TimerIcon className="size-5" />
          Timer kuchenny
        </DialogTitle>

        {remainingSeconds != null ? (
          <div className="flex flex-col items-center gap-4 py-2">
            <span className="text-5xl font-bold tabular-nums">{formatCountdown(remainingSeconds)}</span>
            <div className="flex gap-2">
              <Button variant="outline" onClick={togglePause}>
                {isRunning ? <PauseIcon /> : <PlayIcon />}
                {isRunning ? 'Pauza' : 'Wznów'}
              </Button>
              <Button variant="outline" onClick={reset}>
                <RotateCcwIcon />
                Resetuj
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-xs text-muted-foreground">
              Sugerowane czasy (patrz też porady przygotowania przy gatunku w Bazie wiedzy):
            </p>
            <div className="flex flex-col gap-1.5">
              {PRESETS.map((preset) => (
                <Button key={preset.label} variant="outline" className="justify-start" onClick={() => start(preset.seconds)}>
                  {preset.label}
                </Button>
              ))}
            </div>
            <div className="flex items-end gap-2">
              <label className="flex-1 text-xs text-muted-foreground">
                Własny czas (minuty)
                <input
                  type="number"
                  min={1}
                  max={180}
                  value={customMinutes}
                  onChange={(e) => setCustomMinutes(e.target.value)}
                  className="mt-1 block h-8 w-full rounded-md border border-border bg-background px-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                />
              </label>
              <Button
                onClick={() => {
                  const minutes = Math.max(1, Math.min(180, Number(customMinutes) || 1))
                  start(minutes * 60)
                }}
              >
                Start
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
