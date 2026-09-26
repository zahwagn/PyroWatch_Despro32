import { Flame } from 'lucide-react'

const riskBg = {
  Low: 'from-forest-400 to-forest-600',
  Moderate: 'from-yellow-400 to-orange-400',
  High: 'from-orange-400 to-red-500',
  Extreme: 'from-red-500 to-red-700',
}

export default function FireRiskCard({ index = 0, riskLevel = 'Low' }) {
  const pct = Math.min(index * 100, 100)
  const gradient = riskBg[riskLevel]

  return (
    <div className="bg-white rounded-3xl p-5 flex flex-col gap-3 shadow-sm border-2 border-forest-400 col-span-2">
      <div className="flex items-center gap-2 text-forest-400">
        <Flame size={16} strokeWidth={1.75} />
        <span className="text-sm font-medium text-forest-500">Fire Risk Index</span>
      </div>
      <div className="flex items-end gap-2">
        <span className="text-4xl font-semibold text-forest-900 tracking-tight leading-none">{index.toFixed(2)}</span>
        <span className="text-base text-forest-400 mb-0.5">/ 1.00</span>
      </div>
      <div className="h-1.5 bg-forest-50 rounded-full overflow-hidden">
        <div
          className={`h-full bg-gradient-to-r ${gradient} rounded-full transition-all duration-700`}
          style={{ width: `${Math.max(pct, 2)}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-forest-300">
      <span>Rendah</span>
      <span>Sedang</span>
      <span>Tinggi</span>
      <span>Ekstrem</span>
    </div>
    </div>
  )
}
