import { Flame } from 'lucide-react';
import IconBadge from '../ui/IconBadge.jsx';

const risk = {
  Low: {
    bar: 'from-forest-400 to-forest-600',
    border: 'border-forest-400',
    pill: 'bg-forest-100 text-forest-700',
    label: 'Rendah',
  },

  Moderate: {
    bar: 'from-yellow-400 to-orange-400',
    border: 'border-yellow-400',
    pill: 'bg-yellow-100 text-yellow-700',
    label: 'Sedang',
  },

  High: {
    bar: 'from-orange-400 to-red-500',
    border: 'border-orange-400',
    pill: 'bg-orange-100 text-orange-700',
    label: 'Tinggi',
  },

  Extreme: {
    bar: 'from-red-500 to-red-700',
    border: 'border-red-500',
    pill: 'bg-red-100 text-red-700',
    label: 'Ekstrem',
  },
};

export default function FireRiskCard({
  index = null,
  riskLevel = 'UNKNOWN',
  className = '',
}) {
  const hasValue =
    index !== null &&
    index !== undefined &&
    Number.isFinite(Number(index));

  const style = risk[riskLevel] || {
    bar: 'from-gray-300 to-gray-400',
    border: 'border-gray-200',
    pill: 'bg-gray-100 text-gray-600',
    label: 'Tidak diketahui',
  };

  const percentage = hasValue
    ? Math.max(0, Math.min(Number(index) * 100, 100))
    : 0;

  return (
    <section
      className={
        'dashboard-card col-span-2 flex flex-col gap-4 border-2 p-6 ' +
        style.border +
        ' ' +
        className
      }
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <IconBadge icon={Flame} tone="red" />

          <span className="text-base font-medium text-gray-500">
            Fire Risk Index (Aktual)
          </span>
        </div>

        <span
          className={
            'rounded-full px-3 py-1 text-sm font-semibold ' +
            style.pill
          }
        >
          {style.label}
        </span>
      </div>

      <div className="flex items-end gap-2">
        <span className="text-6xl font-bold leading-none tracking-tight text-gray-900">
          {hasValue ? Number(index).toFixed(3) : '--'}
        </span>

        <span className="mb-1 text-xl font-medium text-gray-500">
          / 1.00
        </span>
      </div>

      <div className="h-2.5 overflow-hidden rounded-full bg-gray-100">
        <div
          className={
            'h-full rounded-full bg-gradient-to-r transition-all duration-700 ' +
            style.bar
          }
          style={{
            width: hasValue
              ? `${Math.max(percentage, 1)}%`
              : '0%',
          }}
        />
      </div>

      <div className="flex justify-between text-xs text-gray-500">
        <span>Rendah</span>
        <span>Sedang</span>
        <span>Tinggi</span>
        <span>Ekstrem</span>
      </div>
    </section>
  );
}