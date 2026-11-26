import { useState } from 'react';

import {
  Thermometer,
  Droplets,
  Wind,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';

import Sidebar from './components/layout/Sidebar.jsx';
import Header from './components/layout/Header.jsx';

import FireRiskCard from './components/cards/FireRiskCard.jsx';
import SensorCard from './components/cards/SensorCard.jsx';
import SoilConditionCard from './components/cards/SoilConditionCard.jsx';
import WindCard from './components/cards/WindCard.jsx';
import FireSpreadCard from './components/cards/FireSpreadCard.jsx';
import MLPredictionCard from './components/cards/MLPredictionCard.jsx';

import HotspotMap from './components/map/HotspotMap.jsx';

import { useSensorData } from './hooks/useSensorData.js';

function formatValue(value, digits = 1) {
  if (
    value === null ||
    value === undefined ||
    !Number.isFinite(Number(value))
  ) {
    return '--';
  }

  return Number(value).toFixed(digits);
}

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-forest-50">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-full border-2 border-forest-300 border-t-forest-600 animate-spin" />

        <p className="text-sm text-forest-500">
          Memuat data PyroWatch...
        </p>
      </div>
    </div>
  );
}

function ErrorScreen({ error, onRetry }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-forest-50 p-5">
      <div className="max-w-md rounded-3xl border border-gray-100 bg-white p-8 text-center shadow-sm">
        <AlertTriangle
          className="mx-auto mb-3 text-red-500"
          size={32}
        />

        <h1 className="mb-2 text-lg font-semibold text-gray-900">
          Data belum tersedia
        </h1>

        <p className="mb-5 text-sm leading-6 text-gray-500">
          {error || 'Node-RED belum mengirimkan snapshot sensor.'}
        </p>

        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 rounded-xl bg-forest-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-forest-700"
        >
          <RefreshCw size={15} />
          Coba lagi
        </button>
      </div>
    </div>
  );
}

const PRIORITY_DOT = {
  URGENT: 'bg-red-500',
  ELEVATED: 'bg-orange-500',
  WATCH: 'bg-amber-400',
  DATA_CHECK: 'bg-slate-400',
  ROUTINE: 'bg-forest-500',
};

// Pilih node sensor (data dari GET /api/sensor/nodes). Disembunyikan bila hanya ada satu node.
function NodeSelector({ nodes = [], selected, current, onSelect }) {
  if (nodes.length < 2) return null;

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium text-gray-500">Node:</span>

      <button
        type="button"
        onClick={() => onSelect(null)}
        className={
          'rounded-full border px-3 py-1 text-xs font-medium ' +
          (selected === null
            ? 'border-forest-600 bg-forest-600 text-white'
            : 'border-gray-200 bg-white text-gray-600 hover:bg-forest-50')
        }
      >
        <span className="block max-w-[16rem] truncate">
          Terbaru{selected === null && current?.nodeId ? ` (${current.nodeId})` : ''}
        </span>
      </button>

      {nodes.map((n) => (
        <button
          key={n.nodeId}
          type="button"
          onClick={() => onSelect(n.nodeId)}
          className={
            'inline-flex max-w-full items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ' +
            (selected === n.nodeId
              ? 'border-forest-600 bg-forest-600 text-white'
              : 'border-gray-200 bg-white text-gray-600 hover:bg-forest-50')
          }
          title={`FRI ${n.riskLevel} · prioritas ${n.priority || '-'}`}
        >
          <span className={'h-2 w-2 shrink-0 rounded-full ' + (PRIORITY_DOT[n.priority] || 'bg-gray-300')} />
          <span className="truncate">{n.nodeId}</span>
          {n.simulation && <span className="opacity-70">(sim)</span>}
        </button>
      ))}
    </div>
  );
}

function SensorOverview({ sensor }) {
  return (
    <>
      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-8">
        <FireRiskCard
          index={sensor.fireRiskIndex}
          riskLevel={sensor.riskLevel}
        />

        <SensorCard
          icon={Thermometer}
          tone="orange"
          label="Suhu"
          value={formatValue(sensor.temperature)}
          unit="°C"
        />

        <SensorCard
          icon={Droplets}
          tone="blue"
          label="Kelembapan Udara"
          value={formatValue(sensor.humidity)}
          unit="%"
        />

        <SensorCard
          icon={Wind}
          tone="slate"
          label="CO"
          value={formatValue(sensor.co)}
          unit="ppm"
        />

        <SensorCard
          icon={AlertTriangle}
          tone="violet"
          label="CH₄"
          value={formatValue(sensor.ch4)}
          unit="ppm"
        />

        <SoilConditionCard
          condition={sensor.soilCondition}
          moisture={sensor.soilMoisture}
          className="xl:col-span-2"
        />
      </div>

      {!sensor.gasCalibrated && (
        <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-5 text-amber-800">
          Pembacaan CO dan CH₄ tidak ditampilkan karena status kalibrasi gas belum aktif.
        </div>
      )}

      {sensor.gasCalibrated && !sensor.gasCalibrationValidated && (
        <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-5 text-amber-800">
          Data gas masih berstatus estimasi/provisional dan belum divalidasi dengan gas standar.
        </div>
      )}
    </>
  );
}

