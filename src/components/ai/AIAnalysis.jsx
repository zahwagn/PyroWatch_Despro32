import { Bot, BarChart2, Flame, Lightbulb, AlertTriangle } from 'lucide-react'

const riskPillColor = {
  Low:      'bg-forest-100 text-forest-700',
  Moderate: 'bg-yellow-100 text-yellow-700',
  High:     'bg-orange-100 text-orange-700',
  Extreme:  'bg-red-100 text-red-700',
}

const sections = [
  { key: 'analisisRisiko',     icon: BarChart2,  label: 'Analisis Risiko',      iconColor: 'text-forest-400' },
  { key: 'estimasiPenyebaran', icon: Flame,       label: 'Estimasi Penyebaran',  iconColor: 'text-orange-400' },
  { key: 'faktorPemicu',       icon: AlertTriangle, label: 'Faktor Pemicu',      iconColor: 'text-yellow-500'  },
  { key: 'rekomendasi',        icon: Lightbulb,   label: 'Rekomendasi',          iconColor: 'text-blue-400'   },
]

export default function AIAnalysis({ data }) {
  if (!data) {
    return (
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-forest-50">
        <div className="flex items-center gap-2">
          <Bot size={17} strokeWidth={1.75} className="text-forest-400" />
          <span className="text-base font-semibold text-forest-800">AI Risk Analysis</span>
        </div>
        <p className="mt-4 text-sm text-forest-400">Analisis AI belum tersedia.</p>
      </div>
    )
  }

  const riskLevel = data.tingkatKewaspadaan ?? 'Unknown'

  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-forest-50">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Bot size={17} strokeWidth={1.75} className="text-forest-400" />
          <span className="text-base font-semibold text-forest-800">AI Risk Analysis</span>
        </div>
        <span className={`text-sm font-medium px-3 py-1 rounded-full ${riskPillColor[riskLevel] ?? 'bg-forest-50 text-forest-500'}`}>
          {riskLevel}
        </span>
      </div>

      <div className="flex flex-col gap-5">
        {sections.map(({ key, icon: Icon, label, iconColor }) => (
          <div key={key} className="flex gap-3">
            <div className={`mt-0.5 shrink-0 ${iconColor}`}>
              <Icon size={16} strokeWidth={1.75} />
            </div>
            <div>
              <p className="text-sm font-semibold text-forest-800 mb-1">{label}</p>
              <p className="text-sm text-forest-500 leading-relaxed">{data[key] || '—'}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
