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

        {/* Tekst kroków pierwszej pomocy celowo WIĘKSZY i wyższego kontrastu niż typowy opis
            pomocniczy (text-sm zamiast text-xs, text-foreground/85 zamiast text-muted-foreground,
            leading-relaxed) - to instrukcja czytana w stresie, czasem w słabym świetle lasu, nie
            drobny podpis. Czytelność tu jest funkcją bezpieczeństwa, nie tylko estetyki. */}
        <ol className="flex flex-col gap-4 text-base">
          {FIRST_AID_STEPS.map((step, index) => (
            <li key={step.title} className="flex gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-destructive text-sm font-bold text-white">
                {index + 1}
              </span>
              <div>
                <p className="font-medium">{step.title}</p>
                <p className="text-sm leading-relaxed text-foreground/85">{step.description}</p>
              </div>
            </li>
          ))}
        </ol>

        <Alert variant="warning" className="mt-2">
          <AlertDescription className="text-current leading-relaxed">{FIRST_AID_DISCLAIMER}</AlertDescription>
        </Alert>
      </DialogContent>
    </Dialog>
  )
}
