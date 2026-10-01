import { memo } from 'react'
import { motion } from 'motion/react'

// Logo "Grzyby po piwku" w nagłówku - okrągła odznaka wycięta z końcówki animowanego logo
// (klatki z gotową odznaką: błysk + bąbelki, 2,5 s w pętli; pełna animacja z wlatującymi kuflami
// leci raz na ekranie powitalnym, AppSplash). Animowany WebP nie respektuje
// prefers-reduced-motion sam z siebie, więc <picture> podaje wtedy statyczną klatkę. Pliki
// 128 px = 2x największego rozmiaru wyświetlanego (sm:size-16). Ujemny margines pionowy, żeby
// większa odznaka nie pogrubiała paska nagłówka.
export const HeaderLogo = memo(function HeaderLogo() {
  const base = import.meta.env.BASE_URL
  return (
    <motion.picture
      className="-my-3 block shrink-0 rounded-full shadow-md ring-2 ring-primary-foreground/25"
      initial={{ scale: 0, rotate: -20, opacity: 0 }}
      animate={{ scale: 1, rotate: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 14 }}
    >
      <source srcSet={`${base}logo-naglowek-statyczne.webp`} media="(prefers-reduced-motion: reduce)" />
      <img
        src={`${base}logo-naglowek.webp`}
        alt="Grzyby po piwku"
        width={64}
        height={64}
        className="size-14 sm:size-16"
      />
    </motion.picture>
  )
})
