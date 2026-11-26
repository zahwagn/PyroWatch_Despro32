import { TrendingUp, TrendingDown, Minus, AlertCircle, Timer } from 'lucide-react';
import { fmt, isNum, pct, signed } from './mlFormat.js';

const TREND = {
  RISING: { label: 'Meningkat', Icon: TrendingUp, color: 'text-red-700' },
  DECLINING: { label: 'Menurun', Icon: TrendingDown, color: 'text-forest-700' },
  STABLE: { label: 'Relatif stabil', Icon: Minus, color: 'text-gray-600' },
};

function estimateText(probability, eta, atThreshold) {
  if (atThreshold) return 'FRI saat ini sudah mencapai ambang';
  if (probability === 0) return 'Ambang tidak diproyeksikan tercapai';
  if (probability === null || !isNum(eta)) return 'Perkiraan waktu belum tersedia';
  return `Perkiraan tercapai ±${Math.round(eta)} menit lagi`;
}

function ProbabilityBar({ label, value, eta, atThreshold = false }) {
  const probability = isNum(value) ? Math.max(0, Math.min(1, Number(value))) : null;
  const displayed = probability > 0 && probability < 0.005 ? '<1%' : pct(probability);
  const color = probability >= 0.7 ? 'bg-red-600' : 'bg-forest-600';

  return (
    <article className="dashboard-panel min-w-0 p-4">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <p className="text-xs font-medium text-gray-500">{label}</p>
        <p className="text-2xl font-bold tabular-nums text-gray-900">{displayed}</p>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-gray-100" aria-hidden="true">
        <div className={`h-full rounded-full ${color}`}
          style={{ width: `${(probability ?? 0) * 100}%` }} />
      </div>
      <p className="mt-2 inline-flex items-center gap-1 text-xs text-gray-600">
        <Timer size={12} className="shrink-0" aria-hidden="true" />
        {estimateText(probability, eta, atThreshold)}
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
  const color = range.expected >= 0.03 ? 'bg-red-600' : 'bg-forest-600';
  const hasRange = isNum(range.low) && isNum(range.high);
  return (
    <div>
      <div className="mb-1 flex flex-wrap justify-between gap-2 text-xs">
        <span className="text-gray-600">{label}</span>
        <span className="font-semibold tabular-nums text-gray-800">
          {signed(range.expected)} {hasRange && <span className="font-normal text-gray-600">(rentang 80%: {signed(range.low)} s.d. {signed(range.high)})</span>}
        </span>
      </div>
      <div className="relative h-2 rounded-full bg-gray-100" aria-hidden="true">
        <span className="absolute top-0 h-full w-px bg-gray-400" style={{ left: '50%' }} />
        {hasRange && (
          <span className={`absolute top-0 h-full rounded-full opacity-30 ${color}`}
            style={{ left: pos(range.low), width: `calc(${pos(range.high)} - ${pos(range.low)})` }} />
        )}
        <span className={`absolute -top-0.5 h-3 w-3 -translate-x-1/2 rounded-full border-2 border-white ${color}`}
          style={{ left: pos(range.expected) }} />
      </div>
    </div>
  );
}

// Prediksi: peluang eskalasi & perubahan FRI (bukan skor FRI kedua).
export default function EscalationPanel({ forecast }) {
  const trend = TREND[forecast.trend] || { label: 'Belum diketahui', Icon: AlertCircle, color: 'text-gray-600' };
  const TrendIcon = trend.Icon;
  const level = forecast.currentFriLevel;
  const alreadyExtreme = level === 'Extreme';
  const alreadyHigh = level === 'High' || alreadyExtreme;

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-gray-900">Prediksi eskalasi {forecast.horizonMinutes} menit</h3>
        <span className={`dashboard-status ${trend.color}`}>
          <TrendIcon size={14} aria-hidden="true" /> Tren FRI: {trend.label}
        </span>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <ProbabilityBar
          label={alreadyHigh ? 'Peluang FRI tetap ≥ High (0,6)' : 'Peluang naik ke High (≥ 0,6)'}
          value={forecast.pHigh30} eta={forecast.etaHighMin} atThreshold={alreadyHigh} />
        <ProbabilityBar
          label={alreadyExtreme ? 'Peluang FRI tetap Extreme (> 0,8)' : 'Peluang naik ke Extreme (> 0,8)'}
          value={forecast.pExtreme30} eta={forecast.etaExtremeMin} atThreshold={alreadyExtreme} />
      </div>
      <div className="dashboard-panel mt-3 space-y-3 p-4">
        <RangeRow label="Perubahan FRI 15 menit" range={forecast.friChange15} />
        <RangeRow label="Perubahan FRI 30 menit" range={forecast.friChange30} />
        <p className="text-xs leading-5 text-gray-600">
          FRI sensor {fmt(forecast.currentFri, 2)} tetap menjadi skor resmi. Model memproyeksikan arah dan besar perubahannya beserta ketidakpastian.
        </p>
      </div>
    </section>
  );
}
