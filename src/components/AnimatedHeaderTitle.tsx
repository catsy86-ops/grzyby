import { motion } from 'motion/react'

const TITLE = 'Grzybobranie'
const SUBTITLE = 'Leć po browara i dawaj w las!'

const LETTER_CONTAINER = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.035, delayChildren: 0.15 } },
}

const LETTER = {
  hidden: { opacity: 0, y: 10, rotate: -6 },
  visible: {
    opacity: 1,
    y: 0,
    rotate: 0,
    transition: { type: 'spring' as const, stiffness: 380, damping: 22 },
  },
}

// Nagłówek robi się "żywy" w dwóch krokach: litery "Grzybobranie" wskakują pojedynczo (jak
// grzyby wyrastające z ziemi), dopiero po nich pojawia się nazwa okolicy - w ten sposób oko
// najpierw czyta nazwę apki, a podtytuł czuje się jak hasło/zawołanie, nie część logo.
// Delikatny, zapętlony połysk (gradient sweep) na samym tytule - subtelny sygnał "żyje", bez
// pętli co sekundę, która by rozpraszała przy każdym spojrzeniu na nagłówek.
export function AnimatedHeaderTitle({ className }: { className?: string }) {
  return (
    <span className={`flex flex-col items-center leading-none ${className ?? ''}`}>
      <motion.span
        className="flex text-sm font-bold tracking-wide"
        variants={LETTER_CONTAINER}
        initial="hidden"
        animate="visible"
        aria-label={TITLE}
      >
        <motion.span
          className="bg-clip-text text-transparent"
          style={{
            backgroundImage:
              'linear-gradient(110deg, var(--color-primary-foreground) 40%, var(--color-amber-200) 50%, var(--color-primary-foreground) 60%)',
            backgroundSize: '250% 100%',
          }}
          animate={{ backgroundPosition: ['200% 0%', '-100% 0%'] }}
          transition={{ duration: 3.2, repeat: Infinity, repeatDelay: 2.5, ease: 'easeInOut', delay: 1.2 }}
          aria-hidden="true"
        >
          {TITLE.split('').map((char, index) => (
            <motion.span key={index} variants={LETTER} className="inline-block">
              {char === ' ' ? ' ' : char}
            </motion.span>
          ))}
        </motion.span>
      </motion.span>
      <motion.span
        className="text-[0.65rem] font-medium tracking-[0.14em] text-primary-foreground/75 uppercase"
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.15 + TITLE.length * 0.035 + 0.1 }}
      >
        {SUBTITLE}
      </motion.span>
    </span>
  )
}
