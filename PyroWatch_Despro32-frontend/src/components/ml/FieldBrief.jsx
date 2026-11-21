import { Crosshair, ShieldAlert, Ruler, HardHat, Radar, Flame } from 'lucide-react';
import { fmt, isNum, pct } from './mlFormat.js';

function Item({ icon: Icon, tone, label, value, detail }) {
  return (
    <article className="flex min-w-0 gap-3 rounded-2xl border border-gray-100 p-4">
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tone}`}>
        <Icon size={18} />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium text-gray-500">{label}</p>
        <p className="break-words text-sm font-semibold leading-5 text-gray-900">{value || '--'}</p>
        {detail && <p className="mt-1 text-xs leading-5 text-gray-500">{detail}</p>}
      </div>
    </article>
  );
}

function spreadText(spread) {
  if (!spread?.mode) return null;
  if (isNum(spread.rateMPerMin) && spread.mode === 'api permukaan') {
    return `${fmt(spread.rateMPerMin, 1)} m/menit`;
  }
  if (isNum(spread.rateCmph)) return `${fmt(spread.rateCmph, 2)} cm/jam`;
  return spread.mode;
}

function distanceText(d) {
  if (!d || typeof d !== 'object') return null;
  const parts = Object.entries(d).map(([k, v]) => `${k.replace('m', ' mnt').replace('h', ' jam')}: ${v} m`);
  return parts.length ? `Jarak tempuh: ${parts.join(' · ')}` : null;
}

// Ringkasan lapangan: ke mana regu bergerak, area yang diamankan, radius, APD, sampling.
export default function FieldBrief({ forecast }) {
  const s = forecast.spread || {};
  return (
    <section>
      <h3 className="mb-3 text-sm font-semibold text-gray-900">Panduan lapangan</h3>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Item icon={Crosshair} tone="bg-orange-50 text-orange-700" label="Sektor pencarian sumber (hulu angin)"
          value={s.sourceSector}
          detail="Gas terbawa angin dari sumber ke node, jadi sumber smoldering dicari di arah datang angin." />
        <Item icon={ShieldAlert} tone="bg-red-50 text-red-700" label="Sektor ancaman (hilir angin)"
          value={s.threatSector}
          detail="Arah paparan asap dan rambat api permukaan. Prioritaskan peringatan warga/aset di sektor ini." />
        <Item icon={Ruler} tone="bg-blue-50 text-blue-700" label="Radius pemeriksaan"
          value={isNum(s.inspectionRadiusM) ? `±${Math.round(s.inspectionRadiusM)} m dari node` : null}
          detail={isNum(s.inspectionRadiusM)
            ? `Luas area ±${((Math.PI * s.inspectionRadiusM ** 2) / 10000).toFixed(1)} ha (heuristik, kalibrasi di lapangan).`
            : null} />
        <Item icon={Flame} tone="bg-amber-50 text-amber-700" label={`Estimasi rambat (${s.mode || 'n/a'})`}
          value={spreadText(s)}
          detail={[distanceText(s.distanceM),
            isNum(s.surfaceTransitionProbability) && s.surfaceTransitionProbability > 0
              ? `Peluang transisi ke api permukaan ${pct(s.surfaceTransitionProbability)}.` : null,
            s.directionConfidence ? `Keyakinan arah: ${s.directionConfidence}.` : null]
            .filter(Boolean).join(' ') || null} />
        <Item icon={HardHat} tone="bg-violet-50 text-violet-700" label="APD personel" value={forecast.ppe} />
        <Item icon={Radar} tone="bg-sky-50 text-sky-700" label="Interval sampling sensor yang disarankan"
          value={forecast.samplingInterval}
          detail="Sesuai klasifikasi FRI pada proposal: Moderate 5 menit, High 1 menit, Extreme 30 detik." />
      </div>
    </section>
  );
}
