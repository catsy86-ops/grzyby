import { useEffect, useState } from 'react'

type DayPhase = 'swit' | 'dzien' | 'zmierzch' | 'noc'

export function getDayPhase(hour: number): DayPhase {
  if (hour >= 5 && hour < 8) return 'swit'
  if (hour >= 8 && hour < 18) return 'dzien'
  if (hour >= 18 && hour < 21) return 'zmierzch'
  return 'noc'
}

// Delikatna poświata nakładana na zielony nagłówek wg pory dnia - poranna mgła o świcie,
// ciepłe światło o zmierzchu, chłodniejszy granat nocą. W dzień brak nakładki (czysty kolor marki).
// Niska nieprzezroczystość, żeby nie psuć kontrastu ikon i logo na wierzchu.
const GLOW: Record<DayPhase, string | null> = {
  swit: 'radial-gradient(120% 140% at 15% 0%, rgb(255 200 140 / 0.5), transparent 70%)',
  dzien: null,
  zmierzch: 'radial-gradient(120% 160% at 85% 0%, rgb(255 130 50 / 0.55), rgb(130 60 150 / 0.25) 60%, transparent 90%)',
  noc: 'linear-gradient(180deg, rgb(10 20 60 / 0.55), rgb(10 20 60 / 0.25))',
}

export function TimeOfDayGlow() {
  const [phase, setPhase] = useState(() => getDayPhase(new Date().getHours()))
  useEffect(() => {
    const id = setInterval(() => setPhase(getDayPhase(new Date().getHours())), 5 * 60_000)
    return () => clearInterval(id)
  }, [])
  const background = GLOW[phase]
  if (!background) return null
  return (
    <div
      aria-hidden="true"
      data-phase={phase}
      className="pointer-events-none absolute inset-0 z-0 transition-opacity duration-1000"
      style={{ background }}
    />
  )
}
