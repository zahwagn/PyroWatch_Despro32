import { ChevronDown, ListChecks } from 'lucide-react';
import { CATEGORY_LABEL, PHASE_ORDER } from './mlFormat.js';

const [immediatePhase, followUpPhase, postPhase] = PHASE_ORDER;
const PHASE_DETAILS = {
  [immediatePhase]: { title: 'Segera', time: '0–15 menit', border: 'border-2 border-forest-700' },
  [followUpPhase]: { title: 'Lanjutan', time: '15–60 menit', border: 'border-2 border-forest-500' },
  [postPhase]: { title: 'Pasca / Pemantauan' },
};

function ActionList({ items }) {
  return (
    <ol className="list-decimal space-y-3 pl-6 marker:font-semibold marker:text-gray-700">
      {items.map((item, index) => (
        <li key={`${item.category}-${index}`} className="break-words border-b border-gray-100 pb-3 pl-1 last:border-b-0 last:pb-0">
          <p className="text-xs font-semibold text-gray-600">{CATEGORY_LABEL[item.category] || item.category}</p>
          <p className="mt-1 max-w-prose text-sm leading-relaxed text-gray-800">{item.action}</p>
          {item.reason && (
            <details className="group max-w-prose">
              <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-1 rounded-md pr-2 text-xs font-semibold text-forest-700 hover:text-forest-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-700 md:min-h-8 [&::-webkit-details-marker]:hidden">
                <ChevronDown size={14} className="group-open:rotate-180" aria-hidden="true" />
                Alasan
              </summary>
              <p className="pb-1 text-xs leading-relaxed text-gray-700">{item.reason}</p>
            </details>
          )}
        </li>
      ))}
    </ol>
  );
}

function PhaseCard({ phase, items }) {
  const detail = PHASE_DETAILS[phase] || { title: phase || 'Fase lainnya' };

  return (
    <section
      aria-label={detail.time ? `${detail.title}, ${detail.time}` : detail.title}
      className={`dashboard-panel min-w-0 p-4 sm:p-5 ${detail.border ?? ''}`}
    >
      <header className="mb-4 flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <h4 className="font-bold text-gray-900">{detail.title}</h4>
        {detail.time && <span className="text-xs font-medium tabular-nums text-gray-600">{detail.time}</span>}
      </header>
      <ActionList items={items} />
    </section>
  );
}
export default function ActionPlan({ plan = [], fallback = null }) {
  if (!plan.length) {
    const recommendations = Object.keys(CATEGORY_LABEL)
      .filter((category) => fallback?.[category])
      .map((category) => ({ category, action: fallback[category] }));
    if (!recommendations.length) return null;

    return (
      <section>
        <h3 className="mb-3 text-sm font-semibold text-gray-900">Rekomendasi tindakan</h3>
        <ActionList items={recommendations} />
      </section>
    );
  }

  const phases = [...new Set([...PHASE_ORDER, ...plan.map(({ phase }) => phase)])]
    .map((phase) => ({ phase, items: plan.filter((item) => item.phase === phase) }))
    .filter(({ items }) => items.length);
  const primaryPhases = phases.filter(({ phase }) => phase === immediatePhase || phase === followUpPhase);
  const remainingPhases = phases.slice(primaryPhases.length);

  return (
    <section>
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
        <ListChecks size={16} className="text-gray-500" aria-hidden="true" />
        Rencana aksi
      </h3>
      <div className="space-y-4">
        {primaryPhases.length > 0 && (
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,20rem),1fr))] gap-4">
            {primaryPhases.map(({ phase, items }) => <PhaseCard key={phase} phase={phase} items={items} />)}
          </div>
        )}
        {remainingPhases.map(({ phase, items }) => <PhaseCard key={phase ?? 'other'} phase={phase} items={items} />)}
      </div>
    </section>
  );
}
