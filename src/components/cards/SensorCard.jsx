export default function SensorCard({ icon: Icon, label, value, unit }) {
  return (
    <div className="bg-white rounded-3xl p-5 flex flex-col gap-3 shadow-sm border border-forest-50">
      <div className="flex items-center gap-2 text-forest-400">
        {Icon && <Icon size={16} strokeWidth={1.75} />}
        <span className="text-sm font-medium text-forest-500">{label}</span>
      </div>
      <div className="flex items-end gap-1">
        <span className="text-4xl font-semibold text-forest-900 tracking-tight leading-none">{value}</span>
        {unit && <span className="text-base text-forest-400 mb-0.5">{unit}</span>}
      </div>
    </div>
  )
}
