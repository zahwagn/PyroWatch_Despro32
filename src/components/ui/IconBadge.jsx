const tones = {
  red:    'bg-red-100 text-red-600',
  orange: 'bg-orange-100 text-orange-600',
  amber:  'bg-amber-100 text-amber-600',
  blue:   'bg-blue-100 text-blue-600',
  sky:    'bg-sky-100 text-sky-600',
  violet: 'bg-violet-100 text-violet-600',
  slate:  'bg-slate-200 text-slate-600',
  green:  'bg-forest-100 text-forest-600',
}

export default function IconBadge({ icon: Icon, tone = 'green', size = 20 }) {
  if (!Icon) return null
  return (
    <span
      className={`w-10 h-10 shrink-0 flex items-center justify-center rounded-full ${tones[tone] ?? tones.green}`}
    >
      <Icon size={size} strokeWidth={2} />
    </span>
  )
}