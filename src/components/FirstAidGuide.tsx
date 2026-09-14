import { PhoneCallIcon } from 'lucide-react'
import { FIRST_AID_DISCLAIMER, FIRST_AID_STEPS } from '../data/firstAid'
import { Alert, AlertDescription } from './ui/alert'
import { Dialog, DialogContent, DialogTitle } from './ui/dialog'

export function FirstAidGuide({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-[calc(100%-2rem)] overflow-y-auto sm:max-w-md">
        <DialogTitle className="flex items-center gap-2">
          <PhoneCallIcon className="size-5 text-destructive" />
          Pierwsza pomoc przy podejrzeniu zatrucia
        </DialogTitle>

        <ol className="flex flex-col gap-3 text-sm">
          {FIRST_AID_STEPS.map((step, index) => (
            <li key={step.title} className="flex gap-2.5">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-destructive text-xs font-bold text-white">
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
          <AlertDescription className="text-current">{FIRST_AID_DISCLAIMER}</AlertDescription>
        </Alert>
      </DialogContent>
    </Dialog>
  )
}
