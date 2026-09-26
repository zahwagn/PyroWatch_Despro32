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
import WindCard from './components/cards/WindCard.jsx'
import FireSpreadCard from './components/cards/FireSpreadCard.jsx'

import MLPredictionCard from './components/cards/MLPredictionCard.jsx'
import ProbabilityDistributionCard from './components/cards/ProbabilityDistributionCard.jsx'

import HotspotMap from './components/map/HotspotMap.jsx'
import AIAnalysis from './components/ai/AIAnalysis.jsx'

import { useSensorData } from './hooks/useSensorData.js'


export default function App() {

  const {
    sensor,
    ai,
    loading,
    error,
    lastUpdated,
    refresh,
  } = useSensorData(5000)


  // ==========================================================
  // LOADING
  // ==========================================================

  if (loading) {

    return (
      <div className="min-h-screen flex items-center justify-center bg-forest-50">

        <div className="flex flex-col items-center gap-3">

          <div className="
            w-10 h-10
            rounded-full
            border-2
            border-forest-300
            border-t-forest-600
            animate-spin
          " />

          <p className="text-forest-400 text-sm">
            Memuat data sensor...
          </p>

        </div>

      </div>
    )
  }


  // ==========================================================
  // ERROR
  // ==========================================================

  if (error || !sensor) {

    return (
      <div className="min-h-screen flex items-center justify-center bg-forest-50">

        <div className="
          bg-white
          rounded-3xl
          p-8
          text-center
          max-w-sm
          shadow-sm
        ">

          <p className="text-red-500 font-semibold mb-2">
            Gagal memuat data
          </p>

          <p className="text-forest-400 text-sm mb-4">
            {error || 'Data sensor belum tersedia'}
          </p>

          <button
            onClick={refresh}
            className="
              px-4 py-2
              bg-forest-500
              text-white
              rounded-2xl
              text-sm
            "
          >
            Coba lagi
          </button>

        </div>

      </div>
    )
  }


  // ==========================================================
  // DASHBOARD
  // ==========================================================

  return (

    <div className="flex min-h-screen bg-forest-50">

      <Sidebar />


      <main className="
        flex-1
        ml-16
        px-8
        py-8
        w-full
      ">


        {/* ==================================================
            HEADER
        ================================================== */}

        <Header
          riskLevel={sensor.riskLevel}
          lastUpdated={lastUpdated}
          onRefresh={refresh}
        />


        {/* ==================================================
            ROW 1 — SENSOR + FRI
        ================================================== */}

        <div className="
          grid
          grid-cols-6
          gap-3
          mb-4
        ">

          <FireRiskCard
            index={sensor.fireRiskIndex}
            riskLevel={sensor.riskLevel}
          />

          <SensorCard
            icon={Thermometer}
            label="Suhu"
            value={sensor.temperature.toFixed(1)}
            unit="°C"
          />

          <SensorCard
            icon={Droplets}
            label="Kelembaban"
            value={sensor.humidity.toFixed(1)}
            unit="%"
          />

          <SensorCard
            icon={Wind}
            label="CO"
            value={sensor.co.toFixed(1)}
            unit="ppm"
          />

          <SensorCard
            icon={AlertTriangle}
            label="CH₄"
            value={sensor.ch4.toFixed(1)}
            unit="ppm"
          />

        </div>


        {/* ==================================================
            ROW 2 — WIND + FIRE SPREAD
        ================================================== */}

        <div className="
          grid
          grid-cols-2
          gap-3
          mb-4
        ">

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


        {/* ==================================================
            ROW 3 — MACHINE LEARNING
        ================================================== */}

        <div className="
          grid
          grid-cols-2
          gap-3
          mb-4
        ">

          <MLPredictionCard
            prediction={sensor.mlPrediction}
            confidence={sensor.mlConfidence}
          />

          <ProbabilityDistributionCard
            probabilities={sensor.mlProba}
          />

        </div>


        {/* ==================================================
            ROW 4 — HOTSPOT MAP
        ================================================== */}

        <div className="mb-4">

          <HotspotMap />

        </div>


        {/* ==================================================
            ROW 5 — AI ANALYSIS
        ================================================== */}

        <AIAnalysis data={ai} />

      </main>

    </div>
  )
}