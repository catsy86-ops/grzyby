import { motion } from 'motion/react'

// Logo "Grzybobranie" - własne SVG zamiast emoji 🍄 (spójny wygląd na każdym urządzeniu/foncie
// systemowym, emoji renderuje się różnie zależnie od platformy). Animacja: "pop" przy pierwszym
// montowaniu apki (jak mini-splash), potem cykliczne, subtelne kołysanie kapelusza - żywa
// maskotka, bez przesady (bez pętli co sekundę, żeby nie rozpraszać).
export function Logo({ className }: { className?: string }) {
  return (
    <motion.svg
      viewBox="0 0 24 24"
      className={className}
      initial={{ scale: 0, rotate: -25, opacity: 0 }}
      animate={{
        scale: 1,
        rotate: [-25, 6, -3, 0, -4, 0],
        opacity: 1,
      }}
      transition={{
        scale: { type: 'spring', stiffness: 260, damping: 14 },
        opacity: { duration: 0.2 },
        rotate: { duration: 1.1, times: [0, 0.4, 0.6, 0.75, 0.9, 1], ease: 'easeOut' },
      }}
      aria-hidden="true"
    >
      <path
        d="M12 2C6.5 2 3 6 3 9.5c0 1 .5 1.5 1.5 1.5h15c1 0 1.5-.5 1.5-1.5C21 6 17.5 2 12 2Z"
        fill="var(--color-amber-700)"
      />
      <circle cx="8" cy="7" r="1" fill="var(--color-amber-200)" opacity="0.85" />
      <circle cx="14.5" cy="6" r="0.8" fill="var(--color-amber-200)" opacity="0.85" />
      <circle cx="12" cy="8.5" r="0.7" fill="var(--color-amber-200)" opacity="0.7" />
      <path d="M9.5 11h5l-.8 8a1.7 1.7 0 0 1-1.7 1.5h0a1.7 1.7 0 0 1-1.7-1.5l-.8-8Z" fill="var(--color-amber-50)" />
    </motion.svg>
  )
}
