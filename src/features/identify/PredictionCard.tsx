import type { Prediction } from '../../utils/mushroomModel'
import { EdibilityBadge } from '../../components/EdibilityBadge'

export function PredictionCard({ prediction, rank }: { prediction: Prediction; rank: number }) {
  const { species, confidence, labelRaw } = prediction
  const confidencePct = Math.round(confidence * 100)

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
