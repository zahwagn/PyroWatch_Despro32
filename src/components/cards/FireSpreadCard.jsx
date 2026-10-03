import { Flame } from 'lucide-react'
import IconBadge from '../ui/IconBadge.jsx'

export default function FireSpreadCard({
  spreadRate = 0,
  direction = 0,
  directionLabel = 'UNKNOWN',
}) {
  const pct = Math.min((spreadRate / 100) * 100, 100)
  const barColor =
    spreadRate < 10 ? 'bg-forest-500' : spreadRate < 50 ? 'bg-yellow-400' : 'bg-red-500'

  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <IconBadge icon={Flame} tone="red" />
        <span className="text-base font-medium text-gray-500">Laju Rambat Api</span>
      </div>

      <div className="flex items-end gap-1.5">
        <span className="text-5xl font-bold text-gray-900 tracking-tight leading-none">
          {spreadRate.toFixed(2)}
        </span>
        <span className="text-lg font-medium text-gray-500 mb-1">cm/jam</span>
      </div>

      <div className="flex items-center gap-2 text-base text-gray-500">
        <span>Arah penyebaran:</span>
        <span className="font-semibold text-gray-900">{directionLabel}</span>
        <span>({direction}°)</span>
      </div>

      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${barColor}`}
          style={{ width: `${Math.max(pct, 2)}%` }}
        />
      </div>
    </div>
  )
}