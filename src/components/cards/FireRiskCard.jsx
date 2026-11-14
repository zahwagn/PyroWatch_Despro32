import { Flame } from 'lucide-react'
import IconBadge from '../ui/IconBadge.jsx'

const risk = {
  Low: {
    bar: 'from-forest-400 to-forest-600',
    border: 'border-forest-400',
    pill: 'bg-forest-100 text-forest-700',
    label: 'Rendah',
  },
  Moderate: {
    bar: 'from-yellow-400 to-orange-400',
    border: 'border-yellow-400',
    pill: 'bg-yellow-100 text-yellow-700',
    label: 'Sedang',
  },
  High: {
    bar: 'from-orange-400 to-red-500',
    border: 'border-orange-400',
    pill: 'bg-orange-100 text-orange-700',
    label: 'Tinggi',
  },
  Extreme: {
    bar: 'from-red-500 to-red-700',
    border: 'border-red-500',
    pill: 'bg-red-100 text-red-700',
    label: 'Ekstrem',
  },
}

export default function FireRiskCard({ index = 0, riskLevel = 'Low' }) {
  const pct = Math.min(index * 100, 100)
  const r = risk[riskLevel] ?? risk.Low

  return (
    <div
      className={`bg-white rounded-3xl p-6 flex flex-col gap-4 shadow-sm border-2 col-span-2 ${r.border}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <IconBadge icon={Flame} tone="red" />
          <span className="text-base font-medium text-gray-500">Fire Risk Index</span>
        </div>
        <span className={`text-sm font-semibold px-3 py-1 rounded-full ${r.pill}`}>
          {r.label}
        </span>
      </div>

      <div className="flex items-end gap-2">
        <span className="text-6xl font-bold text-gray-900 tracking-tight leading-none">
          {index.toFixed(2)}
        </span>
        <span className="text-xl font-medium text-gray-500 mb-1">/ 1.00</span>
      </div>

      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full bg-gradient-to-r ${r.bar} rounded-full transition-all duration-700`}
          style={{ width: `${Math.max(pct, 2)}%` }}
        />
      </div>

      <div className="flex justify-between text-sm text-gray-500">
        <span>Rendah</span>
        <span>Sedang</span>
        <span>Tinggi</span>
        <span>Ekstrem</span>
      </div>
    </div>
  )
}