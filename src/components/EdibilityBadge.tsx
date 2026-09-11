import type { EdibilityStatus } from '../db/schema'

const STYLES: Record<EdibilityStatus, { label: string; className: string }> = {
  jadalny: { label: 'Jadalny', className: 'bg-green-100 text-green-800' },
  'warunkowo-jadalny': { label: 'Warunkowo jadalny', className: 'bg-yellow-100 text-yellow-800' },
  niejadalny: { label: 'Niejadalny', className: 'bg-gray-200 text-gray-800' },
  trujący: { label: 'Trujący', className: 'bg-orange-200 text-orange-900' },
  'śmiertelnie-trujący': { label: 'Śmiertelnie trujący', className: 'bg-red-600 text-white' },
}

export function EdibilityBadge({ edibility }: { edibility: EdibilityStatus }) {
  const style = STYLES[edibility]
  return (
    <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${style.className}`}>
      {style.label}
    </span>
  )
}
