import { Sprout, Droplets } from 'lucide-react'
import IconBadge from '../ui/IconBadge.jsx'

function getTone(condition = '') {
  const value = String(condition).toLowerCase()
  if (value.includes('basah')) return 'blue'
  if (value.includes('lembap') || value.includes('lembab')) return 'green'
  if (value.includes('kering')) return 'orange'
  return 'slate'
}

export default function SoilConditionCard({
  condition = 'Tidak diketahui',
  moisture = null,
}) {
  const label = condition || 'Tidak diketahui'
  const tone = getTone(label)

  const pillTone = {
    blue: 'bg-blue-100 text-blue-700',
    green: 'bg-forest-100 text-forest-700',
    orange: 'bg-orange-100 text-orange-700',
    slate: 'bg-slate-100 text-slate-600',
  }[tone]

  return (
    <div className="bg-white rounded-3xl p-6 flex flex-col gap-4 shadow-sm border border-gray-100 min-w-0">
      <div className="flex items-center gap-3">
        <IconBadge icon={Sprout} tone={tone} />
        <span className="text-base font-medium text-gray-500">Kondisi Tanah</span>
      </div>

      <div className="flex flex-col items-start gap-3 min-w-0">
        <span className={`inline-flex max-w-full items-center rounded-full px-3 py-2 text-sm font-semibold ${pillTone}`}>
          {label}
        </span>

        {moisture !== null && Number.isFinite(Number(moisture)) && (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Droplets size={16} />
            <span>Kelembapan tanah:</span>
            <span className="font-semibold text-gray-800">
              {Number(moisture).toFixed(1)}%
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
