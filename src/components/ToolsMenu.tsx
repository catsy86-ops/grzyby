import { BackpackIcon, BugOffIcon, CheckIcon, HardDriveIcon, PhoneCallIcon, TimerIcon, TreePineIcon } from 'lucide-react'
import { motion } from 'motion/react'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from './ui/drawer'

const LIST_VARIANTS = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.04, delayChildren: 0.05 } },
}

const ITEM_VARIANTS = {
  hidden: { opacity: 0, x: -8 },
  visible: { opacity: 1, x: 0 },
}

export type ToolKey = 'first-aid' | 'gear-checklist' | 'tick-care' | 'cooking-timer' | 'storage-info'

const TOOLS: { key: ToolKey; label: string; icon: typeof PhoneCallIcon }[] = [
  { key: 'first-aid', label: 'Pierwsza pomoc przy podejrzeniu zatrucia', icon: PhoneCallIcon },
  { key: 'gear-checklist', label: 'Checklista sprzętu przed wyjściem', icon: BackpackIcon },
  { key: 'tick-care', label: 'Ochrona przed kleszczami', icon: BugOffIcon },
  { key: 'cooking-timer', label: 'Timer kuchenny', icon: TimerIcon },
  { key: 'storage-info', label: 'Pamięć i dane', icon: HardDriveIcon },
]

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
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Narzędzia</DrawerTitle>
        </DrawerHeader>
        <div className="flex flex-col gap-1 px-4 pb-2">
          <button
            type="button"
            role="switch"
            aria-checked={forestMode}
            onClick={onToggleForestMode}
            className="flex items-center gap-3 rounded-md px-2 py-2.5 text-left text-sm outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <TreePineIcon className="size-4.5 shrink-0 text-muted-foreground" />
            <span className="flex-1">Tryb "W lesie" (większe przyciski, wyższy kontrast)</span>
            {forestMode && <CheckIcon className="size-4 shrink-0 text-primary" />}
          </button>
        </div>
        <div className="mx-4 my-1 border-t border-border" />
        <motion.div
          key={open ? 'open' : 'closed'}
          className="flex flex-col gap-1 px-4 pb-6"
          variants={LIST_VARIANTS}
          initial="hidden"
          animate={open ? 'visible' : 'hidden'}
        >
          {TOOLS.map(({ key, label, icon: Icon }) => (
            <motion.button
              key={key}
              type="button"
              variants={ITEM_VARIANTS}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelect(key)}
              className="flex items-center gap-3 rounded-md px-2 py-2.5 text-left text-sm outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              <Icon className="size-4.5 shrink-0 text-muted-foreground" />
              {label}
            </motion.button>
          ))}
        </motion.div>
      </DrawerContent>
    </Drawer>
  )
}
