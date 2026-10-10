import { useState } from 'react'
import {
  Thermometer,
  Droplets,
  Wind,
  AlertTriangle,
} from 'lucide-react'

import Sidebar from './components/layout/Sidebar.jsx'
import Header from './components/layout/Header.jsx'

import FireRiskCard from './components/cards/FireRiskCard.jsx'
import SensorCard from './components/cards/SensorCard.jsx'
import SoilConditionCard from './components/cards/SoilConditionCard.jsx'
import WindCard from './components/cards/WindCard.jsx'
import FireSpreadCard from './components/cards/FireSpreadCard.jsx'

import MLPredictionCard from './components/cards/MLPredictionCard.jsx'
import ProbabilityDistributionCard from './components/cards/ProbabilityDistributionCard.jsx'

import HotspotMap from './components/map/HotspotMap.jsx'
import AIAnalysis from './components/ai/AIAnalysis.jsx'

import { useSensorData } from './hooks/useSensorData.js'

export default function App() {
  const [view, setView] = useState('monitoring')
  const [expanded, setExpanded] = useState(false)

  const {
    sensor,
    ai,
    loading,
    error,
    lastUpdated,
    refresh,
  } = useSensorData(5000)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-forest-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-forest-300 border-t-forest-600 animate-spin" />
          <p className="text-forest-400 text-sm">Memuat data sensor...</p>
        </div>
      </div>
    )
  }

  if (error || !sensor) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-forest-50">
        <div className="bg-white rounded-3xl p-8 text-center max-w-sm shadow-sm">
          <p className="text-red-500 font-semibold mb-2">Gagal memuat data</p>
          <p className="text-forest-400 text-sm mb-4">
            {error || 'Data sensor belum tersedia'}
          </p>
          <button
            onClick={refresh}
            className="px-4 py-2 bg-forest-500 text-white rounded-2xl text-sm"
          >
            Coba lagi
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-forest-50">
      <Sidebar
        active={view}
        onNavigate={setView}
        expanded={expanded}
        onToggle={() => setExpanded((v) => !v)}
      />

      <main
        className={`flex-1 min-w-0 ml-24 px-8 py-8 w-full transition-[margin] duration-300 ease-out ${
          expanded ? 'lg:ml-72' : ''
        }`}
      >
        <Header
          riskLevel={sensor.riskLevel}
          lastUpdated={lastUpdated}
          onRefresh={refresh}
        />

        {view === 'monitoring' && (
          <>
            {/* ROW 1 — RISK + SENSOR + SOIL CONDITION */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-7 gap-4 mb-4">
              <FireRiskCard
                index={sensor.fireRiskIndex}
                riskLevel={sensor.riskLevel}
              />

              <SensorCard
                icon={Thermometer}
                tone="orange"
                label="Suhu"
                value={sensor.temperature.toFixed(1)}
                unit="°C"
              />

              <SensorCard
                icon={Droplets}
                tone="blue"
                label="Kelembaban"
                value={sensor.humidity.toFixed(1)}
                unit="%"
              />

              <SensorCard
                icon={Wind}
                tone="slate"
                label="CO"
                value={sensor.co.toFixed(1)}
                unit="ppm"
              />

              <SensorCard
                icon={AlertTriangle}
                tone="violet"
                label="CH₄"
                value={sensor.ch4.toFixed(1)}
                unit="ppm"
              />

              <SoilConditionCard
                condition={sensor.soilCondition}
                moisture={sensor.soilMoisture}
              />
            </div>

            {/* ROW 2 — WIND + FIRE SPREAD */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
              <WindCard
                speed={sensor.windSpeed}
                direction={sensor.windDirection}
                directionLabel={sensor.windDirectionLabel}
              />

              <FireSpreadCard
                spreadRate={sensor.fireSpread}
                direction={sensor.windDirection}
                directionLabel={sensor.windDirectionLabel}
              />
            </div>

            {/* ROW 3 — MACHINE LEARNING */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
              <MLPredictionCard
                prediction={sensor.mlPrediction}
                confidence={sensor.mlConfidence}
              />

              <ProbabilityDistributionCard
                probabilities={sensor.mlProba}
              />
            </div>

            {/* ROW 4 — HOTSPOT MAP */}
            <div className="mb-4">
              <HotspotMap />
            </div>

            {/* ROW 5 — AI ANALYSIS */}
            <AIAnalysis data={ai} />
          </>
        )}

        {view === 'map' && <HotspotMap height="h-[70vh]" />}

        {view === 'ai' && <AIAnalysis data={ai} />}

        {view === 'settings' && (
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
            <p className="text-base text-gray-500">Settings is not available yet</p>
          </div>
        )}
      </main>
    </div>
  )
}
