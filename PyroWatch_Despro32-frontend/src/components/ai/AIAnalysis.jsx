import { Bot, BarChart2, Flame, Lightbulb, AlertTriangle } from 'lucide-react'
import IconBadge from '../ui/IconBadge.jsx'

const riskPillColor = {
  Low:      'bg-forest-100 text-forest-700',
  Moderate: 'bg-yellow-100 text-yellow-700',
  High:     'bg-orange-100 text-orange-700',
  Extreme:  'bg-red-100 text-red-700',
}

const sections = [
  { key: 'analisisRisiko',     icon: BarChart2,     label: 'Analisis Risiko' },
  { key: 'estimasiPenyebaran', icon: Flame,         label: 'Estimasi Penyebaran' },
  { key: 'faktorPemicu',       icon: AlertTriangle, label: 'Faktor Pemicu' },
  { key: 'rekomendasi',        icon: Lightbulb,     label: 'Rekomendasi' },
]

export default function AIAnalysis({ data }) {
  if (!data) {
    return (
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center gap-3">
          <IconBadge icon={Bot} tone="blue" />
          <span className="text-lg font-semibold text-gray-900">AI Risk Analysis</span>
        </div>
        <p className="mt-4 text-base text-gray-500">Analisis AI belum tersedia.</p>
      </div>
    )
  }

  const riskLevel = data.tingkatKewaspadaan ?? 'Unknown'

  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <IconBadge icon={Bot} tone="blue" />
          <span className="text-lg font-semibold text-gray-900">AI Risk Analysis</span>
        </div>
        <span
          className={`text-sm font-semibold px-3 py-1 rounded-full ${
            riskPillColor[riskLevel] ?? 'bg-gray-100 text-gray-600'
          }`}
        >
          {riskLevel}
        </span>
      </div>

      <div className="flex flex-col gap-6">
        {sections.map(({ key, icon: Icon, label }) => (
          <div key={key} className="flex gap-3">
            <span className="w-10 shrink-0 flex justify-center mt-0.5">
              <Icon size={22} strokeWidth={1.75} className="text-forest-600" />
            </span>
            <div>
              <p className="text-base font-semibold text-gray-900 mb-1">{label}</p>
              <p className="text-base text-gray-600 leading-relaxed">{data[key] || '—'}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}