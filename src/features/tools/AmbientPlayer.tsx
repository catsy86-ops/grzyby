import { PauseIcon, PlayIcon, Volume1Icon, VolumeXIcon } from 'lucide-react'
import { useAmbientAudio } from '../../hooks/useAmbientAudio'

// Nie chunky 4-belkowy EQ jak w prawdziwym Winampie, ale ten sam duch - LCD-owa czerń/limonka i
// grube, kwadratowe przyciski, celowo NIEZALEŻNE od jasnego/ciemnego motywu apki (to gadżet ze
// swoim własnym "skinem", nie kolejny panel przejmujący tokeny motywu).
const EQ_BAR_DELAYS_MS = [0, 150, 75, 225]

export function AmbientPlayer() {
  const { isSupported, enabled, setEnabled, volume, setVolume } = useAmbientAudio()

  if (!isSupported) return null

  return (
    <div className="mx-4 mb-1 overflow-hidden rounded-lg border border-black/40 bg-black shadow-inner">
      <div className="flex items-center justify-between gap-2 bg-gradient-to-b from-neutral-700 to-neutral-900 px-2.5 py-1">
        <span className="font-mono text-[10px] font-medium tracking-widest text-lime-400">
          {enabled ? 'ODTWARZANIE ▸ LAS' : 'AMBIENT LEŚNY'}
        </span>
        <div className="flex h-3 items-end gap-0.5" aria-hidden="true">
          {EQ_BAR_DELAYS_MS.map((delay, i) => (
            <span
              key={i}
              className={`eq-bar w-0.5 rounded-[1px] bg-lime-400 ${enabled ? '' : 'opacity-30'}`}
              style={{ height: '100%', animationDelay: `${delay}ms`, animationPlayState: enabled ? 'running' : 'paused' }}
            />
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2.5 px-2.5 py-2">
        <button
          type="button"
          onClick={() => setEnabled(!enabled)}
          aria-label={enabled ? 'Wyłącz ambient leśny' : 'Włącz ambient leśny'}
          aria-pressed={enabled}
          className="flex size-7 shrink-0 items-center justify-center rounded-sm border border-lime-900 bg-neutral-800 text-lime-400 outline-none transition-[transform,background-color] hover:bg-neutral-700 focus-visible:ring-2 focus-visible:ring-lime-500 active:translate-y-px"
        >
          {enabled ? <PauseIcon className="size-3.5" /> : <PlayIcon className="size-3.5" />}
        </button>

        {volume <= 0.001 ? (
          <VolumeXIcon className="size-3.5 shrink-0 text-lime-600" aria-hidden="true" />
        ) : (
          <Volume1Icon className="size-3.5 shrink-0 text-lime-600" aria-hidden="true" />
        )}
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={volume}
          onChange={(e) => setVolume(Number(e.target.value))}
          aria-label="Głośność ambientu"
          className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-neutral-700 accent-lime-500"
        />
      </div>
    </div>
  )
}
