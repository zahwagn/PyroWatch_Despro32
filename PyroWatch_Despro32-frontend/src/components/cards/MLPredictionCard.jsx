import { BrainCircuit, Clock3, ClipboardCheck, AlertTriangle, History } from 'lucide-react';

import IconBadge from '../ui/IconBadge.jsx';
import ScenarioPanel from '../ml/ScenarioPanel.jsx';
import EscalationPanel from '../ml/EscalationPanel.jsx';
import ComponentProjection from '../ml/ComponentProjection.jsx';
import FieldBrief from '../ml/FieldBrief.jsx';
import ActionPlan from '../ml/ActionPlan.jsx';
import { TONES, priorityInfo } from '../ml/mlFormat.js';

function formatDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString('id-ID', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

const STATUS_STYLE = {
  OK: 'bg-forest-100 text-forest-800',
  PARTIAL: 'bg-amber-100 text-amber-800',
  CACHED: 'bg-blue-100 text-blue-800',
};

export default function MLPredictionCard({ forecast = {}, sensor = {} }) {
  const status = forecast?.status || 'UNAVAILABLE';
  const available = ['OK', 'PARTIAL', 'CACHED'].includes(status) && forecast?.scenario;
  const rec = forecast?.recommendations ?? null;
  const priority = priorityInfo(forecast?.priority || rec?.priority);
  const pTone = TONES[priority.tone];
  const target = formatDate(forecast?.forecastTimestamp);

  return (
    <section className="flex flex-col gap-6 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
      {/* HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <IconBadge icon={BrainCircuit} tone="violet" />
          <div>
            <h2 className="text-base font-semibold text-gray-900">Analisis & Prediksi ML</h2>
            <p className="text-xs text-gray-500">
              Penyebab FRI, peluang eskalasi {forecast?.horizonMinutes || 30} menit, dan rencana aksi
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${STATUS_STYLE[status] || 'bg-gray-100 text-gray-700'}`}>
            {status}
          </span>
          {(forecast?.priority || rec?.priority) && (
            <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${pTone.chip}`} title={priority.desc}>
              Prioritas {priority.label}
            </span>
          )}
        </div>
      </div>

      {status === 'CACHED' && forecast.cachedFromSample && (
        <p className="-mt-3 inline-flex items-center gap-1.5 text-xs text-blue-700">
          <History size={13} /> Menampilkan analisis terakhir (sampel {formatDate(forecast.cachedFromSample)}); analisis baru dijalankan tiap 60 detik.
        </p>
      )}

      {/* RINGKASAN */}
      <div className={`rounded-2xl border p-4 ${pTone.soft}`}>
        <p className={`mb-1 text-xs font-bold uppercase tracking-wide ${pTone.text}`}>
          Ringkasan untuk petugas — {priority.desc}
        </p>
        <p className="text-sm leading-6 text-gray-800">
          {forecast?.insightText || 'Insight belum tersedia. Periksa status layanan ML dan input sensor.'}
        </p>
      </div>

      {forecast?.dataQuality?.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="mb-1 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-amber-800">
            <AlertTriangle size={14} /> Catatan kualitas data
          </p>
          <ul className="list-disc space-y-1 pl-5 text-xs leading-5 text-amber-900">
            {forecast.dataQuality.map((q) => <li key={q}>{q}</li>)}
          </ul>
        </div>
      )}

      {available ? (
        <>
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <ScenarioPanel forecast={forecast} fri={sensor.fireRiskIndex ?? forecast.currentFri}
              friLevel={sensor.riskLevel ?? forecast.currentFriLevel} />
            <EscalationPanel forecast={forecast} />
          </div>

          <ActionPlan plan={forecast.actionPlan} fallback={rec} />

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <FieldBrief forecast={forecast} />
            <ComponentProjection
              current={{ co: sensor.co, ch4: sensor.ch4, temp: sensor.temperature, hum: sensor.humidity, wind: sensor.windSpeed }}
              projection={forecast.projection15} trendPerMin={forecast.trendPerMin} />
          </div>
        </>
      ) : (
        <>
          <ActionPlan plan={forecast?.actionPlan || []} fallback={rec} />
          {!rec && (
            <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
              Analisis skenario belum tersedia karena input sensor belum lengkap atau layanan ML belum merespons.
            </div>
          )}
        </>
      )}

      {rec?.operational_caveat && (
        <div className="flex gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-4">
          <ClipboardCheck className="mt-0.5 shrink-0 text-gray-500" size={18} />
          <div>
            <p className="mb-1 text-xs font-semibold text-gray-700">Batasan penggunaan</p>
            <p className="text-xs leading-5 text-gray-600">{rec.operational_caveat}</p>
          </div>
        </div>
      )}

      <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-3 text-xs text-gray-400">
        <span className="inline-flex items-center gap-1.5">
          <span className={`h-2 w-2 rounded-full ${available ? 'bg-forest-500' : 'bg-amber-500'}`} />
          Input: {forecast?.inputStatus || 'UNKNOWN'}
          {forecast?.historyPoints != null && ` · riwayat ${forecast.historyPoints} pembacaan / 15 menit`}
        </span>
        <span className="inline-flex flex-wrap items-center gap-3">
          {target && (
            <span className="inline-flex items-center gap-1"><Clock3 size={12} /> Horizon s.d. {target}</span>
          )}
          {forecast?.modelVersion && <span>Model {forecast.modelVersion}</span>}
        </span>
      </footer>
    </section>
  );
}
