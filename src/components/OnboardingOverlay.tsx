import { useEffect, useState } from 'react'
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
//
// `forceReplayKey` - opcjonalne ponowne wywołanie z zewnątrz (przycisk "Pokaż wprowadzenie
// ponownie" w ToolsMenu, NAWIGACJA-AUDIT-ROADMAP.md Tier 1 pkt 6) - dotąd, po pierwszym
// `markSeen()`, treść onboardingu nie była nigdzie dostępna. Każda zmiana wartości (rosnący
// licznik) otwiera overlay od nowa, niezależnie od stanu `localStorage`.
export function OnboardingOverlay({ forceReplayKey }: { forceReplayKey?: number } = {}) {
  const [visible, setVisible] = useState(() => !readSeen())
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (forceReplayKey == null || forceReplayKey === 0) return
    setStep(0)
    setVisible(true)
  }, [forceReplayKey])

  function finish() {
    markSeen()
    setVisible(false)
  }

  function goBack() {
    setStep((s) => Math.max(0, s - 1))
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
            <button
              key={i}
              type="button"
              onClick={() => setStep(i)}
              aria-label={`Slajd ${i + 1} z ${SLIDES.length}`}
              aria-current={i === step ? 'step' : undefined}
              className="p-1 outline-none focus-visible:ring-2 focus-visible:ring-ring/50 rounded-full"
            >
              <span
                aria-hidden="true"
                className={`block size-1.5 rounded-full transition-colors ${i === step ? 'bg-primary' : 'bg-muted'}`}
              />
            </button>
          ))}
        </div>
        <div className="flex w-full max-w-xs gap-2">
          {step > 0 && (
            <Button variant="outline" className="flex-1" onClick={goBack}>
              Wstecz
            </Button>
          )}
          <Button className="flex-1" onClick={() => (isLast ? finish() : setStep((s) => s + 1))}>
            {isLast ? 'Zaczynajmy' : 'Dalej'}
          </Button>
        </div>
      </div>
    </div>
  )
}
