import { BrainCircuit } from 'lucide-react'
import IconBadge from '../ui/IconBadge.jsx'

const riskColors = {
  Low: 'text-forest-700 bg-forest-100',
  Moderate: 'text-yellow-700 bg-yellow-100',
  High: 'text-orange-700 bg-orange-100',
  Extreme: 'text-red-700 bg-red-100',
}

export default function MLPredictionCard({ prediction = 'Unknown', confidence = 0 }) {
  const color = riskColors[prediction] ?? 'text-gray-600 bg-gray-100'

  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <IconBadge icon={BrainCircuit} tone="violet" />
        <span className="text-base font-medium text-gray-500">ML Prediction</span>
      </div>

      <div className="flex items-center justify-between">
        <span className={`px-5 py-2.5 rounded-2xl text-xl font-bold ${color}`}>
          {prediction}
        </span>

        <div className="text-right">
          <p className="text-sm text-gray-500">Confidence</p>
          <p className="text-4xl font-bold text-gray-900 tracking-tight">
            {Number(confidence).toFixed(2)}%
          </p>
        </div>
      </div>
    </div>
  )
}