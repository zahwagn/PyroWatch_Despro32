import { Microscope } from 'lucide-react';
import IconBadge from '../ui/IconBadge.jsx';
import { pct, scenarioInfo, fmt } from './mlFormat.js';

const DRIVER_STYLE = {
  gas: { label: 'Gas (CO/CH₄)', color: 'bg-forest-900' },
  suhu: { label: 'Suhu', color: 'bg-forest-600' },
  kelembapan: { label: 'Kelembapan', color: 'bg-forest-300' },
};

// Menjelaskan MENGAPA FRI bernilai sekian: skenario fisik + komposisi komponen.
export default function ScenarioPanel({ forecast, fri, friLevel }) {
  const info = scenarioInfo(forecast.scenario);
  const probs = Object.entries(forecast.scenarioProbabilities || {})
    .filter(([, p]) => Number(p) >= 0.02)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);
  const drivers = forecast.drivers;
  const share = drivers?.share || {};
  const contrib = drivers?.contributions || {};

  return (
    <section aria-label="Skenario terdeteksi" className="dashboard-panel min-w-0 p-4">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <IconBadge icon={Microscope} />
          <div className="min-w-0">
            <h3 className="break-words text-base font-semibold leading-tight text-gray-900">
              {forecast.scenarioLabel || info.short}
            </h3>
            {info.hint && <p className="mt-1 text-xs leading-5 text-gray-600">{info.hint}</p>}
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-600">Keyakinan model</p>
          <p className="text-xl font-bold tabular-nums text-gray-900">{pct(forecast.scenarioConfidence)}</p>
        </div>
      </div>

      {drivers && (
        <div className="border-t border-gray-100 pt-3">
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-xs font-semibold text-gray-900">
              Komposisi FRI {fmt(fri, 2)} ({friLevel})
            </p>
            {drivers.dominant && (
              <p className="text-xs text-gray-600">
                Pendorong dominan <strong>{drivers.dominant}</strong>
                {drivers.gasSource && drivers.dominant === 'gas' ? ` — ${drivers.gasSource}` : ''}
              </p>
            )}
          </div>
          <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-gray-100" aria-hidden="true">
            {Object.keys(DRIVER_STYLE).map((key) => (
              <div key={key} className={DRIVER_STYLE[key].color}
                style={{ width: `${Math.max(0, Number(share[key] || 0) * 100)}%` }} />
            ))}
          </div>
          <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
            {Object.entries(DRIVER_STYLE).map(([key, s]) => (
              <li key={key} className="inline-flex items-center gap-1.5">
                <span className={`h-2 w-2 shrink-0 rounded-full ${s.color}`} aria-hidden="true" />
                {s.label}: {fmt(contrib[key], 2)} poin ({pct(share[key])})
              </li>
            ))}
          </ul>
          {drivers.notes?.length > 0 && (
            <ul className="mt-3 list-disc space-y-1.5 pl-4 text-xs leading-5 text-gray-600">
              {drivers.notes.map((note) => <li key={note}>{note}</li>)}
            </ul>
          )}
        </div>
      )}

      {probs.length > 1 && (
        <div className="mt-4">
          <p className="mb-2 text-xs font-semibold text-gray-900">Probabilitas skenario</p>
          <div className="space-y-1.5">
            {probs.map(([code, p]) => (
              <div key={code} className="grid grid-cols-[minmax(0,10rem)_minmax(2rem,1fr)_auto] items-center gap-2 text-xs">
                <span className="break-words text-gray-600">{scenarioInfo(code).short}</span>
                <span className="h-2 overflow-hidden rounded-full bg-gray-100" aria-hidden="true">
                  <span className="block h-full rounded-full bg-forest-600" style={{ width: `${Number(p) * 100}%` }} />
                </span>
                <span className="text-right font-semibold tabular-nums text-gray-900">{pct(p)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
