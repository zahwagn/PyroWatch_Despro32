import {
  BrainCircuit,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertCircle,
  Radar,
  Flame,
  ShieldCheck,
  RadioTower,
  Clock3,
  ClipboardCheck,
} from 'lucide-react';

import IconBadge from '../ui/IconBadge.jsx';

const trendConfig = {
  RISING: {
    label: 'Meningkat',
    Icon: TrendingUp,
    className: 'bg-red-50 text-red-700',
  },

  DECLINING: {
    label: 'Menurun',
    Icon: TrendingDown,
    className: 'bg-green-50 text-green-700',
  },

  STABLE: {
    label: 'Relatif stabil',
    Icon: Minus,
    className: 'bg-blue-50 text-blue-700',
  },
};

const priorityConfig = {
  URGENT: 'bg-red-100 text-red-800',
  ELEVATED: 'bg-orange-100 text-orange-800',
  WATCH: 'bg-yellow-100 text-yellow-800',
  ROUTINE: 'bg-green-100 text-green-800',
  DATA_CHECK: 'bg-gray-100 text-gray-700',
};

const recommendationItems = [
  {
    key: 'monitoring',
    title: 'Pemantauan',
    Icon: Radar,
    tone: 'bg-blue-50 text-blue-700',
  },
  {
    key: 'early_response',
    title: 'Respons awal',
    Icon: Flame,
    tone: 'bg-orange-50 text-orange-700',
  },
  {
    key: 'area_protection',
    title: 'Perlindungan area',
    Icon: ShieldCheck,
    tone: 'bg-green-50 text-green-700',
  },
  {
    key: 'coordination',
    title: 'Koordinasi',
    Icon: RadioTower,
    tone: 'bg-violet-50 text-violet-700',
  },
];

