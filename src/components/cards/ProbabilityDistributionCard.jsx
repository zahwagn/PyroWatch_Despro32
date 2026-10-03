import { BarChart3 } from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts'
import IconBadge from '../ui/IconBadge.jsx'

const levels = [
  { name: 'Low', color: '#40916c' },
  { name: 'Moderate', color: '#facc15' },
  { name: 'High', color: '#fb923c' },
  { name: 'Extreme', color: '#ef4444' },
]

export default function ProbabilityDistributionCard({ probabilities = {} }) {
  const data = levels.map(({ name, color }) => ({
    name,
    color,
    probability: Number(probabilities[name] ?? 0),
  }))

  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-center gap-3 mb-4">
        <IconBadge icon={BarChart3} tone="green" />
        <span className="text-base font-medium text-gray-500">Probability Distribution</span>
      </div>

      <ResponsiveContainer width="100%" height={170}>
        <BarChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
          <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6b7280' }} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: '#6b7280' }} />
          <Tooltip
            formatter={(value) => [`${Number(value).toFixed(2)}%`, 'Probability']}
          />
          <Bar dataKey="probability" radius={[8, 8, 0, 0]}>
            {data.map((d) => (
              <Cell key={d.name} fill={d.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}