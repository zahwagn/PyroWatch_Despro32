import { Wind } from 'lucide-react';
import IconBadge from '../ui/IconBadge.jsx';

export default function WindCard({
  speed = null,
  direction = null,
  directionLabel = 'UNKNOWN',
  source = 'Open-Meteo',
}) {
  const hasSpeed =
    speed !== null &&
    speed !== undefined &&
    Number.isFinite(Number(speed));

  const hasDirection =
    direction !== null &&
    direction !== undefined &&
    Number.isFinite(Number(direction));

  return (
    <section className="flex min-w-0 flex-col gap-5 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <IconBadge icon={Wind} tone="sky" />

        <div>
          <h2 className="text-base font-semibold text-gray-800">
            Kondisi Angin
          </h2>

          <p className="text-xs text-gray-400">
            Kecepatan dari ESP32 Anemometer
          </p>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex h-24 w-24 shrink-0 flex-col items-center justify-center rounded-full border-2 border-sky-100 bg-sky-50">
          <Wind size={24} className="mb-1 text-sky-600" />

          <span className="text-sm font-bold text-gray-800">
            {hasDirection
              ? `${Number(direction).toFixed(0)}°`
              : '--'}
          </span>

          <span className="text-xs text-gray-500">
            {directionLabel}
          </span>
        </div>

        <div className="min-w-0">
          <div className="flex items-end gap-1.5">
            <span className="text-5xl font-bold leading-none tracking-tight text-gray-900">
              {hasSpeed
                ? Number(speed).toFixed(2)
                : '--'}
            </span>

            <span className="mb-1 text-lg font-medium text-gray-500">
              m/s
            </span>
          </div>

          <p className="mt-3 text-xs leading-5 text-gray-500">
            Arah angin berasal dari {source || 'Open-Meteo'}.
            Arah meteorologi bukan arah rambat api.
          </p>
        </div>
      </div>
    </section>
  );
}