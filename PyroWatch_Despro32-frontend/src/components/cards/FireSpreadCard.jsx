import { Flame, Info } from 'lucide-react';
import IconBadge from '../ui/IconBadge.jsx';

const isNum = (v) => v !== null && v !== undefined && Number.isFinite(Number(v));

function mlRate(spread) {
  if (!spread?.mode) return null;
  if (spread.mode === 'api permukaan' && isNum(spread.rateMPerMin)) {
    return { value: Number(spread.rateMPerMin).toFixed(1), unit: 'm/menit' };
  }
  if (isNum(spread.rateCmph)) return { value: Number(spread.rateCmph).toFixed(2), unit: 'cm/jam' };
  return null;
}

export default function FireSpreadCard({
  spreadRate = null,
  spreadModelStatus = 'UNKNOWN',
  mlSpread = null,
}) {
  const available = isNum(spreadRate);
  const ml = mlRate(mlSpread);
  const distances = mlSpread?.distanceM && typeof mlSpread.distanceM === 'object'
    ? Object.entries(mlSpread.distanceM) : [];

  return (
    <section className="dashboard-card flex min-w-0 flex-col gap-4 p-4 sm:p-6">
      <div className="flex items-center gap-3">
        <IconBadge icon={Flame} tone="red" />
        <div>
          <h2 className="text-base font-semibold text-gray-800">Estimasi Laju Rambat</h2>
          <p className="text-xs text-gray-600">Baseline semi-empiris & estimasi sesuai skenario ML</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="dashboard-panel p-4">
          <p className="mb-1 text-xs font-medium text-gray-500">Baseline (Node-RED)</p>
          <div className="flex items-end gap-1.5">
            <span className="text-3xl font-bold leading-none text-gray-900">
              {available ? Number(spreadRate).toFixed(2) : '--'}
            </span>
            <span className="mb-0.5 text-sm text-gray-500">cm/jam</span>
          </div>
          <p className="mt-2 text-xs text-gray-500">Status: {spreadModelStatus}</p>
        </div>

        <div className="dashboard-panel p-4">
          <p className="mb-1 text-xs font-medium text-gray-500">Skenario ML: {mlSpread?.mode || 'belum tersedia'}</p>
          <div className="flex items-end gap-1.5">
            <span className="text-3xl font-bold leading-none text-gray-900">{ml ? ml.value : '--'}</span>
            <span className="mb-0.5 text-sm text-gray-500">{ml ? ml.unit : ''}</span>
          </div>
          {distances.length > 0 && (
            <p className="mt-2 text-xs text-gray-600">
              {distances.map(([k, v]) => `${k.replace('m', ' mnt').replace('h', ' jam')}: ${v} m`).join(' · ')}
            </p>
          )}
        </div>
      </div>

      <div className="dashboard-panel flex gap-2 p-3">
        <Info size={17} className="mt-0.5 shrink-0 text-forest-700" />
        <p className="text-xs leading-5 text-gray-700">
          Smoldering gambut merambat lambat (cm/jam) tetapi sulit dipadamkan. Api permukaan yang terdorong angin bisa bergerak beberapa meter per menit. Kedua nilai ini estimasi heuristik, bukan pengukuran langsung, dan perlu dikalibrasi dengan observasi lapangan.
        </p>
      </div>
    </section>
  );
}
