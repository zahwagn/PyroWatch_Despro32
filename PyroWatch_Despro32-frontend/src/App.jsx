
import { useState } from 'react'

import {
  Thermometer,
  Droplets,
  Wind,
  AlertTriangle,
} from 'lucide-react'

// ============================================================
// LAYOUT COMPONENTS
// ============================================================

import Sidebar from './components/layout/Sidebar.jsx'
import Header from './components/layout/Header.jsx'

// ============================================================
// DASHBOARD CARDS
// ============================================================

import FireRiskCard from './components/cards/FireRiskCard.jsx'
import SensorCard from './components/cards/SensorCard.jsx'
import SoilConditionCard from './components/cards/SoilConditionCard.jsx'
import WindCard from './components/cards/WindCard.jsx'
import FireSpreadCard from './components/cards/FireSpreadCard.jsx'
import MLPredictionCard from './components/cards/MLPredictionCard.jsx'

// ============================================================
// OTHER COMPONENTS
// ============================================================

import HotspotMap from './components/map/HotspotMap.jsx'
import AIAnalysis from './components/ai/AIAnalysis.jsx'

// ============================================================
// SENSOR HOOK
// ============================================================

import { useSensorData } from './hooks/useSensorData.js'

// ============================================================
// FORMAT SENSOR VALUE
// ============================================================

function formatSensorValue(value, digits = 1) {
  if (
    value === null ||
    value === undefined ||
    !Number.isFinite(Number(value))
  ) {
    return '--'
  }

  return Number(value).toFixed(digits)
}

// ============================================================
// MAIN APP
// ============================================================

