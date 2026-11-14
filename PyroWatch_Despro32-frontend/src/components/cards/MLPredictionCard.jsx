import {
  BrainCircuit,
  TrendingUp,
  TrendingDown,
  Minus,
  Radar,
  Flame,
  ShieldCheck,
  RadioTower,
  AlertCircle,
  Clock3,
} from 'lucide-react'

import IconBadge from '../ui/IconBadge.jsx'


// ============================================================
// RISK STYLE
// ============================================================

const riskStyles = {

  Low:
    'text-forest-700 bg-forest-100 border-forest-200',

  Moderate:
    'text-yellow-800 bg-yellow-50 border-yellow-200',

  High:
    'text-orange-800 bg-orange-50 border-orange-200',

  Extreme:
    'text-red-800 bg-red-50 border-red-200',

  UNKNOWN:
    'text-gray-600 bg-gray-100 border-gray-200',

  Unknown:
    'text-gray-600 bg-gray-100 border-gray-200',

}


// ============================================================
// TREND CONFIGURATION
// ============================================================

const trendConfig = {

  RISING: {

    label: 'Meningkat',

    Icon: TrendingUp,

    style: 'text-red-700 bg-red-50',

  },

  DECLINING: {

    label: 'Menurun',

    Icon: TrendingDown,

    style: 'text-green-700 bg-green-50',

  },

  STABLE: {

    label: 'Relatif stabil',

    Icon: Minus,

    style: 'text-blue-700 bg-blue-50',

  },

}


// ============================================================
// HIGHLIGHT ICONS
// ============================================================

const highlightIcons = {

  risk_level: Flame,

  trend: TrendingUp,

  wind: Radar,

  spread: AlertCircle,

}


// ============================================================
// RECOMMENDATION ITEMS
// ============================================================

const recommendationItems = [

  {

    key: 'monitoring',

    title: 'Deteksi dan Pemantauan Dini',

    Icon: Radar,

    tone: 'text-blue-700 bg-blue-50',

  },

  {

    key: 'early_response',

    title: 'Pencegahan dan Penanganan Awal',

    Icon: Flame,

    tone: 'text-orange-700 bg-orange-50',

  },

  {

    key: 'area_protection',

    title: 'Perlindungan Area dan Keselamatan',

    Icon: ShieldCheck,

    tone: 'text-green-700 bg-green-50',

  },

  {

    key: 'coordination',

    title: 'Koordinasi dan Kesiapsiagaan',

    Icon: RadioTower,

    tone: 'text-violet-700 bg-violet-50',

  },

]


// ============================================================
// FORMAT DATE
// ============================================================

function formatDate(value) {

  if (!value) return null

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return null
  }

  return date.toLocaleString(
    'id-ID',
    {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }
  )

}


// ============================================================
// MAIN COMPONENT
// ============================================================

