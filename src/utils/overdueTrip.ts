export function isTripOverdue(plannedReturnAt: number | null | undefined, now: number): boolean {
  if (plannedReturnAt == null) return false
  return now >= plannedReturnAt
}
