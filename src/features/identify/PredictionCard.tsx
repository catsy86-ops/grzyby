import type { Prediction } from '../../utils/mushroomModel'
import { EdibilityBadge } from '../../components/EdibilityBadge'

const LOW_CONFIDENCE_THRESHOLD = 0.4

export function PredictionCard({ prediction, rank }: { prediction: Prediction; rank: number }) {
  const { species, confidence, labelRaw } = prediction
  const confidencePct = Math.round(confidence * 100)
  const isLowConfidence = confidence < LOW_CONFIDENCE_THRESHOLD

  if (isLowConfidence) {
    return (
      <div className="rounded border border-gray-200 bg-gray-50 p-3 opacity-70">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            #{rank} {species?.nameCommon ?? labelRaw} — zbyt niska pewność
          </p>
          <span className="text-sm text-gray-500">{confidencePct}%</span>
        </div>
        <p className="mt-1 text-xs text-gray-500">
          Model nie jest wystarczająco pewny tego dopasowania. Traktuj to jako zgadywankę, nie
          identyfikację.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded border border-gray-200 p-3 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="font-medium">
          #{rank} {species?.nameCommon ?? labelRaw}
        </p>
        <span className="text-sm text-gray-500">{confidencePct}%</span>
      </div>
      {species && (
        <>
          <p className="text-sm italic text-gray-500">{species.nameLatin}</p>
          <div className="mt-2">
            <EdibilityBadge edibility={species.edibility} />
          </div>
          <p className="mt-2 text-sm text-gray-700">{species.description}</p>
        </>
      )}
    </div>
  )
}
