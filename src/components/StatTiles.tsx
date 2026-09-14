import type { ReactNode } from 'react'

// Rząd małych "kafli" (duża liczba + etykieta pod spodem) zamiast jednego zdania rozdzielanego
// kropkami ("12 znalezisk · 5 gatunków · 2.3 kg") - ten sam wzorzec co wskaźniki na mapie
// (zachód słońca, prognoza), tylko dla podsumowań wyprawy w Dzienniku. Liczby czyta się od razu,
// zdanie trzeba przeczytać w całości, żeby wyłowić z niego cyfry.
export function StatTile({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="flex flex-1 flex-col items-center rounded-lg bg-background/70 py-1.5">
      <span className="text-base font-bold tabular-nums leading-tight">{value}</span>
      <span className="text-[11px] leading-tight text-muted-foreground">{label}</span>
    </div>
  )
}

export function StatTileRow({ children }: { children: ReactNode }) {
  return <div className="flex gap-2">{children}</div>
}