function formatDate(value) {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function Metric({ label, value, detail }) {
  return (
    <article className="min-w-0 rounded-2xl border border-gray-100 bg-gray-50 p-4">
      <p className="mb-2 text-xs font-medium text-gray-500">
        {label}
      </p>

      <p className="break-words text-xl font-bold text-gray-900">
        {value ?? 'Belum tersedia'}
      </p>

      {detail && (
        <p className="mt-2 text-xs leading-5 text-gray-500">
          {detail}
        </p>
      )}
    </article>
  );
}

export default function MLPredictionCard({ forecast = {} }) {
  const status = forecast?.status || 'UNAVAILABLE';
  const horizon = forecast?.horizonMinutes || 15;
  const trend = forecast?.trend || 'UNKNOWN';

  const trendInfo = trendConfig[trend] || {
    label: 'Belum diketahui',
    Icon: AlertCircle,
    className: 'bg-gray-100 text-gray-600',
  };

  const TrendIcon = trendInfo.Icon;

  const highlights = Array.isArray(forecast?.highlights)
    ? forecast.highlights
    : [];

  const recommendations = forecast?.recommendations ?? null;

  const priority = recommendations?.priority || 'DATA_CHECK';

  const available =
    status === 'OK' || status === 'PARTIAL';

  const timestampLabel = formatDate(
    forecast?.forecastTimestamp
  );

  const delta = forecast?.friChange;

  const deltaValue =
    delta === null || delta === undefined
      ? 'Belum tersedia'
      : `${Number(delta) > 0 ? '+' : ''}${Number(delta).toFixed(3)} poin`;

  const getHighlight = (key) =>
    highlights.find((item) => item.key === key);

  const windItem = getHighlight('wind_forecast');
  const spreadItem = getHighlight('spread_forecast');
  const trendItem = getHighlight('trend');

  return (
    <section className="flex flex-col gap-6 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">

      {/* HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <IconBadge
            icon={BrainCircuit}
            tone="violet"
          />

          <div>
            <h2 className="text-base font-semibold text-gray-900">
              Prediksi dan Analisis ML
            </h2>

            <p className="text-xs text-gray-500">
              Horizon prediksi {horizon} menit
            </p>
          </div>
        </div>

        <span
          className={
            'rounded-full px-3 py-1.5 text-xs font-semibold ' +
            (available
              ? 'bg-green-100 text-green-800'
              : 'bg-amber-100 text-amber-800')
          }
        >
          {status}
        </span>
      </div>

      {/* RINGKASAN PREDIKSI */}
      <div className="rounded-2xl border border-violet-100 bg-violet-50/70 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-bold uppercase tracking-wide text-violet-800">
            Ringkasan prediksi
          </p>

          <span
            className={
              'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ' +
              trendInfo.className
            }
          >
            <TrendIcon size={14} />
            {trendInfo.label}
          </span>
        </div>

        <p className="text-sm leading-6 text-gray-800">
          {forecast?.insightText ||
            'Insight belum tersedia. Periksa status model, input sensor, dan hasil training.'}
        </p>
      </div>

      {/* INDIKATOR YANG DIPROYEKSIKAN */}
      <div>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-gray-900">
            Indikator yang diproyeksikan
          </h3>

          <span className="text-xs text-gray-400">
            Bukan skor FRI masa depan kedua
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">

          <Metric
            label="Perubahan FRI"
            value={deltaValue}
            detail="Selisih prediksi FRI terhadap FRI aktual. FRI sensor tetap menjadi skor utama."
          />

          <Metric
            label="Tren indikator"
            value={trendItem?.value || trend}
            detail={
              trendItem?.detail ||
              'UNKNOWN berarti tren belum dapat dihitung.'
            }
          />

          <Metric
            label="Kecepatan angin 15 menit"
            value={
              windItem?.value ||
              (
                forecast?.futureWindSpeed == null
                  ? null
                  : `${Number(forecast.futureWindSpeed).toFixed(2)} m/s`
              )
            }
            detail={
              windItem?.detail ||
              'Kecepatan angin aktual bersumber dari anemometer ESP32.'
            }
          />

          <Metric
            label="Laju rambat 15 menit"
            value={
              spreadItem?.value ||
              (
                forecast?.futureSpreadRate == null
                  ? null
                  : `${Number(forecast.futureSpreadRate).toFixed(2)} cm/jam`
              )
            }
            detail={
              spreadItem?.detail ||
              'Hanya tersedia bila target observasi laju rambat aktual mencukupi.'
            }
          />

        </div>
      </div>

      {/* REKOMENDASI OPERASIONAL */}
      {recommendations ? (
        <div>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-gray-900">
              Dukungan keputusan operasional
            </h3>

            <span
              className={
                'rounded-full px-3 py-1 text-xs font-bold ' +
                (
                  priorityConfig[priority] ||
                  priorityConfig.DATA_CHECK
                )
              }
            >
              Prioritas: {priority}
            </span>
          </div>

          {recommendations.trigger_summary && (
            <div className="mb-3 rounded-2xl border border-amber-100 bg-amber-50 p-4">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-amber-800">
                Faktor yang perlu diperhatikan
              </p>

              <p className="text-sm leading-6 text-amber-900">
                {recommendations.trigger_summary}
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {recommendationItems.map(({
              key,
              title,
              Icon,
              tone,
            }) => (
              <article
                key={key}
                className="flex gap-3 rounded-2xl border border-gray-100 p-4"
              >
                <span
                  className={
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ' +
                    tone
                  }
                >
                  <Icon size={18} />
                </span>

                <div className="min-w-0">
                  <h4 className="mb-1 text-sm font-semibold text-gray-900">
                    {title}
                  </h4>

                  <p className="text-sm leading-6 text-gray-600">
                    {recommendations[key] ||
                      'Belum ada rekomendasi untuk bagian ini.'}
                  </p>
                </div>
              </article>
            ))}
          </div>

          {recommendations.operational_caveat && (
            <div className="mt-3 flex gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <ClipboardCheck
                className="mt-0.5 shrink-0 text-gray-500"
                size={18}
              />

              <div>
                <p className="mb-1 text-xs font-semibold text-gray-700">
                  Batasan penggunaan
                </p>

                <p className="text-xs leading-5 text-gray-600">
                  {recommendations.operational_caveat}
                </p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          Rekomendasi operasional belum tersedia karena hasil prediksi belum lengkap atau input belum memenuhi persyaratan model.
        </div>
      )}

      {/* FOOTER */}
      <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-3 text-xs text-gray-400">
        <span className="inline-flex items-center gap-1.5">
          <span
            className={
              'h-2 w-2 rounded-full ' +
              (available ? 'bg-green-500' : 'bg-amber-500')
            }
          />

          Status input: {forecast?.inputStatus || 'UNKNOWN'}
        </span>

        <span className="inline-flex flex-wrap items-center gap-3">
          {timestampLabel && (
            <span className="inline-flex items-center gap-1">
              <Clock3 size={12} />
              Target: {timestampLabel}
            </span>
          )}

          {forecast?.modelVersion && (
            <span>Model {forecast.modelVersion}</span>
          )}
        </span>
      </footer>
    </section>
  );
}