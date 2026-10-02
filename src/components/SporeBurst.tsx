import { motion } from 'motion/react'

const SPORES = Array.from({ length: 14 }, (_, i) => {
  const angle = (i / 14) * Math.PI * 2
  const distance = 38 + (i % 3) * 14
  return { x: Math.cos(angle) * distance, y: Math.sin(angle) * distance - 10, size: 4 + (i % 3) * 2 }
})

// Jednorazowy "wybuch zarodników" - nagroda za pierwsze znalezisko danego gatunku. Czysto
// dekoracyjny (aria-hidden), w kolorach marki; przy "ogranicz ruch" MotionConfig w main.tsx
// zostawia samo zanikanie bez lotu cząstek.
export function SporeBurst() {
  return (
    <span aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-center">
      {SPORES.map((spore, i) => (
        <motion.span
          key={i}
          className={`absolute rounded-full ${i % 2 === 0 ? 'bg-brand-accent' : 'bg-primary'}`}
          style={{ width: spore.size, height: spore.size }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 0.4 }}
          animate={{ x: spore.x, y: spore.y, opacity: 0, scale: 1 }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
        />
      ))}
    </span>
  )
}
