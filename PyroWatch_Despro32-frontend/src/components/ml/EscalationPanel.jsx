import { TrendingUp, TrendingDown, Minus, AlertCircle, Timer } from 'lucide-react';
import { fmt, isNum, pct, signed } from './mlFormat.js';

const TREND = {
  RISING: { label: 'Meningkat', Icon: TrendingUp, cls: 'bg-red-50 text-red-700' },
  DECLINING: { label: 'Menurun', Icon: TrendingDown, cls: 'bg-forest-50 text-forest-700' },
  STABLE: { label: 'Relatif stabil', Icon: Minus, cls: 'bg-blue-50 text-blue-700' },
};

function probTone(p) {
  if (!isNum(p)) return 'bg-gray-300';
  if (p >= 0.7) return 'bg-red-500';
  if (p >= 0.4) return 'bg-orange-500';
  if (p >= 0.15) return 'bg-amber-400';
  return 'bg-forest-500';
}

function ProbabilityBar({ label, value, eta }) {
  return (
    <article className="min-w-0 rounded-2xl border border-gray-100 bg-gray-50 p-4">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <p className="text-xs font-medium text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{pct(value)}</p>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-gray-200">
        <div className={`h-full rounded-full ${probTone(value)}`}
          style={{ width: `${isNum(value) ? Math.max(2, value * 100) : 0}%` }} />
      </div>
      <p className="mt-2 inline-flex items-center gap-1 text-xs text-gray-500">
        <Timer size={12} />
        {isNum(eta) ? `Perkiraan tercapai ±${Math.round(eta)} menit lagi` : 'Tidak diproyeksikan tercapai dalam 30 menit'}
      </p>
    </article>
  );
}

function RangeRow({ label, range }) {
  if (!range || !isNum(range.expected)) {
    return (
      <div className="flex justify-between text-xs text-gray-500"><span>{label}</span><span>--</span></div>
    );
  }
  // skala tampilan -0,4 .. +0,4 poin FRI
  const pos = (v) => `${((Math.max(-0.4, Math.min(0.4, v)) + 0.4) / 0.8) * 100}%`;
  const color = range.expected >= 0.03 ? 'bg-red-500' : range.expected <= -0.03 ? 'bg-forest-500' : 'bg-blue-500';
  return (
    <div>
      <div className="mb-1 flex flex-wrap justify-between gap-2 text-xs">
        <span className="text-gray-600">{label}</span>
        <span className="font-semibold text-gray-800">
          {signed(range.expected)} <span className="font-normal text-gray-500">(rentang 80%: {signed(range.low)} s.d. {signed(range.high)})</span>
        </span>
      </div>
      <div className="relative h-2 rounded-full bg-gray-100">
        <span className="absolute top-0 h-full w-px bg-gray-400" style={{ left: '50%' }} />
        <span className={`absolute top-0 h-full rounded-full opacity-30 ${color}`}
          style={{ left: pos(range.low), width: `calc(${pos(range.high)} - ${pos(range.low)})` }} />
        <span className={`absolute -top-0.5 h-3 w-3 -translate-x-1/2 rounded-full border-2 border-white ${color}`}
          style={{ left: pos(range.expected) }} />
      </div>
    </div>
  );
}

// Prediksi: peluang eskalasi & perubahan FRI (bukan skor FRI kedua).
export default function EscalationPanel({ forecast }) {
  const trend = TREND[forecast.trend] || { label: 'Belum diketahui', Icon: AlertCircle, cls: 'bg-gray-100 text-gray-600' };
  const TrendIcon = trend.Icon;
  const level = forecast.currentFriLevel;
  const alreadyHigh = level === 'High' || level === 'Extreme';

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-gray-900">Prediksi eskalasi {forecast.horizonMinutes} menit</h3>
        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${trend.cls}`}>
          <TrendIcon size={14} /> Tren FRI: {trend.label}
        </span>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <ProbabilityBar
          label={alreadyHigh ? 'Peluang FRI tetap ≥ High (0,6)' : 'Peluang naik ke High (≥ 0,6)'}
          value={forecast.pHigh30} eta={alreadyHigh ? null : forecast.etaHighMin} />
        <ProbabilityBar label="Peluang naik ke Extreme (> 0,8)" value={forecast.pExtreme30}
          eta={level === 'Extreme' ? null : forecast.etaExtremeMin} />
      </div>
      <div className="mt-3 space-y-3 rounded-2xl border border-gray-100 p-4">
        <RangeRow label="Perubahan FRI 15 menit" range={forecast.friChange15} />
        <RangeRow label="Perubahan FRI 30 menit" range={forecast.friChange30} />
        <p className="text-xs leading-5 text-gray-400">
          FRI sensor {fmt(forecast.currentFri, 2)} tetap menjadi skor resmi. Model memproyeksikan arah dan besar perubahannya beserta ketidakpastian.
        </p>
      </div>
    </section>
  );
}
