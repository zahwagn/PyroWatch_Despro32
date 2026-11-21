import { Wind } from 'lucide-react';
import IconBadge from '../ui/IconBadge.jsx';

const isNum = (v) => v !== null && v !== undefined && Number.isFinite(Number(v));

// Titik pada lingkaran (0° = Utara, searah jarum jam).
function polar(cx, cy, r, deg) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
}

function sectorPath(cx, cy, r, centerDeg, halfWidth = 45) {
  const [x1, y1] = polar(cx, cy, r, centerDeg - halfWidth);
  const [x2, y2] = polar(cx, cy, r, centerDeg + halfWidth);
  return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2} Z`;
}

function Compass({ fromDeg }) {
  const c = 60;
  const r = 52;
  const has = isNum(fromDeg);
  const to = has ? (Number(fromDeg) + 180) % 360 : null;
  const [ax, ay] = has ? polar(c, c, 38, Number(fromDeg)) : [c, c];
  const [bx, by] = has ? polar(c, c, 38, to) : [c, c];
  return (
    <svg viewBox="0 0 120 120" className="h-32 w-32 shrink-0" role="img"
      aria-label={has ? `Angin datang dari ${Number(fromDeg).toFixed(0)} derajat` : 'Arah angin tidak tersedia'}>
      <circle cx={c} cy={c} r={r} className="fill-sky-50 stroke-sky-100" strokeWidth="2" />
      {has && <path d={sectorPath(c, c, r, Number(fromDeg))} className="fill-orange-200/70" />}
      {has && <path d={sectorPath(c, c, r, to)} className="fill-red-200/70" />}
      {['U', 'T', 'S', 'B'].map((label, i) => {
        const [x, y] = polar(c, c, r - 8, i * 90);
        return <text key={label} x={x} y={y + 3} textAnchor="middle" className="fill-gray-500 text-[9px] font-semibold">{label}</text>;
      })}
      {has && (
        <>
          <defs>
            <marker id="wind-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" className="fill-sky-700" />
            </marker>
          </defs>
          <line x1={ax} y1={ay} x2={bx} y2={by} className="stroke-sky-700" strokeWidth="3" markerEnd="url(#wind-arrow)" />
        </>
      )}
      <circle cx={c} cy={c} r="4" className="fill-gray-800" />
    </svg>
  );
}

export default function WindCard({
  speed = null,
  direction = null,
  directionLabel = 'UNKNOWN',
  source = 'Open-Meteo',
  futureSpeed = null,
  sourceSector = null,
  threatSector = null,
}) {
  const hasSpeed = isNum(speed);
  const hasDirection = isNum(direction);

  return (
    <section className="flex min-w-0 flex-col gap-5 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <IconBadge icon={Wind} tone="sky" />
        <div>
          <h2 className="text-base font-semibold text-gray-800">Kondisi Angin & Sektor</h2>
          <p className="text-xs text-gray-400">Kecepatan dari anemometer ESP32, arah dari {source || 'Open-Meteo'}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 sm:gap-6">
        <Compass fromDeg={hasDirection ? direction : null} />

        <div className="min-w-[10rem] flex-1">
          <div className="flex items-end gap-1.5">
            <span className="text-4xl font-bold leading-none tracking-tight text-gray-900 sm:text-5xl">
              {hasSpeed ? Number(speed).toFixed(2) : '--'}
            </span>
            <span className="mb-1 text-lg font-medium text-gray-500">m/s</span>
          </div>
          <p className="mt-2 text-sm text-gray-600">
            Datang dari <strong>{hasDirection ? `${directionLabel} (${Number(direction).toFixed(0)}°)` : '--'}</strong>
            {isNum(futureSpeed) && <> · proyeksi 15 menit <strong>{Number(futureSpeed).toFixed(1)} m/s</strong></>}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 text-xs leading-5 sm:grid-cols-2">
        <div className="rounded-xl border border-orange-100 bg-orange-50 p-3 text-orange-900">
          <p className="font-semibold">▲ Hulu angin: cari sumber</p>
          <p>{sourceSector || 'Belum tersedia'}</p>
        </div>
        <div className="rounded-xl border border-red-100 bg-red-50 p-3 text-red-900">
          <p className="font-semibold">▼ Hilir angin: area ancaman</p>
          <p>{threatSector || 'Belum tersedia'}</p>
        </div>
      </div>
      <p className="text-xs leading-5 text-gray-500">
        Gas dan asap terbawa dari sumber ke node, sehingga sumber berada di arah datang angin. Api permukaan dan asap bergerak ke hilir angin. Rambat smoldering di bawah tanah lebih dipengaruhi kadar air gambut daripada angin.
      </p>
    </section>
  );
}
