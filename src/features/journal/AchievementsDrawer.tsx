import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { db } from '../../db/db'
import { computeAchievements } from '../../utils/achievements'
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '../../components/ui/drawer'
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

// Prosta gamifikacja Dziennika (patrz nowecos.md, "uśmiech" przeglądając apkę) - kilka odznak
// liczonych z liczby/różnorodności wpisów, celowo BEZ dotykania danych o spożyciu/reakcjach
// (patrz komentarz w utils/achievements.ts). Toast o nowej odznace pojawia się niezależnie od
// tego, czy panel jest otwarty - efekt niżej nasłuchuje żywych danych zawsze, nie tylko przy
// otwartym Drawerze, tak samo jak np. useTickReminders czy long-trip notification w TripManager.
export function AchievementsDrawer({ open, onOpenChange }: AchievementsDrawerProps) {
  const isWidePanel = useMediaQuery('(min-width: 1024px)')
  const findings = useLiveQuery(() => db.findings.toArray(), [])
  const completedTripsCount = useLiveQuery(
    () => db.trips.filter((t) => t.endedAt != null).count(),
    [],
  )
  const photoCount = useLiveQuery(() => db.photos.count(), [])

  const achievements =
    findings && completedTripsCount != null && photoCount != null
      ? computeAchievements({ findings, completedTripsCount, photoCount })
      : []

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
      toast.success(`${achievement.icon} Nowe osiągnięcie: ${achievement.title}`)
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
            </div>
          ))}
        </div>
      </DrawerContent>
    </Drawer>
  )
}
