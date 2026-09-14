// Ilustracje pustych stanów/dropzone w tym samym, płaskim języku co Logo.tsx (proste bryły,
// tokeny motywu, bursztynowy akcent tylko na kapeluszu grzyba) - zastępują gołe ikony lucide,
// żeby puste stany i strefa wgrywania zdjęcia nie wyglądały jak w dowolnej generycznej apce CRUD.

// Pusty koszyk - Dziennik bez znalezisk dla wybranego filtru.
export function EmptyBasketIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <path
        d="M14 28h36l-4.5 22a4 4 0 0 1-3.9 3.2H22.4a4 4 0 0 1-3.9-3.2L14 28Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path d="M20 28c0-8 5.4-14 12-14s12 6 12 14" fill="none" stroke="currentColor" strokeWidth="2.5" />
      <path d="M18 28h28" stroke="currentColor" strokeWidth="2.5" />
      <path
        d="M27 33c-3 0-5.5 2.5-5.5 5.5S24 44 27 44s5.5-2.5 5.5-5.5"
        fill="var(--color-amber-700)"
        opacity="0.85"
      />
      <circle cx="24.5" cy="37" r="0.9" fill="var(--color-amber-200)" opacity="0.85" />
      <circle cx="28.5" cy="35.5" r="0.7" fill="var(--color-amber-200)" opacity="0.85" />
    </svg>
  )
}

// Lupa nad gasnącym grzybem - Baza wiedzy bez trafień dla wyszukiwania/filtrów.
export function EmptySearchIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <path
        d="M26 20c-5 0-9 4-9 8.5s4 8.5 9 8.5c1.5 0 2.9-.4 4.1-1l-.2 6a1.5 1.5 0 0 0 1.5 1.6 1.5 1.5 0 0 0 1.5-1.3l.6-7.5A8.4 8.4 0 0 0 35 28.5c0-4.5-4-8.5-9-8.5Z"
        fill="var(--color-amber-700)"
        opacity="0.85"
      />
      <circle cx="23" cy="26" r="0.9" fill="var(--color-amber-200)" opacity="0.8" />
      <circle cx="28.5" cy="25" r="0.7" fill="var(--color-amber-200)" opacity="0.8" />
      <circle cx="36" cy="36" r="12" fill="none" stroke="currentColor" strokeWidth="2.5" />
      <path d="M44.7 44.7 52 52" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

// Aparat z sylwetką grzyba w kadrze - strefa wgrywania zdjęcia w "Rozpoznaj".
export function CameraMushroomIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <path
        d="M10 22a4 4 0 0 1 4-4h6l3-4h18l3 4h6a4 4 0 0 1 4 4v24a4 4 0 0 1-4 4H14a4 4 0 0 1-4-4V22Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <circle cx="32" cy="34" r="11" fill="none" stroke="currentColor" strokeWidth="2.5" />
      <path
        d="M25 33c0-3.9 3.1-7 7-7s7 3.1 7 7c0 .6-.3.9-.9.9H25.9c-.6 0-.9-.3-.9-.9Z"
        fill="var(--color-amber-700)"
      />
      <path
        d="M27.8 34.5h8.4l-.5 5.1a1.1 1.1 0 0 1-1.1 1 1.1 1.1 0 0 1-1.1-1l-.2-2.4-.2 2.4a1.1 1.1 0 0 1-1.1 1 1.1 1.1 0 0 1-1.1-1l-.5-5.1Z"
        fill="var(--color-amber-50)"
      />
    </svg>
  )
}
