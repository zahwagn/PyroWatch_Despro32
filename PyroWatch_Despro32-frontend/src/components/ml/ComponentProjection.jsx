import { ArrowRight } from 'lucide-react';
import { fmt, isNum } from './mlFormat.js';

const ROWS = [
  { key: 'co', label: 'CO', unit: 'ppm', digits: 0, warn: (v) => v >= 35, rising: 'bad' },
  { key: 'ch4', label: 'CH₄', unit: 'ppm', digits: 0, warn: (v) => v >= 500, rising: 'bad' },
  { key: 'temp', label: 'Suhu', unit: '°C', digits: 1, warn: (v) => v >= 40, rising: 'bad' },
  { key: 'hum', label: 'Kelembapan', unit: '%', digits: 0, warn: (v) => v <= 40, rising: 'good' },
  { key: 'wind', label: 'Angin', unit: 'm/s', digits: 1, warn: (v) => v >= 5, rising: 'bad' },
];

function deltaClass(delta, rising) {
  if (!isNum(delta) || Math.abs(delta) < 1e-9) return 'text-gray-500';
  const up = delta > 0;
  const bad = (up && rising === 'bad') || (!up && rising === 'good');
  return bad ? 'text-red-600' : 'text-forest-700';
}

// Proyeksi tiap komponen sensor 15 menit ke depan + tren per menit.
export default function ComponentProjection({ current, projection = {}, trendPerMin = {} }) {
  return (
    <section>
      <h3 className="mb-3 text-sm font-semibold text-gray-900">Proyeksi komponen sensor 15 menit</h3>
      <div className="overflow-x-auto rounded-2xl border border-gray-100">
        <table className="w-full min-w-[28rem] text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500">
            <tr>
              <th className="px-4 py-2 text-left font-medium">Komponen</th>
              <th className="px-4 py-2 text-right font-medium">Sekarang → 15 menit</th>
              <th className="px-4 py-2 text-right font-medium">Tren / menit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {ROWS.map((r) => {
              const now = current[r.key];
              const next = projection[r.key];
              const delta = isNum(now) && isNum(next) ? next - now : null;
              return (
                <tr key={r.key}>
                  <td className="px-4 py-2.5 text-gray-700">{r.label}</td>
                  <td className="px-4 py-2.5 text-right">
                    <span className="inline-flex items-center gap-1.5 tabular-nums">
                      <span className="text-gray-500">{fmt(now, r.digits)}</span>
                      <ArrowRight size={13} className="text-gray-300" />
                      <span className={`font-semibold ${isNum(next) && r.warn(next) ? 'text-red-600' : 'text-gray-900'}`}>
                        {fmt(next, r.digits)}
                      </span>
                      <span className="text-xs text-gray-400">{r.unit}</span>
                    </span>
                  </td>
                  <td className={`px-4 py-2.5 text-right text-xs tabular-nums ${deltaClass(delta, r.rising)}`}>
                    {isNum(trendPerMin[r.key]) ? `${trendPerMin[r.key] > 0 ? '+' : ''}${Number(trendPerMin[r.key]).toFixed(2)} ${r.unit}` : '--'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
