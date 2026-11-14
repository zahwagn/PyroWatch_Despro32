import { Wind } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { mockWindHistory } from '../../lib/mockData.js'
import IconBadge from '../ui/IconBadge.jsx'

export default function WindCard({
  speed = 0,
  direction = 0,
  directionLabel = 'UNKNOWN',
}) {
  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 col-span-2 flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <IconBadge icon={Wind} tone="sky" />
        <span className="text-base font-medium text-gray-500">Angin</span>
      </div>

      <div className="flex items-start gap-6">
        {/* Compass */}
        <div className="flex flex-col items-center gap-2 shrink-0">
          <div className="relative w-24 h-24 rounded-full border-2 border-sky-100 flex items-center justify-center bg-sky-50">
            <span className="absolute top-1.5 text-xs text-gray-500 font-semibold">U</span>
            <span className="absolute bottom-1.5 text-xs text-gray-500 font-semibold">S</span>
            <span className="absolute left-2 text-xs text-gray-500 font-semibold">B</span>
            <span className="absolute right-2 text-xs text-gray-500 font-semibold">T</span>
            <div
              className="absolute w-0.5 h-8 bg-sky-500 rounded-full transition-transform duration-700"
              style={{
                transform: `rotate(${direction}deg)`,
                transformOrigin: 'bottom center',
                bottom: '50%',
                left: 'calc(50% - 1px)',
              }}
            >
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[4px] border-r-[4px] border-b-[6px] border-l-transparent border-r-transparent border-b-sky-500" />
            </div>
          </div>
          <span className="text-sm text-gray-500">
            {direction}° {directionLabel}
          </span>
        </div>

        {/* Speed + chart */}
        <div className="flex-1 min-w-0">
          <div className="flex items-end gap-1.5 mb-3">
            <span className="text-5xl font-bold text-gray-900 tracking-tight leading-none">
              {speed.toFixed(1)}
            </span>
            <span className="text-lg font-medium text-gray-500 mb-1">m/s</span>
          </div>
          <ResponsiveContainer width="100%" height={70}>
            <AreaChart data={mockWindHistory} margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
              <defs>
                <linearGradient id="windGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="time" tick={{ fontSize: 11, fill: '#6b7280' }} />
              <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 10, border: 'none', background: '#f0f9ff' }}
                formatter={(v) => [`${v} m/s`, 'Kecepatan']}
              />
              <Area
                type="monotone"
                dataKey="speed"
                stroke="#0ea5e9"
                fill="url(#windGrad)"
                strokeWidth={2.5}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}