import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { MapIcon, CameraIcon, WrenchIcon } from 'lucide-react'
import { Button } from './ui/button'

const ONBOARDING_SEEN_KEY = 'lysy-onboarding-seen'

interface Slide {
  icon: typeof MapIcon
  title: string
  description: string
}

const SLIDES: Slide[] = [
  {
    icon: MapIcon,
    title: 'Zapisuj znaleziska na mapie',
    description:
      'Każde znalezisko trafia na mapę z lokalizacją i zdjęciem. Mapa i dane działają w pełni offline - w lesie zwykle nie ma zasięgu.',
  },
  {
    icon: CameraIcon,
    title: 'Rozpoznaj gatunek ze zdjęcia',
    description:
      'Aparat i AI pomogą wstępnie rozpoznać grzyba. To pomoc, nie wyrocznia - przy jadalności zawsze kieruj się pewnością rozpoznania, nie samą sugestią apki.',
  },
  {
    icon: WrenchIcon,
    title: 'Narzędzia zawsze pod ręką',
    description:
      'Pierwsza pomoc przy zatruciu, usuwanie kleszczy, checklista sprzętu i timer kuchenny - w menu "Narzędzia" w prawym górnym rogu.',
  },
]

function readSeen(): boolean {
  try {
    return localStorage.getItem(ONBOARDING_SEEN_KEY) === '1'
  } catch {
    return true
  }
}

function markSeen() {
  try {
    localStorage.setItem(ONBOARDING_SEEN_KEY, '1')
  } catch {
    // localStorage niedostępny (tryb prywatny) - onboarding pokaże się ponownie następnym razem,
    // nic nie psuje, tylko drobna powtórka.
  }
}

// Krótki, pomijalny onboarding przy pierwszym uruchomieniu - apka łączy mapę, AI i kilka
// narzędzi bezpieczeństwa naraz, więc nowy użytkownik bez żadnego wprowadzenia nie wie, gdzie
// czego szukać. Pokazywany raz (localStorage, nie sessionStorage jak AppSplash - to wprowadzenie
// do funkcji, nie animacja startu, nie ma sensu powtarzać go co sesję).
export function OnboardingOverlay() {
  const [visible, setVisible] = useState(() => !readSeen())
  const [step, setStep] = useState(0)

  function finish() {
    markSeen()
    setVisible(false)
  }

  if (!visible) return null

  const slide = SLIDES[step]
  const Icon = slide.icon
  const isLast = step === SLIDES.length - 1

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-background/98 backdrop-blur-sm">
      <div className="flex justify-end p-4">
        <Button variant="ghost" size="sm" onClick={finish}>
          Pomiń
        </Button>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col items-center gap-4"
          >
            <span className="flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Icon className="size-7" />
            </span>
            <h2 className="text-lg font-semibold tracking-tight">{slide.title}</h2>
            <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">{slide.description}</p>
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="flex flex-col items-center gap-4 p-6 pb-10">
        <div className="flex gap-1.5">
          {SLIDES.map((_, i) => (
            <span
              key={i}
              className={`size-1.5 rounded-full transition-colors ${i === step ? 'bg-primary' : 'bg-muted'}`}
            />
          ))}
        </div>
        <Button className="w-full max-w-xs" onClick={() => (isLast ? finish() : setStep((s) => s + 1))}>
          {isLast ? 'Zaczynajmy' : 'Dalej'}
        </Button>
      </div>
    </div>
  )
}
