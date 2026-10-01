import { memo } from 'react'
import { motion } from 'motion/react'

// Logo "Grzyby po piwku" w nagłówku - statyczna, okrągła odznaka wycięta z ostatniej klatki
// animowanego logo (pełna animacja leci raz na ekranie powitalnym, AppSplash). W pasku nagłówka
// zapętlona animacja z kuflami rozpraszałaby przy każdym spojrzeniu, więc tu tylko jednorazowy
// "pop" przy montowaniu. Plik 112 px = 2x rozmiaru wyświetlanego (size-12, -my-2 żeby nie pogrubiać paska nagłówka).
export const HeaderLogo = memo(function HeaderLogo() {
  return (
    <motion.img
      src={`${import.meta.env.BASE_URL}logo-naglowek.webp`}
      alt="Grzyby po piwku"
      width={48}
      height={48}
      className="-my-2 size-12 drop-shadow-md"
      initial={{ scale: 0, rotate: -20, opacity: 0 }}
      animate={{ scale: 1, rotate: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 14 }}
    />
  )
})
