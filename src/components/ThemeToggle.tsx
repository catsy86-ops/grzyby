import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { MoonIcon, SunIcon } from 'lucide-react'

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  // next-themes odczytuje motyw z localStorage dopiero po zamontowaniu (żeby nie renderować
  // niepoprawnej ikony przed hydratacją) - do pierwszego montażu resolvedTheme jest undefined.
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const isDark = mounted && resolvedTheme === 'dark'

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={isDark ? 'Przełącz na jasny motyw' : 'Przełącz na ciemny motyw'}
      className="flex size-8 shrink-0 items-center justify-center rounded-full text-primary-foreground/80 outline-none transition-[color,background-color,transform] hover:bg-primary-foreground/10 hover:text-primary-foreground focus-visible:ring-3 focus-visible:ring-primary-foreground/50 active:translate-y-px"
    >
      {mounted && (isDark ? <SunIcon className="size-4" /> : <MoonIcon className="size-4" />)}
    </button>
  )
}
