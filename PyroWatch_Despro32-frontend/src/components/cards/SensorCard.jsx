import IconBadge from '../ui/IconBadge.jsx'

// Warna otomatis dari label kalau prop `tone` tidak diisi
function autoTone(label = '') {
  const l = label.toLowerCase()
  if (/suhu|temp/.test(l)) return 'orange'
  if (/lembab|lembap|humid/.test(l)) return 'blue'
  if (/ch[4₄]|metana|methane/.test(l)) return 'violet'
  if (/\bco\b|karbon/.test(l)) return 'slate'
  return 'green'
}

export default function SensorCard({ icon, label, value, unit, tone }) {
  return (
    <div className="bg-white rounded-3xl p-6 flex flex-col gap-4 shadow-sm border border-gray-100">
      <div className="flex items-center gap-3">
        <IconBadge icon={icon} tone={tone ?? autoTone(label)} />
        <span className="text-base font-medium text-gray-500">{label}</span>
      </div>
      <div className="flex items-end gap-1.5">
        <span className="text-5xl font-bold text-gray-900 tracking-tight leading-none">
          {value}
        </span>
        {unit && (
          <span className="text-lg font-medium text-gray-500 mb-1">{unit}</span>
        )}
      </div>
    </div>
  )
}