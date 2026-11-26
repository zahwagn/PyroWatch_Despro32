import { Crosshair, ShieldAlert, Ruler, HardHat, Radar, Flame } from 'lucide-react';
import IconBadge from '../ui/IconBadge.jsx';
import { fmt, isNum, pct } from './mlFormat.js';

function spreadText(spread) {
  if (!spread.mode) return null;
  if (isNum(spread.rateMPerMin) && spread.mode === 'api permukaan') {
    return fmt(spread.rateMPerMin, 1, ' m/menit');
  }
  return isNum(spread.rateCmph) ? fmt(spread.rateCmph, 2, ' cm/jam') : spread.mode;
}

export function getFieldGuidance(forecast) {
  const s = forecast.spread || {};
  const distanceData = s.distanceM && typeof s.distanceM === 'object' ? s.distanceM : {};
  const distances = Object.entries(distanceData).map(([range, meters]) =>
    `${range.replace('m', ' mnt').replace('h', ' jam')}: ${meters} m`,
  );
  const spreadNotes = [
    distances.length ? `Jarak tempuh: ${distances.join(' · ')}` : null,
    isNum(s.surfaceTransitionProbability) && s.surfaceTransitionProbability > 0
      ? `Peluang transisi ke api permukaan ${pct(s.surfaceTransitionProbability)}.` : null,
    s.directionConfidence ? `Keyakinan arah: ${s.directionConfidence}.` : null,
  ].filter(Boolean).join(' ');

  return [
    {
      icon: Crosshair, label: 'Pencarian sumber (hulu angin)', value: s.sourceSector,
    },
    {
      icon: ShieldAlert, tone: 'red', label: 'Sektor ancaman (hilir angin)', value: s.threatSector,
      detail: s.threatSector ? 'Prioritaskan peringatan warga dan aset di sektor ini.' : null,
    },
    {
      icon: Ruler, label: 'Radius pemeriksaan',
      value: isNum(s.inspectionRadiusM) ? `±${Math.round(s.inspectionRadiusM)} m dari node` : null,
      detail: isNum(s.inspectionRadiusM)
        ? `Luas sekitar ${((Math.PI * s.inspectionRadiusM ** 2) / 10000).toFixed(1)} ha. Verifikasi di lapangan.`
        : null,
    },
    {
      icon: Flame, label: s.mode ? `Estimasi rambat (${s.mode})` : 'Estimasi rambat',
      value: spreadText(s), detail: spreadNotes,
    },
    { icon: HardHat, label: 'APD personel', value: forecast.ppe },
    {
      icon: Radar, label: 'Interval pengukuran sensor', value: forecast.samplingInterval,
    },
  ].filter(({ value, detail }) => value || detail);
}

export default function FieldBrief({ items }) {
  return (
    <dl className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,16rem),1fr))] gap-4">
      {items.map(({ icon, label, value, detail, tone }) => (
        <div key={label} className="flex min-w-0 items-start gap-3">
          <IconBadge icon={icon} tone={tone} size={18} />
          <div className="min-w-0">
            <dt className="text-xs font-medium text-gray-600">{label}</dt>
            <dd className="break-words text-sm leading-5 text-gray-900">
              {value && <span className="font-semibold">{value}</span>}
              {detail && <p className="mt-1 text-xs leading-5 text-gray-600">{detail}</p>}
            </dd>
          </div>
        </div>
      ))}
    </dl>
  );
}