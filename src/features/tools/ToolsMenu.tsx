import { BackpackIcon, BatteryIcon, BugOffIcon, CheckIcon, HardDriveIcon, HeartPulseIcon, PhoneCallIcon, SparklesIcon, TimerIcon, TreePineIcon } from 'lucide-react'
import { motion } from 'motion/react'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '../../components/ui/drawer'
import { useBatteryStatus } from '../../hooks/useBatteryStatus'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import { useAppStore, type PowerSaveMode } from '../../stores/appStore'
import { isPowerSaveActive, POWER_SAVE_MODE_LABELS } from '../../utils/powerSave'
import { AmbientPlayer } from './AmbientPlayer'

const LIST_VARIANTS = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.04, delayChildren: 0.05 } },
}

const ITEM_VARIANTS = {
  hidden: { opacity: 0, x: -8 },
  visible: { opacity: 1, x: 0 },
}

export type ToolKey =
  | 'first-aid'
  | 'gear-checklist'
  | 'tick-care'
  | 'cooking-timer'
  | 'storage-info'
  | 'emergency-card'
  | 'show-onboarding'

// Krótki tytuł + osobny podtytuł (zamiast jednego długiego zdania jako etykiety) czyta się
// szybciej przy skanowaniu menu wzrokiem. `badge` grupuje narzędzia wizualnie wg charakteru
// (bezpieczeństwo/przygotowanie/aplikacja) - inny kontekst niż EdibilityBadge (menu narzędzi
// nigdy nie wyświetla się obok kart gatunków), więc ponowne użycie destructive/brand-accent/
// primary tutaj nie koliduje z ustaloną skalą jadalności.
type SectionLabel = 'Bezpieczeństwo w terenie' | 'Przygotowanie' | 'Aplikacja'

const TOOLS: {
  key: ToolKey
  title: string
  subtitle: string
  icon: typeof PhoneCallIcon
  badge: 'destructive' | 'accent' | 'primary' | 'neutral'
  section: SectionLabel
}[] = [
  { key: 'first-aid', title: 'Pierwsza pomoc', subtitle: 'Przy podejrzeniu zatrucia', icon: PhoneCallIcon, badge: 'destructive', section: 'Bezpieczeństwo w terenie' },
  { key: 'tick-care', title: 'Kleszcze', subtitle: 'Ochrona i bezpieczne usuwanie', icon: BugOffIcon, badge: 'destructive', section: 'Bezpieczeństwo w terenie' },
  { key: 'emergency-card', title: 'Karta awaryjna', subtitle: 'Dane medyczne i kontakt', icon: HeartPulseIcon, badge: 'destructive', section: 'Bezpieczeństwo w terenie' },
  { key: 'gear-checklist', title: 'Checklista sprzętu', subtitle: 'Przed wyjściem w teren', icon: BackpackIcon, badge: 'primary', section: 'Przygotowanie' },
  { key: 'cooking-timer', title: 'Timer kuchenny', subtitle: 'Blanszowanie, gotowanie', icon: TimerIcon, badge: 'accent', section: 'Przygotowanie' },
  { key: 'storage-info', title: 'Pamięć i dane', subtitle: 'Miejsce zajęte przez apkę', icon: HardDriveIcon, badge: 'neutral', section: 'Aplikacja' },
  { key: 'show-onboarding', title: 'Pokaż wprowadzenie ponownie', subtitle: 'Krótkie przypomnienie funkcji apki', icon: SparklesIcon, badge: 'neutral', section: 'Aplikacja' },
]

const BADGE_CLASS: Record<(typeof TOOLS)[number]['badge'], string> = {
  destructive: 'bg-destructive/10 text-destructive',
  accent: 'bg-brand-accent/10 text-brand-accent',
  primary: 'bg-primary/10 text-primary',
  neutral: 'bg-muted text-muted-foreground',
}

// Wyprowadzone z TOOLS (pole `section`), nie osobna, ręcznie synchronizowana lista - dodanie
// narzędzia do TOOLS automatycznie umieszcza je we właściwej sekcji, bez ryzyka rozjazdu kluczy.
const SECTIONS: { label: SectionLabel; tools: ToolKey[] }[] = (
  ['Bezpieczeństwo w terenie', 'Przygotowanie', 'Aplikacja'] as SectionLabel[]
).map((label) => ({
  label,
  tools: TOOLS.filter((t) => t.section === label).map((t) => t.key),
}))

