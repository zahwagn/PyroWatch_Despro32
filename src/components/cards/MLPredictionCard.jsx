import { BrainCircuit } from 'lucide-react'

const riskColors = {
  Low: 'text-forest-600 bg-forest-50',
  Moderate: 'text-yellow-700 bg-yellow-50',
  High: 'text-orange-700 bg-orange-50',
  Extreme: 'text-red-700 bg-red-50',
}

export default function MLPredictionCard({
  prediction = 'Unknown',
  confidence = 0,
}) {

  const color =
    riskColors[prediction] ??
    'text-forest-500 bg-forest-50'

  return (
    <div className="
      bg-white
      rounded-3xl
      p-5
      shadow-sm
      border
      border-forest-50
      flex
      flex-col
      gap-4
    ">

      <div className="flex items-center gap-2">

        <BrainCircuit
          size={16}
          strokeWidth={1.75}
          className="text-forest-400"
        />

        <span className="
          text-sm
          font-medium
          text-forest-500
        ">
          ML Prediction
        </span>

      </div>


      <div className="flex items-center justify-between">

        <span className={`
          px-4
          py-2
          rounded-2xl
          text-lg
          font-semibold
          ${color}
        `}>
          {prediction}
        </span>


        <div className="text-right">

          <p className="
            text-xs
            text-forest-400
          ">
            Confidence
          </p>

          <p className="
            text-3xl
            font-semibold
            text-forest-900
          ">
            {Number(confidence).toFixed(2)}%
          </p>

        </div>

      </div>

    </div>
  )
}