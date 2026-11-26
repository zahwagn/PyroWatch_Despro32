import { isNum, pct, scenarioInfo, SCENARIOS } from './mlFormat.js';

function readProbability(value) {
  return isNum(value) && Number(value) >= 0 && Number(value) <= 1 ? Number(value) : null;
}

export default function OfficerSummary({ forecast }) {
  const scenario = SCENARIOS[forecast.scenario]?.short || forecast.scenarioLabel || scenarioInfo(forecast.scenario).short;
  const pHigh = readProbability(forecast.pHigh30);
  const pExtreme = readProbability(forecast.pExtreme30);
  const alreadyHigh = ['High', 'Extreme'].includes(forecast.currentFriLevel);
  const showExtreme = pExtreme !== null && (alreadyHigh || pHigh === null);
  const probability = showExtreme ? pExtreme : pHigh;
  const horizon = isNum(forecast.horizonMinutes) && Number(forecast.horizonMinutes) > 0 ? Number(forecast.horizonMinutes) : 30;
  const spread = forecast.spread;
  const searchSector = ['EARLY_SMOLDERING', 'ACTIVE_SMOLDERING'].includes(forecast.scenario) && typeof spread?.sourceSector === 'string'
    ? spread.sourceSector.replace(/\s+\([^)]*°[^)]*\)$/, '')
    : null;
  const radius = isNum(spread?.inspectionRadiusM) && Number(spread.inspectionRadiusM) > 0
    ? Math.round(spread.inspectionRadiusM)
    : null;

  return (
    <section className="dashboard-panel p-4">
      <h3 className="text-sm font-bold text-gray-900">Ringkasan petugas</h3>
      <dl className="mt-3 grid grid-cols-[repeat(auto-fit,minmax(min(100%,13rem),1fr))] gap-x-6 gap-y-3">
        <div className="min-w-0">
          <dt className="text-xs font-medium text-gray-600">Skenario model</dt>
          <dd className="mt-1 break-words text-sm font-semibold leading-5 text-gray-900">{scenario}</dd>
        </div>

        {probability !== null && (
          <div className="min-w-0">
            <dt className="text-xs font-medium text-gray-600">Peluang dalam {horizon} menit</dt>
            <dd className="mt-1 flex flex-wrap items-baseline gap-x-2 text-sm leading-5 text-gray-700">
              <strong className="text-lg font-bold tabular-nums text-gray-900">
                {probability > 0 && probability < 0.005 ? '<1%' : pct(probability)}
              </strong>{' '}
              {showExtreme ? 'Ekstrem' : 'Tinggi atau lebih'}
            </dd>
          </div>
        )}

        {searchSector && (
          <div className="min-w-0">
            <dt className="text-xs font-medium text-gray-600">Sektor pencarian (perkiraan)</dt>
            <dd className="mt-1 break-words text-sm font-semibold leading-5 text-gray-900">
              {searchSector}
              {radius !== null && (
                <span className="mt-0.5 block text-xs font-normal text-gray-600">Radius sekitar {radius} m dari node</span>
              )}
            </dd>
          </div>
        )}
      </dl>
    </section>
  );
}