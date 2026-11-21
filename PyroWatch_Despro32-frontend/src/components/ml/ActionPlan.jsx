import { useState } from 'react';
import { Radar, Flame, ShieldCheck, RadioTower, ChevronDown, ListChecks } from 'lucide-react';
import { CATEGORY_LABEL, PHASE_ORDER } from './mlFormat.js';

const CATEGORY_STYLE = {
  monitoring: { Icon: Radar, tone: 'bg-blue-50 text-blue-700' },
  early_response: { Icon: Flame, tone: 'bg-orange-50 text-orange-700' },
  area_protection: { Icon: ShieldCheck, tone: 'bg-forest-50 text-forest-700' },
  coordination: { Icon: RadioTower, tone: 'bg-violet-50 text-violet-700' },
};

const PHASE_STYLE = {
  'SEGERA (0–15 menit)': 'bg-red-600 text-white',
  'LANJUTAN (15–60 menit)': 'bg-amber-500 text-white',
  'PASCA / PEMANTAUAN': 'bg-gray-500 text-white',
};

function ActionItem({ item, index }) {
  const [open, setOpen] = useState(false);
  const style = CATEGORY_STYLE[item.category] || CATEGORY_STYLE.monitoring;
  const Icon = style.Icon;
  return (
    <li className="flex gap-3 rounded-2xl border border-gray-100 bg-white p-4">
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${style.tone}`}>
        <Icon size={18} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
          {index}. {CATEGORY_LABEL[item.category] || item.category}
        </p>
        <p className="text-sm leading-6 text-gray-800">{item.action}</p>
        {item.reason && (
          <>
            <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open}
              className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-800">
              <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
              {open ? 'Sembunyikan alasan' : 'Lihat alasan'}
            </button>
            {open && <p className="mt-1 rounded-xl bg-gray-50 p-3 text-xs leading-5 text-gray-600">{item.reason}</p>}
          </>
        )}
      </div>
    </li>
  );
}

// Rencana aksi berurutan per fase waktu.
export default function ActionPlan({ plan = [], fallback = null }) {
  const known = PHASE_ORDER.filter((p) => plan.some((a) => a.phase === p));
  const other = [...new Set(plan.map((a) => a.phase))].filter((p) => !PHASE_ORDER.includes(p));
  const phases = [...known, ...other];

  if (!plan.length) {
    if (!fallback) return null;
    // Kompatibilitas: tampilkan 4 teks rekomendasi lama.
    return (
      <section>
        <h3 className="mb-3 text-sm font-semibold text-gray-900">Rekomendasi tindakan</h3>
        <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {Object.keys(CATEGORY_LABEL).filter((k) => fallback[k]).map((k, i) => (
            <ActionItem key={k} index={i + 1} item={{ category: k, action: fallback[k] }} />
          ))}
        </ul>
      </section>
    );
  }

  let counter = 0;
  return (
    <section>
      <h3 className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-gray-900">
        <ListChecks size={16} className="text-gray-500" /> Rencana aksi petugas
      </h3>
      <div className="space-y-4">
        {phases.map((phase) => (
          <div key={phase}>
            <span className={`mb-2 inline-block rounded-full px-3 py-1 text-xs font-bold ${PHASE_STYLE[phase] || 'bg-gray-500 text-white'}`}>
              {phase}
            </span>
            <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {plan.filter((a) => a.phase === phase).map((item) => {
                counter += 1;
                return <ActionItem key={`${phase}-${counter}`} index={counter} item={item} />;
              })}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
