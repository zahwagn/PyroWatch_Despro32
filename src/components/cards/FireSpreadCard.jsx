import { Flame } from 'lucide-react'

export default function FireSpreadCard({
  spreadRate = 0,
  direction = 0,
  directionLabel = 'UNKNOWN',
}) {
  const pct = Math.min((spreadRate / 100) * 100, 100)
  const color = spreadRate < 10
    ? 'text-forest-600'
    : spreadRate < 50
    ? 'text-yellow-600'
    : 'text-red-600'
  const barColor = spreadRate < 10
    ? 'bg-forest-400'
    : spreadRate < 50
    ? 'bg-yellow-400'
    : 'bg-red-400'

  return (
    <div className="bg-white rounded-3xl p-5 shadow-sm border border-forest-50 flex flex-col gap-3">
      <div className="flex items-center gap-2 text-forest-400">
        <Flame size={16} strokeWidth={1.75} />
        <span className="text-sm font-medium text-forest-500">Laju Rambat Api</span>
      </div>
      <div className="flex items-end gap-1">
        <span className={`text-4xl font-semibold tracking-tight leading-none ${color}`}>
          {spreadRate.toFixed(2)}
        </span>
        <span className="text-base text-forest-400 mb-0.5">cm/jam</span>
      </div>
      <div className="flex items-center gap-2 text-sm text-forest-400">
        <span>Arah penyebaran:</span>
        <span className="font-semibold text-forest-700">{directionLabel}</span>
        <span>({direction}°)</span>
      </div>
      <div className="h-1.5 bg-forest-50 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${barColor}`}
          style={{ width: `${Math.max(pct, 2)}%` }}
        />
      </div>
    </div>
  )
}
