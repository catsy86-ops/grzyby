import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { motion } from 'motion/react'
import { db } from '../../db/db'
import { computeAchievements, type AchievementProgress } from '../../utils/achievements'
import { computeRank } from '../../utils/rank'
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '../../components/ui/drawer'
import { Progress } from '../../components/ui/progress'
import { useMediaQuery } from '../../hooks/useMediaQuery'

interface AchievementsDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const SEEN_ACHIEVEMENTS_KEY = 'lysy-achievements-seen'

function loadSeenIds(): Set<string> {
  try {
    const raw = localStorage.getItem(SEEN_ACHIEVEMENTS_KEY)
    return new Set(raw ? (JSON.parse(raw) as string[]) : [])
  } catch {
    return new Set()
  }
}

// Toast odblokowania odznaki jako własny, animowany JSX (nie sama treść tekstowa przez
// `toast.success`) - ikona "wystrzeliwuje" sprężyście, żeby moment odblokowania faktycznie czuł
// się jak nagroda, nie kolejny komunikat systemowy nieodróżnialny od reszty toastów w apce.
function showAchievementToast(achievement: AchievementProgress) {
  toast.custom(() => (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-popover px-4 py-3 text-popover-foreground shadow-[var(--shadow-card)]">
      <motion.span
        className="text-2xl"
        initial={{ scale: 0, rotate: -20 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 12 }}
        aria-hidden="true"
      >
        {achievement.icon}
      </motion.span>
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Nowe osiągnięcie</p>
        <p className="text-sm font-[550]">{achievement.title}</p>
      </div>
    </div>
  ))
}

// Gamifikacja Dziennika (patrz nowecos.md, "uśmiech" przeglądając apkę) - odznaki + ranga liczone
// z liczby/różnorodności/regularności wpisów, celowo BEZ dotykania danych o spożyciu/reakcjach
// (patrz komentarz w utils/achievements.ts). Toast o nowej odznace pojawia się niezależnie od
// tego, czy panel jest otwarty - efekt niżej nasłuchuje żywych danych zawsze, nie tylko przy
// otwartym Drawerze, tak samo jak np. useTickReminders czy long-trip notification w TripManager.
export function AchievementsDrawer({ open, onOpenChange }: AchievementsDrawerProps) {
  const isWidePanel = useMediaQuery('(min-width: 1024px)')
  const findings = useLiveQuery(() => db.findings.toArray(), [])
  const trips = useLiveQuery(() => db.trips.filter((t) => t.endedAt != null).toArray(), [])
  const photoCount = useLiveQuery(() => db.photos.count(), [])

  const achievements =
    findings && trips && photoCount != null ? computeAchievements({ findings, trips, photoCount }) : []
  const rank = findings ? computeRank(findings.length) : null

  // Ref (nie state) - to porównanie "co nowego się odblokowało" nie powinno samo w sobie
  // wywoływać ponownego renderu, tylko reagować na zmiany danych z useLiveQuery powyżej.
  const seenIdsRef = useRef<Set<string> | null>(null)

  useEffect(() => {
    if (achievements.length === 0) return
    if (seenIdsRef.current === null) {
      // Pierwsze uruchomienie efektu w tej sesji - zapamiętaj obecnie odblokowane bez pokazywania
      // toastów wstecz (użytkownik z 50 znaleziskami od dawna nie powinien dostać 3 toastów naraz).
      seenIdsRef.current = loadSeenIds()
      const alreadyUnlocked = achievements.filter((a) => a.unlocked).map((a) => a.id)
      for (const id of alreadyUnlocked) seenIdsRef.current.add(id)
      localStorage.setItem(SEEN_ACHIEVEMENTS_KEY, JSON.stringify([...seenIdsRef.current]))
      return
    }
    const newlyUnlocked = achievements.filter((a) => a.unlocked && !seenIdsRef.current!.has(a.id))
    if (newlyUnlocked.length === 0) return
    for (const achievement of newlyUnlocked) {
      seenIdsRef.current.add(achievement.id)
      showAchievementToast(achievement)
    }
    localStorage.setItem(SEEN_ACHIEVEMENTS_KEY, JSON.stringify([...seenIdsRef.current]))
  }, [achievements])

  return (
    <Drawer open={open} showSwipeHandle={!isWidePanel} swipeDirection={isWidePanel ? 'right' : 'down'} onOpenChange={onOpenChange}>
      <DrawerContent className={isWidePanel ? undefined : 'mx-auto max-w-md'}>
        <DrawerHeader>
          <DrawerTitle>Osiągnięcia</DrawerTitle>
          <DrawerDescription>Odznaki za wpisy w dzienniku - im więcej grzybobrania, tym więcej odznak.</DrawerDescription>
        </DrawerHeader>

        {rank && (
          <div className="mx-4 mb-3 flex flex-col gap-1.5 rounded-xl border border-border bg-muted/40 p-3">
            <div className="flex items-baseline justify-between">
              <p className="text-sm font-[550]">{rank.tier.label}</p>
              <p className="text-xs text-muted-foreground">
                {rank.nextTier
                  ? `jeszcze ${rank.findingsToNextTier} do "${rank.nextTier.label}"`
                  : 'najwyższa ranga'}
              </p>
            </div>
            {rank.nextTier && (
              <Progress
                value={
                  ((rank.findingsCount - rank.tier.minFindings) /
                    (rank.nextTier.minFindings - rank.tier.minFindings)) *
                  100
                }
              />
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 px-4 pb-4">
          {achievements.map((achievement) => (
            <div
              key={achievement.id}
              className={`flex flex-col items-center gap-1 rounded-xl border border-border p-3 text-center transition-opacity ${
                achievement.unlocked ? '' : 'opacity-40 grayscale'
              }`}
            >
              <span className="text-3xl" aria-hidden="true">
                {achievement.icon}
              </span>
              <p className="text-sm font-[550]">{achievement.title}</p>
              <p className="text-xs text-muted-foreground">{achievement.description}</p>
              {!achievement.unlocked && achievement.progress && achievement.progress.target > 1 && (
                <div className="mt-1 flex w-full flex-col gap-0.5">
                  <Progress
                    value={(achievement.progress.current / achievement.progress.target) * 100}
                    className="h-1.5"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    {achievement.progress.current}/{achievement.progress.target}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </DrawerContent>
    </Drawer>
  )
}