// Nagłówek apki puchnie z każdą kolejną funkcją pomocniczą - zamiast dokładać kolejną ikonę obok
// tytułu, wszystkie narzędzia (pierwsza pomoc, checklista, kleszcze, timer, pamięć) są teraz
// dostępne z jednej szuflady, otwieranej pojedynczą ikoną "Narzędzia".
export function ToolsMenu({
  open,
  onOpenChange,
  onSelect,
  forestMode,
  onToggleForestMode,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (tool: ToolKey) => void
  forestMode: boolean
  onToggleForestMode: () => void
}) {
  // Ten sam wzorzec i próg co w SpotManager.tsx/StorageInfoDrawer.tsx - na szerokim ekranie (lg:+)
  // menu wysuwa się z prawej (bliżej przycisku "Narzędzia" w prawym rogu nagłówka) zamiast z dołu.
  const isWidePanel = useMediaQuery('(min-width: 1024px)')
  const powerSaveMode = useAppStore((s) => s.powerSaveMode)
  const setPowerSaveMode = useAppStore((s) => s.setPowerSaveMode)
  const batteryStatus = useBatteryStatus()
  const powerSaveActive = isPowerSaveActive(powerSaveMode, batteryStatus)

  return (
    <Drawer open={open} swipeDirection={isWidePanel ? 'right' : 'down'} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Narzędzia</DrawerTitle>
        </DrawerHeader>
        <AmbientPlayer />
        <div className="flex flex-col gap-1 px-4 pb-2">
          <button
            type="button"
            role="switch"
            aria-checked={forestMode}
            onClick={onToggleForestMode}
            className={`flex items-center gap-3 rounded-lg px-2 py-2.5 text-left text-sm outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50 ${forestMode ? 'bg-primary/5' : ''}`}
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <TreePineIcon className="size-4.5" />
            </span>
            <span className="flex-1">
              <span className="block font-medium">Tryb "W lesie"</span>
              <span className="block text-xs text-muted-foreground">Większe przyciski, wyższy kontrast</span>
            </span>
            {forestMode && <CheckIcon className="size-4 shrink-0 text-primary" />}
          </button>
        </div>
        <div className="mx-4 my-1 border-t border-border" />
        <div className="flex flex-col gap-0.5 px-4 pb-2" role="radiogroup" aria-label="Oszczędzanie baterii">
          <p className="px-2 pb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Oszczędzanie baterii {powerSaveActive && '(aktywne)'}
          </p>
          {(Object.keys(POWER_SAVE_MODE_LABELS) as PowerSaveMode[]).map((mode) => {
            const isSelected = powerSaveMode === mode
            return (
              <button
                key={mode}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => setPowerSaveMode(mode)}
                className={`flex items-center gap-3 rounded-lg px-2 py-2.5 text-left text-sm outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50 ${isSelected ? 'bg-primary/5' : ''}`}
              >
                <span
                  className={`flex size-9 shrink-0 items-center justify-center rounded-full transition-colors ${isSelected ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}
                >
                  <BatteryIcon className="size-4.5" />
                </span>
                <span className="flex-1 font-medium">{POWER_SAVE_MODE_LABELS[mode]}</span>
                {isSelected && <CheckIcon className="size-4 shrink-0 text-primary" />}
              </button>
            )
          })}
        </div>
        <div className="mx-4 my-1 border-t border-border" />
        <motion.div
          className="flex flex-col gap-3 overflow-y-auto px-4 pb-6"
          variants={LIST_VARIANTS}
          initial="hidden"
          animate={open ? 'visible' : 'hidden'}
        >
          {SECTIONS.map((section) => (
            <div key={section.label} className="flex flex-col gap-0.5">
              <p className="px-2 pb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {section.label}
              </p>
              {section.tools.map((toolKey) => {
                const tool = TOOLS.find((t) => t.key === toolKey)!
                const Icon = tool.icon
                return (
                  <motion.button
                    key={tool.key}
                    type="button"
                    variants={ITEM_VARIANTS}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onSelect(tool.key)}
                    className="flex items-center gap-3 rounded-lg px-2 py-2.5 text-left outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50"
                  >
                    <span className={`flex size-9 shrink-0 items-center justify-center rounded-full ${BADGE_CLASS[tool.badge]}`}>
                      <Icon className="size-4.5" />
                    </span>
                    <span>
                      <span className="block text-sm font-medium">{tool.title}</span>
                      <span className="block text-xs text-muted-foreground">{tool.subtitle}</span>
                    </span>
                  </motion.button>
                )
              })}
            </div>
          ))}
        </motion.div>
      </DrawerContent>
    </Drawer>
  )
}
