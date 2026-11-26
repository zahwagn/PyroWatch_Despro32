import { AlertTriangle, BrainCircuit, ChevronDown, Info } from 'lucide-react';

import IconBadge from '../ui/IconBadge.jsx';
import ScenarioPanel from '../ml/ScenarioPanel.jsx';
import EscalationPanel from '../ml/EscalationPanel.jsx';
import ComponentProjection from '../ml/ComponentProjection.jsx';
import FieldBrief, { getFieldGuidance } from '../ml/FieldBrief.jsx';
import ActionPlan from '../ml/ActionPlan.jsx';
import OfficerSummary from '../ml/OfficerSummary.jsx';
import { PRIORITY_STYLE, priorityInfo } from '../ml/mlFormat.js';

function formatDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString('id-ID', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

function ModelDetails({ label, children }) {
  return (
    <details className="min-w-0 [&[open]>summary>svg]:rotate-180">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-forest-50 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-forest-700 [&::-webkit-details-marker]:hidden">
        {label}
        <ChevronDown size={18} className="shrink-0 text-forest-700" aria-hidden="true" />
      </summary>
      <div className="min-w-0 px-4 pb-4 pt-2">{children}</div>
    </details>
  );
}

export default function MLPredictionCard({ forecast = {}, sensor = {} }) {
  const status = forecast?.status || 'UNAVAILABLE';
  const available = Boolean(['OK', 'PARTIAL', 'CACHED'].includes(status) && forecast?.scenario);
  const rec = forecast?.recommendations ?? null;
  const priorityCode = forecast?.priority || rec?.priority;
  const priority = priorityInfo(priorityCode);
  const target = formatDate(forecast?.forecastTimestamp);
  const cachedSample = formatDate(forecast?.cachedFromSample);
  const qualityNotes = [...new Set(
    (Array.isArray(forecast?.dataQuality) ? forecast.dataQuality : [])
      .filter(note => typeof note === 'string' && note.trim())
      .map(note => note.trim()),
  )];
  const analysis = typeof forecast?.insightText === 'string' ? forecast.insightText.trim() : '';
  const fieldGuidance = available ? getFieldGuidance(forecast) : [];

  return (
    <section className="dashboard-card flex min-w-0 flex-col gap-5 p-4 sm:gap-6 sm:p-6">
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <div className="flex min-w-0 items-center gap-3">
          <IconBadge icon={BrainCircuit} />
          <h2 className="text-base font-semibold text-gray-900">Analisis & Prediksi ML</h2>
        </div>
        {(priorityCode || (available && status !== 'OK')) && (
          <div className="flex flex-wrap items-center gap-2">
            {priorityCode && (
              <span className={`dashboard-status ${PRIORITY_STYLE[priority.tone]}`} title={priority.desc}>
                Prioritas {priority.label}
              </span>
            )}
            {available && status === 'PARTIAL' && (
              <span className="dashboard-status text-amber-800">Data terbatas</span>
            )}
            {available && status === 'CACHED' && (
              <span className="dashboard-status text-gray-600">
                Sampel sebelumnya{cachedSample && ` · ${cachedSample}`}
              </span>
            )}
          </div>
        )}
      </header>

      {qualityNotes.length > 0 && (
        <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-800" aria-hidden="true" />
          <div className="min-w-0 text-sm leading-5 text-amber-900">
            <p className="font-semibold">Kualitas data</p>
            <ul className="mt-1 list-disc space-y-1 break-words pl-4">
              {qualityNotes.map(note => <li key={note}>{note}</li>)}
            </ul>
          </div>
        </div>
      )}

      {available ? (
        <OfficerSummary forecast={forecast} />
      ) : (
        <p className="text-sm leading-5 text-gray-600">Prediksi belum tersedia.</p>
      )}

      <ActionPlan plan={forecast?.actionPlan ?? []} fallback={rec} />

      {rec?.operational_caveat && (
        <div className="flex gap-2.5 text-xs leading-5 text-gray-600">
          <Info size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
          <p className="max-w-prose">{rec.operational_caveat}</p>
        </div>
      )}

      {(available || analysis) && (
        <div className="dashboard-panel divide-y divide-gray-100">
          <ModelDetails label="Detail prediksi">
            {available && (
              <div className="space-y-4">
                <div className="grid gap-4 xl:grid-cols-2">
                  <ScenarioPanel
                    forecast={forecast}
                    fri={sensor.fireRiskIndex ?? forecast.currentFri}
                    friLevel={sensor.riskLevel ?? forecast.currentFriLevel}
                  />
                  <EscalationPanel forecast={forecast} />
                </div>
                <ComponentProjection
                  current={{ co: sensor.co, ch4: sensor.ch4, temp: sensor.temperature, hum: sensor.humidity, wind: sensor.windSpeed }}
                  projection={forecast.projection15}
                  trendPerMin={forecast.trendPerMin}
                />
              </div>
            )}

            {analysis && (
              <div className={`border-t border-gray-100 ${available ? 'mt-4' : ''}`}>
                <ModelDetails label="Analisis model lengkap">
                  <p className="max-w-prose whitespace-pre-line break-words text-sm leading-6 text-gray-700">{analysis}</p>
                </ModelDetails>
              </div>
            )}

            <ul className="flex flex-wrap gap-x-4 gap-y-1 border-t border-gray-100 px-1 pt-3 text-xs text-gray-600">
              <li>Status model {status}</li>
              {forecast?.inputStatus && forecast.inputStatus !== 'UNKNOWN' && <li>Input {forecast.inputStatus}</li>}
              {forecast?.historyPoints != null && <li>{forecast.historyPoints} pembacaan dalam 15 menit</li>}
              {target && <li>Prakiraan hingga {target}</li>}
              {forecast?.modelVersion && <li>Versi {forecast.modelVersion}</li>}
            </ul>
          </ModelDetails>

          {fieldGuidance.length > 0 && (
            <ModelDetails label="Panduan lapangan">
              <FieldBrief items={fieldGuidance} />
            </ModelDetails>
          )}
        </div>
      )}
    </section>
  );
}