export default function App() {
  const [view, setView] = useState('monitoring')
  const [expanded, setExpanded] = useState(false)

  // ==========================================================
  // SENSOR DATA
  // ==========================================================

  const {
    sensor,
    ai,
    loading,
    error,
    lastUpdated,
    refresh,
  } = useSensorData(15000)

  // ==========================================================
  // LOADING STATE
  // ==========================================================

  if (loading) {
    return (
      <div className="
        min-h-screen
        flex
        items-center
        justify-center
        bg-forest-50
      ">
        <div className="
          flex
          flex-col
          items-center
          gap-3
        ">
          <div className="
            w-10
            h-10
            rounded-full
            border-2
            border-forest-300
            border-t-forest-600
            animate-spin
          " />

          <p className="
            text-forest-400
            text-sm
          ">
            Memuat data sensor...
          </p>
        </div>
      </div>
    )
  }

  // ==========================================================
  // ERROR STATE
  // ==========================================================

  if (error || !sensor) {
    return (
      <div className="
        min-h-screen
        flex
        items-center
        justify-center
        bg-forest-50
      ">
        <div className="
          bg-white
          rounded-3xl
          p-8
          text-center
          max-w-sm
          shadow-sm
        ">
          <p className="
            text-red-500
            font-semibold
            mb-2
          ">
            Gagal memuat data
          </p>

          <p className="
            text-forest-400
            text-sm
            mb-4
          ">
            {error || 'Data sensor belum tersedia'}
          </p>

          <button
            onClick={refresh}
            className="
              px-4
              py-2
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

  // ============================================================
  // MAIN DASHBOARD
  // ============================================================

  return (
    <div className="
      flex
      min-h-screen
      bg-forest-50
    ">

      {/* ======================================================
          SIDEBAR
      ====================================================== */}

      <Sidebar
        active={view}
        onNavigate={setView}
        expanded={expanded}
        onToggle={() =>
          setExpanded(value => !value)
        }
      />

      {/* ======================================================
          MAIN CONTENT
      ====================================================== */}

      <main
        className={`
          flex-1
          min-w-0
          ml-24
          px-8
          py-8
          w-full
          transition-[margin]
          duration-300
          ease-out
          ${expanded ? 'lg:ml-72' : ''}
        `}
      >

        {/* ==================================================
            HEADER
        ================================================== */}

        <Header
          riskLevel={sensor.riskLevel}
          lastUpdated={lastUpdated}
          onRefresh={refresh}
        />

        {/* ==================================================
            MONITORING PAGE
        ================================================== */}

        {view === 'monitoring' && (
          <>

            {/* ==============================================
                ROW 1
                FIRE RISK + SENSOR + SOIL
            ============================================== */}

            <div className="
              grid
              grid-cols-1
              sm:grid-cols-2
              xl:grid-cols-8
              gap-4
              mb-4
            ">

              {/* FIRE RISK */}

              <FireRiskCard
                index={
                  sensor.fireRiskIndex ?? 0
                }
                riskLevel={
                  sensor.riskLevel
                }
              />

              {/* TEMPERATURE */}

              <SensorCard
                icon={Thermometer}
                tone="orange"
                label="Suhu"
                value={formatSensorValue(
                  sensor.temperature
                )}
                unit="°C"
              />

              {/* HUMIDITY */}

              <SensorCard
                icon={Droplets}
                tone="blue"
                label="Kelembaban"
                value={formatSensorValue(
                  sensor.humidity
                )}
                unit="%"
              />

              {/* CO */}

              <SensorCard
                icon={Wind}
                tone="slate"
                label="CO"
                value={formatSensorValue(
                  sensor.co
                )}
                unit="ppm"
              />

              {/* CH4 */}

              <SensorCard
                icon={AlertTriangle}
                tone="violet"
                label="CH₄"
                value={formatSensorValue(
                  sensor.ch4
                )}
                unit="ppm"
              />

              {/* SOIL CONDITION */}

              <SoilConditionCard
                condition={
                  sensor.soilCondition
                }
                moisture={
                  sensor.soilMoisture
                }
                className="xl:col-span-2"
              />

            </div>

            {/* ==============================================
                ROW 2
                WIND + FIRE SPREAD
            ============================================== */}

            <div className="
              grid
              grid-cols-1
              lg:grid-cols-2
              gap-4
              mb-4
              items-stretch
            ">

              {/* WIND CARD */}

              <div className="w-full min-w-0">
                <WindCard
                  speed={
                    sensor.windSpeed
                  }
                  direction={
                    sensor.windDirection
                  }
                  directionLabel={
                    sensor.windDirectionLabel
                  }
                />
              </div>

              {/* FIRE SPREAD CARD */}

              <div className="w-full min-w-0">
                <FireSpreadCard
                  spreadRate={
                    sensor.fireSpread
                  }
                  direction={null}
                  directionLabel={null}
                />
              </div>

            </div>

            {/* ==============================================
                ROW 3
                ML PREDICTION
            ============================================== */}

            <div className="w-full mb-4">
              <MLPredictionCard
                forecast={
                  sensor.mlForecast
                }
              />
            </div>

            {/* ==============================================
                ROW 4
                HOTSPOT MAP
            ============================================== */}

            <div className="w-full mb-4">
              <HotspotMap />
            </div>

            {/* ==============================================
                ROW 5
                AI RISK ANALYSIS
            ============================================== */}

            <AIAnalysis
              data={ai}
            />

          </>
        )}

        {/* ==================================================
            MAP PAGE
        ================================================== */}

        {view === 'map' && (
          <HotspotMap
            height="h-[70vh]"
          />
        )}

        {/* ==================================================
            AI PAGE
        ================================================== */}

        {view === 'ai' && (
          <AIAnalysis
            data={ai}
          />
        )}

        {/* ==================================================
            SETTINGS PAGE
        ================================================== */}

        {view === 'settings' && (
          <div className="
            bg-white
            rounded-3xl
            p-6
            shadow-sm
            border
            border-gray-100
          ">
            <p className="
              text-base
              text-gray-500
            ">
              Settings is not available yet
            </p>
          </div>
        )}

      </main>
    </div>
  )
}