export default function MLPredictionCard({
  forecast = {},
}) {

  const {

    status = 'UNAVAILABLE',

    horizonMinutes = 15,

    forecastTimestamp,

    insightText,

    riskLevel = 'UNKNOWN',

    trend = 'UNKNOWN',

    highlights = [],

    recommendations = {},

    modelVersion,

    inputStatus,

  } = forecast || {}


  // ----------------------------------------------------------
  // RISK
  // ----------------------------------------------------------

  const riskClass =
    riskStyles[riskLevel] ||
    riskStyles.UNKNOWN


  // ----------------------------------------------------------
  // TREND
  // ----------------------------------------------------------

  const trendInfo =
    trendConfig[trend] || {

      label: 'Belum diketahui',

      Icon: AlertCircle,

      style: 'text-gray-600 bg-gray-100',

    }


  const TrendIcon = trendInfo.Icon


  // ----------------------------------------------------------
  // STATUS
  // ----------------------------------------------------------

  const isAvailable =
    status === 'OK' ||
    status === 'PARTIAL'


  const timestampLabel =
    formatDate(forecastTimestamp)


  // ----------------------------------------------------------
  // RENDER
  // ----------------------------------------------------------

  return (

    <section className="
      bg-white
      rounded-3xl
      p-6
      shadow-sm
      border
      border-gray-100
      flex
      flex-col
      gap-6
    ">


      {/* ====================================================
          HEADER
      ==================================================== */}

      <div className="
        flex
        flex-wrap
        items-center
        justify-between
        gap-3
      ">

        <div className="flex items-center gap-3">

          <IconBadge
            icon={BrainCircuit}
            tone="violet"
          />

          <div>

            <h2 className="
              text-base
              font-semibold
              text-gray-800
            ">
              ML Prediction
            </h2>

            <p className="
              text-xs
              text-gray-500
            ">
              Prediksi kondisi {horizonMinutes} menit ke depan
            </p>

          </div>

        </div>


        <span className={`
          px-3
          py-1.5
          rounded-full
          border
          text-xs
          font-semibold
          ${riskClass}
        `}>

          Risiko {riskLevel}

        </span>

      </div>


      {/* ====================================================
          MAIN PREDICTION
      ==================================================== */}

      <div className="
        rounded-2xl
        border
        border-violet-100
        bg-violet-50/60
        p-4
      ">

        <div className="
          flex
          flex-wrap
          items-center
          justify-between
          gap-2
          mb-2
        ">

          <p className="
            text-xs
            font-bold
            tracking-wide
            text-violet-800
            uppercase
          ">
            Analisis prediksi utama
          </p>


          <span className={`
            inline-flex
            items-center
            gap-1.5
            rounded-full
            px-2.5
            py-1
            text-xs
            font-semibold
            ${trendInfo.style}
          `}>

            <TrendIcon size={14} />

            {trendInfo.label}

          </span>

        </div>


        <p className="
          text-sm
          leading-6
          text-gray-800
        ">

          {insightText ||
            'Insight prediksi belum tersedia. Periksa status API ML dan kelengkapan input sensor.'}

        </p>

      </div>


      {/* ====================================================
          PREDICTION HIGHLIGHTS
      ==================================================== */}

      <div>

        <div className="
          flex
          items-center
          justify-between
          mb-3
        ">

          <h3 className="
            text-sm
            font-semibold
            text-gray-800
          ">
            Prediksi penting
          </h3>


          <span className="
            text-xs
            text-gray-400
          ">
            Horizon {horizonMinutes} menit
          </span>

        </div>


        {highlights.length > 0 ? (

          <div className="
            grid
            grid-cols-1
            sm:grid-cols-2
            xl:grid-cols-4
            gap-3
          ">

            {highlights.map((item, index) => {

              const Icon =
                highlightIcons[item.key] ||
                AlertCircle

              return (

                <article
                  key={item.key || index}
                  className="
                    rounded-2xl
                    border
                    border-gray-100
                    bg-gray-50
                    p-4
                    min-w-0
                  "
                >

                  <div className="
                    flex
                    items-center
                    gap-2
                    text-gray-500
                    mb-2
                  ">

                    <Icon size={16} />

                    <p className="
                      text-xs
                      font-medium
                    ">
                      {item.label || 'Informasi prediksi'}
                    </p>

                  </div>


                  <p className="
                    text-lg
                    font-bold
                    text-gray-900
                    break-words
                  ">

                    {item.value ?? 'Belum tersedia'}

                  </p>


                  {item.detail && (

                    <p className="
                      text-xs
                      text-gray-500
                      leading-5
                      mt-2
                    ">

                      {item.detail}

                    </p>

                  )}

                </article>

              )

            })}

          </div>

        ) : (

          <p className="
            rounded-xl
            bg-gray-50
            border
            border-gray-100
            p-4
            text-sm
            text-gray-500
          ">

            Highlight belum tersedia karena hasil prediksi belum lengkap.

          </p>

        )}

      </div>


      {/* ====================================================
          FOUR OPERATIONAL RECOMMENDATIONS
      ==================================================== */}

      <div>

        <div className="
          flex
          items-center
          justify-between
          gap-3
          mb-3
        ">

          <h3 className="
            text-sm
            font-semibold
            text-gray-800
          ">

            Rekomendasi tindakan operasional

          </h3>


          <span className="
            text-xs
            text-gray-400
          ">

            4 komponen penanganan karhutla

          </span>

        </div>


        <div className="
          grid
          grid-cols-1
          lg:grid-cols-2
          gap-3
        ">

          {recommendationItems.map(({
            key,
            title,
            Icon,
            tone,
          }) => (

            <article
              key={key}
              className="
                rounded-2xl
                border
                border-gray-100
                p-4
                flex
                gap-3
              "
            >

              <div className={`
                h-9
                w-9
                rounded-xl
                flex
                items-center
                justify-center
                shrink-0
                ${tone}
              `}>

                <Icon size={18} />

              </div>


              <div className="min-w-0">

                <h4 className="
                  text-sm
                  font-semibold
                  text-gray-800
                  mb-1
                ">

                  {title}

                </h4>


                <p className="
                  text-sm
                  text-gray-600
                  leading-6
                ">

                  {recommendations?.[key] ||
                    'Rekomendasi belum tersedia. Periksa status prediksi dan data sensor.'}

                </p>

              </div>

            </article>

          ))}

        </div>

      </div>


      {/* ====================================================
          FOOTER / MODEL INFORMATION
      ==================================================== */}

      <div className="
        border-t
        border-gray-100
        pt-3
        flex
        flex-wrap
        items-center
        justify-between
        gap-2
        text-xs
        text-gray-400
      ">


        <div className="
          flex
          items-center
          gap-2
        ">

          <span className={`
            h-2
            w-2
            rounded-full
            ${isAvailable
              ? 'bg-green-500'
              : 'bg-amber-500'}
          `} />

          Status ML: {status}

          {inputStatus
            ? ` · Input: ${inputStatus}`
            : ''}

        </div>


        <div className="
          flex
          items-center
          gap-3
        ">

          {timestampLabel && (

            <span className="
              inline-flex
              items-center
              gap-1
            ">

              <Clock3 size={12} />

              {timestampLabel}

            </span>

          )}


          {modelVersion && (

            <span>
              Model {modelVersion}
            </span>

          )}

        </div>

      </div>

    </section>

  )

}