export default function App() {
  const [view, setView] = useState('monitoring');
  const [expanded, setExpanded] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null); // null = node terbaru

  const {
    sensor,
    nodes,
    loading,
    error,
    lastUpdated,
    refresh,
  } = useSensorData(15000, selectedNode);

  if (loading && !sensor) {
    return <LoadingScreen />;
  }

  if (!sensor) {
    return (
      <ErrorScreen
        error={error}
        onRetry={refresh}
      />
    );
  }

  return (
    <div className="flex min-h-screen bg-forest-50">
      <Sidebar
        active={view}
        onNavigate={setView}
        expanded={expanded}
        onToggle={() => setExpanded((value) => !value)}
      />

      <main
        className={
          'ml-24 min-w-0 w-full flex-1 px-5 py-6 transition-[margin] duration-300 md:px-8 md:py-8 ' +
          (expanded ? 'lg:ml-72' : '')
        }
      >
        <Header
          riskLevel={sensor.riskLevel}
          priority={view === 'analysis' ? null : sensor.mlForecast?.priority}
          scenarioLabel={sensor.mlForecast?.scenarioLabel}
          lastUpdated={lastUpdated}
          onRefresh={refresh}
          refreshing={loading}
        />

        <NodeSelector
          nodes={nodes}
          selected={selectedNode}
          current={sensor}
          onSelect={setSelectedNode}
        />

        {error && (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
            Pembaruan terbaru gagal: {error}. Dashboard masih menampilkan data terakhir yang berhasil diterima.
          </div>
        )}

        {view === 'monitoring' && (
          <>
            <SensorOverview sensor={sensor} />

            <div className="mb-4 grid grid-cols-1 items-stretch gap-4 lg:grid-cols-2">
              <WindCard
                speed={sensor.windSpeed}
                direction={sensor.windDirection}
                directionLabel={sensor.windDirectionLabel}
                source={sensor.weatherSource}
                futureSpeed={sensor.mlForecast?.futureWindSpeed}
                sourceSector={sensor.mlForecast?.spread?.sourceSector}
                threatSector={sensor.mlForecast?.spread?.threatSector}
              />

              <FireSpreadCard
                spreadRate={sensor.fireSpread}
                spreadModelStatus={sensor.spreadModelStatus}
                mlSpread={sensor.mlForecast?.spread}
              />
            </div>

            <div className="mb-4">
              <MLPredictionCard
                forecast={sensor.mlForecast}
                sensor={sensor}
              />
            </div>

            <HotspotMap />
          </>
        )}

        {view === 'map' && (
          <HotspotMap height="h-[70vh]" />
        )}

        {view === 'analysis' && (
          <MLPredictionCard
            forecast={sensor.mlForecast}
            sensor={sensor}
          />
        )}

        {view === 'settings' && (
          <section className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="text-base font-semibold text-gray-900">
              Status integrasi
            </h2>

            <div className="mt-4 space-y-2 text-sm text-gray-600">
              <p>
                Node ID: <strong>{sensor.nodeId || '--'}</strong>
              </p>

              <p>
                Timestamp sensor: <strong>{sensor.timestamp || '--'}</strong>
              </p>

              <p>
                Status FRI: <strong>{sensor.friDataStatus}</strong>
              </p>

              <p>
                Status kalibrasi gas: <strong>{sensor.gasCalibrationStatus}</strong>
              </p>

              <p>
                Model ML: <strong>{sensor.mlForecast?.modelVersion || '--'}</strong> (status {sensor.mlForecast?.status})
              </p>

              <p>
                Riwayat yang dipakai model: <strong>{sensor.mlForecast?.historyPoints ?? '--'}</strong> pembacaan / 15 menit
              </p>

              <p>
                Sumber kecepatan angin: <strong>ESP32 Anemometer</strong>
              </p>

              <p>
                Sumber arah angin: <strong>{sensor.weatherSource || 'Open-Meteo'}</strong>
              </p>

              <p>
                Status cuaca: <strong>{sensor.weatherStatus}</strong>
              </p>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}