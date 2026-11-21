import { Microscope } from 'lucide-react';
import { SCENARIOS, TONES, pct, scenarioInfo, fmt } from './mlFormat.js';

const DRIVER_STYLE = {
  gas: { label: 'Gas (CO/CH₄)', bar: 'bg-red-500', dot: 'bg-red-500' },
  suhu: { label: 'Suhu', bar: 'bg-orange-400', dot: 'bg-orange-400' },
  kelembapan: { label: 'Kelembapan', bar: 'bg-sky-400', dot: 'bg-sky-400' },
};

// Menjelaskan MENGAPA FRI bernilai sekian: skenario fisik + komposisi komponen.
export default function ScenarioPanel({ forecast, fri, friLevel }) {
  const info = scenarioInfo(forecast.scenario);
  const tone = TONES[info.tone];
  const probs = Object.entries(forecast.scenarioProbabilities || {})
    .filter(([, p]) => Number(p) >= 0.02)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);
  const drivers = forecast.drivers;
  const share = drivers?.share || {};
  const contrib = drivers?.contributions || {};

  return (
    <section className={`rounded-2xl border p-4 ${tone.soft}`}>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tone.chip}`}>
            <Microscope size={18} />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Skenario terdeteksi</p>
            <h3 className={`text-lg font-bold leading-tight ${tone.text}`}>
              {forecast.scenarioLabel || info.short}
            </h3>
            {info.hint && <p className="mt-1 text-xs leading-5 text-gray-600">{info.hint}</p>}
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">Keyakinan model</p>
          <p className={`text-2xl font-bold ${tone.text}`}>{pct(forecast.scenarioConfidence)}</p>
        </div>
      </div>

      {drivers && (
        <div className="mb-4 rounded-xl bg-white/80 p-3">
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-xs font-semibold text-gray-700">
              Komposisi FRI {fmt(fri, 2)} ({friLevel})
            </p>
            {drivers.dominant && (
              <p className="text-xs text-gray-500">
                Pendorong dominan: <strong className="text-gray-800">{drivers.dominant}</strong>
                {drivers.gasSource && drivers.dominant === 'gas' ? ` — ${drivers.gasSource}` : ''}
              </p>
            )}
          </div>
          <div className="flex h-3 w-full overflow-hidden rounded-full bg-gray-100" role="img"
            aria-label="Kontribusi gas, suhu, dan kelembapan terhadap FRI">
            {Object.keys(DRIVER_STYLE).map((key) => (
              <div key={key} className={DRIVER_STYLE[key].bar}
                style={{ width: `${Math.max(0, Number(share[key] || 0) * 100)}%` }} />
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
            {Object.entries(DRIVER_STYLE).map(([key, s]) => (
              <span key={key} className="inline-flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full ${s.dot}`} />
                {s.label}: {fmt(contrib[key], 2)} poin ({pct(share[key])})
              </span>
            ))}
          </div>
          {drivers.notes.length > 0 && (
            <ul className="mt-3 space-y-1.5 text-xs leading-5 text-gray-700">
              {drivers.notes.map((note) => (
                <li key={note} className="flex gap-2">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-gray-400" />
                  {note}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {probs.length > 1 && (
        <div>
          <p className="mb-2 text-xs font-semibold text-gray-700">Probabilitas skenario</p>
          <div className="space-y-1.5">
            {probs.map(([code, p]) => {
              const t = TONES[(SCENARIOS[code] || {}).tone || 'slate'];
              return (
                <div key={code} className="grid grid-cols-[minmax(0,10rem)_1fr_3rem] items-center gap-2 text-xs">
                  <span className="truncate text-gray-600">{scenarioInfo(code).short}</span>
                  <span className="h-2 overflow-hidden rounded-full bg-white">
                    <span className={`block h-full rounded-full ${t.bar}`} style={{ width: `${Number(p) * 100}%` }} />
                  </span>
                  <span className="text-right font-semibold text-gray-700">{pct(p)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
