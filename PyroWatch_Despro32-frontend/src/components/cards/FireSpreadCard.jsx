import { Flame, Info } from 'lucide-react';
import IconBadge from '../ui/IconBadge.jsx';

export default function FireSpreadCard({
  spreadRate = null,
  spreadModelStatus = 'UNKNOWN',
}) {
  const available =
    spreadRate !== null &&
    spreadRate !== undefined &&
    Number.isFinite(Number(spreadRate));

  return (
    <section className="flex min-w-0 flex-col gap-4 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <IconBadge icon={Flame} tone="red" />

        <div>
          <h2 className="text-base font-semibold text-gray-800">
            Estimasi Laju Rambat Baseline
          </h2>

          <p className="text-xs text-gray-400">
            Perhitungan semi-empiris saat ini
          </p>
        </div>
      </div>

      <div className="flex items-end gap-2">
        <span className="text-5xl font-bold leading-none tracking-tight text-gray-900">
          {available
            ? Number(spreadRate).toFixed(2)
            : '--'}
        </span>

        <span className="mb-1 text-lg font-medium text-gray-500">
          cm/jam
        </span>
      </div>

      <div className="flex gap-2 rounded-2xl border border-blue-100 bg-blue-50 p-3">
        <Info
          size={17}
          className="mt-0.5 shrink-0 text-blue-700"
        />

        <p className="text-xs leading-5 text-blue-900">
          Nilai ini merupakan estimasi baseline, bukan hasil
          pengukuran langsung di lapangan dan bukan label observasi
          untuk pelatihan ML. Status perhitungan: {spreadModelStatus}.
        </p>
      </div>

      <p className="text-xs leading-5 text-gray-500">
        Prediksi laju rambat ML hanya ditampilkan apabila data
        observasi aktual sudah mencukupi untuk pelatihan model.
      </p>
    </section>
  );
}