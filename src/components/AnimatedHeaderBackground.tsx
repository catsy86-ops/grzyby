import { motion } from 'motion/react'

interface FloatingIcon {
  emoji: string
  leftPercent: number
  size: number
  duration: number
  delay: number
}

// Rozrzut pozycji/rozmiaru/tempa ręcznie dobrany (nie losowany przy każdym renderze) - stały
// układ, żeby nagłówek nie "przeskakiwał" inaczej przy każdym odświeżeniu, i żeby żadne dwie
// ikony nie wystartowały dokładnie w tym samym miejscu i momencie.
const ICONS: FloatingIcon[] = [
  { emoji: '🍄', leftPercent: 6, size: 16, duration: 7, delay: 0 },
  { emoji: '🍺', leftPercent: 18, size: 14, duration: 9, delay: 1.4 },
  { emoji: '🍄', leftPercent: 32, size: 12, duration: 8, delay: 3.1 },
  { emoji: '🍻', leftPercent: 48, size: 15, duration: 6.5, delay: 0.6 },
  { emoji: '🍄', leftPercent: 62, size: 13, duration: 8.5, delay: 2.2 },
  { emoji: '🍺', leftPercent: 76, size: 16, duration: 7.5, delay: 4 },
  { emoji: '🍄', leftPercent: 88, size: 14, duration: 9.5, delay: 1 },
]

// Zastępuje płaski, jednolicie zielony gradient nagłówka - subtelnie unoszące się grzyby i kufle
// piwa w tle, w duchu "leć po browara i dawaj w las" z podtytułu obok. `overflow-hidden` na
// nagłówku (patrz App.tsx) obcina ikony wypływające poza jego wysokość, `pointer-events-none` +
// niska nieprzezroczystość, żeby nie kolidowały z faktyczną treścią nagłówka nad nimi (z-10).
export function AnimatedHeaderBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
      {ICONS.map((icon, index) => (
        <motion.span
          key={index}
          className="absolute select-none opacity-25"
          style={{ left: `${icon.leftPercent}%`, fontSize: icon.size, bottom: -20 }}
          animate={{ y: [0, -90], opacity: [0, 0.3, 0.3, 0], rotate: [0, 12, -8, 0] }}
          transition={{
            duration: icon.duration,
            delay: icon.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          {icon.emoji}
        </motion.span>
      ))}
    </div>
  )
}
