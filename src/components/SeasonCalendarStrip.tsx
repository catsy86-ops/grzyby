import { getSeasonMonths, seasonColorClassForMonth, MONTH_ABBR_PL } from '../utils/seasonFilter'

// Wizualny kalendarz sezonowy per gatunek (UI-QOL-ROADMAP.md, Część 3 pkt 7) - uzupełnienie
// tekstowego zakresu ("Czerwiec - Październik") już widocznego na karcie gatunku, nie jego
// zastąpienie. Kolor aktywnego miesiąca to ta sama meteorologiczna paleta co kropka sezonu na
// karcie (`getSeasonDotClass`), tylko liczona per-miesiąc zamiast raz dla całego zakresu.
export function SeasonCalendarStrip({ season, currentMonth = new Date().getMonth() }: { season: string; currentMonth?: number }) {
  const months = getSeasonMonths(season)
  if (!months.some(Boolean)) return null

  return (
    <div className="mt-2 flex gap-0.5" role="img" aria-label={`Kalendarz sezonu: ${season}`}>
      {MONTH_ABBR_PL.map((label, month) => {
        const active = months[month]
        const isCurrent = month === currentMonth
        return (
          <div
            key={label}
            title={label}
            className={`flex h-5 flex-1 items-center justify-center rounded-[3px] text-[8px] font-medium ${
              active ? `${seasonColorClassForMonth(month)} text-white` : 'bg-muted text-muted-foreground/60'
            } ${isCurrent ? 'ring-2 ring-foreground/40 ring-offset-1 ring-offset-background' : ''}`}
          >
            {label[0]}
          </div>
        )
      })}
    </div>
  )
}
