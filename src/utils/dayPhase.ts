export type DayPhase = 'swit' | 'dzien' | 'zmierzch' | 'noc'

export function getDayPhase(hour: number): DayPhase {
  if (hour >= 5 && hour < 8) return 'swit'
  if (hour >= 8 && hour < 18) return 'dzien'
  if (hour >= 18 && hour < 21) return 'zmierzch'
  return 'noc'
}
