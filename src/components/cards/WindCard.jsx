import { Wind } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { mockWindHistory } from '../../lib/mockData.js'

export default function WindCard({
  speed = 0,
  direction = 0,
  directionLabel = 'UNKNOWN',
}) {

  return (
    <div className="bg-white rounded-3xl p-5 shadow-sm border border-forest-50 col-span-2 flex flex-col gap-4">
      <div className="flex items-center gap-2 text-forest-400">
        <Wind size={16} strokeWidth={1.75} />
        <span className="text-sm font-medium text-forest-500">Angin</span>
      </div>

      <div className="flex items-start gap-6">
        {/* Compass */}
        <div className="flex flex-col items-center gap-2 shrink-0">
          <div className="relative w-20 h-20 rounded-full border border-forest-100 flex items-center justify-center bg-forest-50">
            <span className="absolute top-1.5 text-[10px] text-forest-400 font-medium">U</span>
            <span className="absolute bottom-1.5 text-[10px] text-forest-400 font-medium">S</span>
            <span className="absolute left-1.5 text-[10px] text-forest-400 font-medium">B</span>
            <span className="absolute right-1.5 text-[10px] text-forest-400 font-medium">T</span>
            <div
              className="absolute w-0.5 h-7 bg-forest-500 rounded-full transition-transform duration-700"
               style={{ transform: `rotate(${direction}deg)`, transformOrigin: 'bottom center', bottom: '50%', left: 'calc(50% - 1px)' }}
                >
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[3px] border-r-[3px] border-b-[5px] border-l-transparent border-r-transparent border-b-forest-500" />
            </div>
          </div>
          <span className="text-xs text-forest-400">{direction}° {directionLabel}</span>
        </div>

        {/* Speed + chart */}
        <div className="flex-1 min-w-0">
          <div className="flex items-end gap-1 mb-3">
            <span className="text-4xl font-semibold text-forest-900 tracking-tight leading-none">{speed.toFixed(1)}</span>
            <span className="text-base text-forest-400 mb-0.5">m/s</span>
          </div>
          <ResponsiveContainer width="100%" height={60}>
            <AreaChart data={mockWindHistory} margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
              <defs>
                <linearGradient id="windGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#52b788" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#52b788" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="time" tick={{ fontSize: 9, fill: '#9ab8a8' }} />
              <YAxis tick={{ fontSize: 9, fill: '#9ab8a8' }} />
              <Tooltip
                contentStyle={{ fontSize: 11, borderRadius: 10, border: 'none', background: '#f0faf5' }}
                formatter={(v) => [`${v} m/s`, 'Kecepatan']}
              />
              <Area type="monotone" dataKey="speed" stroke="#52b788" fill="url(#windGrad)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
