import { RefreshCw } from 'lucide-react';

import Logo from '../../assets/pyrowatch_logo.svg';

const riskStyles = {
  Low: 'bg-forest-100 text-forest-700',
  Moderate: 'bg-yellow-100 text-yellow-700',
  High: 'bg-orange-100 text-orange-700',
  Extreme: 'bg-red-100 text-red-700',
  UNKNOWN: 'bg-gray-100 text-gray-600',
};

const riskDots = {
  Low: 'bg-forest-500',
  Moderate: 'bg-yellow-500',
  High: 'bg-orange-500',
  Extreme: 'bg-red-500',
  UNKNOWN: 'bg-gray-400',
};

export default function Header({
  riskLevel = 'UNKNOWN',
  lastUpdated,
  onRefresh,
  refreshing = false,
}) {
  const level = riskStyles[riskLevel]
    ? riskLevel
    : 'UNKNOWN';

  const time = lastUpdated
    ? lastUpdated.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : '--';

  return (
    <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
      <img
        src={Logo}
        alt="PyroWatch"
        className="h-auto w-36"
      />

      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm text-gray-500">
          Diperbarui {time}
        </span>

        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshing}
          aria-label="Perbarui data"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white transition-colors hover:bg-forest-50 disabled:opacity-50"
        >
          <RefreshCw
            size={15}
            className={
              'text-gray-500 ' +
              (refreshing ? 'animate-spin' : '')
            }
          />
        </button>

        <span
          className={
            'flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ' +
            riskStyles[level]
          }
        >
          <span
            className={'h-2 w-2 rounded-full ' + riskDots[level]}
          />

          FRI {level}
        </span>
      </div>
    </header>
  );
}