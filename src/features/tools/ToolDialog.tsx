import type { ReactNode } from 'react'
import { Dialog, DialogContent, DialogTitle } from '../../components/ui/dialog'

interface ToolDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  icon: ReactNode
  title: string
  titleExtra?: ReactNode
  children: ReactNode
}

// Wspólny szkielet 4 narzędzi z menu "Narzędzia" (pierwsza pomoc, kleszcze, checklista sprzętu,
// timer) - dotąd każde z osobna powielało identyczny `Dialog`+`DialogContent`+`DialogTitle` z
// ikoną (Faza audytu kodu). Treść każdego narzędzia zostaje jego własna - to tylko rama.
export function ToolDialog({ open, onOpenChange, icon, title, titleExtra, children }: ToolDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-[calc(100%-2rem)] overflow-y-auto sm:max-w-md">
        <DialogTitle className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            {icon}
            {title}
          </span>
          {titleExtra}
        </DialogTitle>
        {children}
      </DialogContent>
    </Dialog>
  )
}
