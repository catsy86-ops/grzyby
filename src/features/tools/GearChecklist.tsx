import { useEffect, useState } from 'react'
import { CheckIcon } from 'lucide-react'
import { GEAR_CHECKLIST } from '../../data/gearChecklist'
import { Button } from '../../components/ui/button'
import { ToolDialog } from './ToolDialog'

const CHECKED_ITEMS_KEY = 'grzyby-gear-checklist-checked'

function readChecked(): Set<string> {
  try {
    const raw = localStorage.getItem(CHECKED_ITEMS_KEY)
    if (!raw) return new Set()
    return new Set(JSON.parse(raw) as string[])
  } catch {
    return new Set()
  }
}

// Interaktywna checklista sprzętu przed wyjściem - czysto lokalna (localStorage), bez zależności
// zewnętrznych. Stan zaznaczeń przetrwa zamknięcie apki (przygotowania do wyprawy mogą trwać
// dłużej niż jedna sesja), z przyciskiem "Wyczyść" na kolejne wyjście.
export function GearChecklist({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [checked, setChecked] = useState<Set<string>>(() => readChecked())

  useEffect(() => {
    try {
      localStorage.setItem(CHECKED_ITEMS_KEY, JSON.stringify([...checked]))
    } catch {
      // localStorage niedostępny/pełny - stan zostaje tylko w pamięci sesji
    }
  }, [checked])

  const totalItems = GEAR_CHECKLIST.reduce((sum, cat) => sum + cat.items.length, 0)
  const checkedCount = [...checked].filter((id) =>
    GEAR_CHECKLIST.some((cat) => cat.items.some((item) => item.id === id))
  ).length

  function toggle(id: string) {
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <ToolDialog
      open={open}
      onOpenChange={onOpenChange}
      icon={null}
      title="Checklista przed wyjściem"
      titleExtra={
        <span className="text-xs font-normal tabular-nums text-muted-foreground">
          {checkedCount}/{totalItems}
        </span>
      }
    >
      <div className="flex flex-col gap-4">
        {GEAR_CHECKLIST.map((cat) => (
          <div key={cat.category}>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {cat.category}
            </p>
            <ul className="flex flex-col gap-1">
              {cat.items.map((item) => {
                const isChecked = checked.has(item.id)
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={isChecked}
                      onClick={() => toggle(item.id)}
                      className="flex w-full items-center gap-2.5 rounded-md px-1.5 py-1.5 text-left text-sm outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50"
                    >
                      <span
                        className={`flex size-4.5 shrink-0 items-center justify-center rounded border ${
                          isChecked ? 'border-primary bg-primary text-primary-foreground' : 'border-border'
                        }`}
                      >
                        {isChecked && <CheckIcon className="size-3.5" />}
                      </span>
                      <span className={isChecked ? 'text-muted-foreground line-through' : ''}>{item.label}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>

      <Button variant="outline" size="sm" className="mt-1" onClick={() => setChecked(new Set())}>
        Wyczyść zaznaczenia
      </Button>
    </ToolDialog>
  )
}
