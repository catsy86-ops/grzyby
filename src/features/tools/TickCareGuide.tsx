import { BugOffIcon } from 'lucide-react'
import { TICK_CARE_DISCLAIMER, TICK_REMOVAL_STEPS } from '../../data/tickCare'
import { Alert, AlertDescription } from '../../components/ui/alert'
import { ToolDialog } from './ToolDialog'

export function TickCareGuide({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <ToolDialog open={open} onOpenChange={onOpenChange} icon={<BugOffIcon className="size-5" />} title="Ochrona przed kleszczami">
      <ol className="flex flex-col gap-3 text-sm">
        {TICK_REMOVAL_STEPS.map((step, index) => (
          <li key={step.title} className="flex gap-2.5">
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
              {index + 1}
            </span>
            <div>
              <p className="font-medium">{step.title}</p>
              <p className="text-xs text-muted-foreground">{step.description}</p>
            </div>
          </li>
        ))}
      </ol>

      <Alert variant="warning" className="mt-2">
        <AlertDescription className="text-current">{TICK_CARE_DISCLAIMER}</AlertDescription>
      </Alert>
    </ToolDialog>
  )
}
