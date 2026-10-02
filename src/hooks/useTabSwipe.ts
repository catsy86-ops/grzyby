import { useEffect, type RefObject } from 'react'

const MIN_DISTANCE_PX = 70
const MAX_DURATION_MS = 600

// Czy dotyk zaczął się w elemencie, który sam przewija się poziomo (np. rząd chipów filtrów w Bazie
// wiedzy) - wtedy poziomy ruch palca należy do niego, nie do przełączania zakładek.
function startsInHorizontalScroller(target: EventTarget | null, boundary: HTMLElement): boolean {
  let el = target instanceof HTMLElement ? target : null
  while (el && el !== boundary) {
    if (el.scrollWidth > el.clientWidth + 1 && /auto|scroll/.test(getComputedStyle(el).overflowX)) return true
    el = el.parentElement
  }
  return false
}

// Przesunięcie palcem w lewo/prawo po treści zakładki przełącza na sąsiednią zakładkę (jak w
// natywnych apkach z dolną nawigacją). `enabled: false` na Mapie - tam poziomy ruch to
// przesuwanie mapy. Tylko szybki, wyraźnie poziomy gest (dx > 2*dy), żeby nie łapać zwykłego
// przewijania listy w pionie.
export function useTabSwipe(
  ref: RefObject<HTMLElement | null>,
  { enabled, onSwipeLeft, onSwipeRight }: { enabled: boolean; onSwipeLeft: () => void; onSwipeRight: () => void },
) {
  useEffect(() => {
    const el = ref.current
    if (!el || !enabled) return
    let start: { x: number; y: number; t: number } | null = null

    function handleStart(e: TouchEvent) {
      if (e.touches.length !== 1 || startsInHorizontalScroller(e.target, el!)) {
        start = null
        return
      }
      const touch = e.touches[0]
      start = { x: touch.clientX, y: touch.clientY, t: Date.now() }
    }

    function handleEnd(e: TouchEvent) {
      if (!start) return
      const touch = e.changedTouches[0]
      const dx = touch.clientX - start.x
      const dy = touch.clientY - start.y
      const quick = Date.now() - start.t < MAX_DURATION_MS
      start = null
      if (!quick || Math.abs(dx) < MIN_DISTANCE_PX || Math.abs(dx) < 2 * Math.abs(dy)) return
      if (dx < 0) onSwipeLeft()
      else onSwipeRight()
    }

    el.addEventListener('touchstart', handleStart, { passive: true })
    el.addEventListener('touchend', handleEnd, { passive: true })
    return () => {
      el.removeEventListener('touchstart', handleStart)
      el.removeEventListener('touchend', handleEnd)
    }
  }, [ref, enabled, onSwipeLeft, onSwipeRight])
}
