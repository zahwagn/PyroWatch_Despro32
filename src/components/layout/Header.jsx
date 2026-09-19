import { RefreshCw } from 'lucide-react'
import Logo from '../../assets/pyrowatch_logo.svg'

const riskColors = {
  Low:      'bg-forest-100 text-forest-700',
  Medium:   'bg-yellow-100 text-yellow-700',
  High:     'bg-orange-100 text-orange-700',
  Critical: 'bg-red-100 text-red-700',
}

const riskDot = {
  Low:      'bg-forest-500',
  Medium:   'bg-yellow-500',
  High:     'bg-orange-500',
  Critical: 'bg-red-500',
}

export default function Header({ riskLevel = 'Low', lastUpdated, onRefresh }) {
  const timeStr = lastUpdated
    ? lastUpdated.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : '—'

  return (
    <header className="flex items-center justify-between mb-8">
      <img src={Logo} alt="PyroWatch" className="w-36 h-auto" />

      <div className="flex items-center gap-3">
        <span className="text-xs text-forest-400">Diperbarui {timeStr}</span>
        <button
          onClick={onRefresh}
          className="w-8 h-8 flex items-center justify-center rounded-xl bg-white hover:bg-forest-50 border border-forest-100 transition-colors"
        >
          <RefreshCw size={13} className="text-forest-400" strokeWidth={1.75} />
        </button>
        <span className={`flex items-center gap-1.5 text-sm font-medium px-3 py-1 rounded-full ${riskColors[riskLevel]}`}>
          <span className={`w-2 h-2 rounded-full ${riskDot[riskLevel]}`} />
          {riskLevel}
        </span>
      </div>
    </header>
  )
}
