import { useEffect, useState } from 'react'

// Śledzi wynik media query (np. szerokość ekranu) reaktywnie - do decyzji layoutu podejmowanych
// w JS (np. kierunek wysuwania Drawer), których nie da się wyrazić samym Tailwindem (props
// komponentu, nie klasa CSS).
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => (typeof window === 'undefined' ? false : window.matchMedia(query).matches))

  useEffect(() => {
    const mediaQueryList = window.matchMedia(query)
    function handleChange() {
      setMatches(mediaQueryList.matches)
    }
    handleChange()
    mediaQueryList.addEventListener('change', handleChange)
    return () => mediaQueryList.removeEventListener('change', handleChange)
  }, [query])

  return matches
}
