
import { Wind, Navigation } from 'lucide-react'
import IconBadge from '../ui/IconBadge.jsx'

export default function WindCard({
  speed = null,
  direction = null,
  directionLabel = 'UNKNOWN',
}) {
  const hasSpeed =
    speed !== null &&
    speed !== undefined &&
    speed !== '' &&
    Number.isFinite(Number(speed))

  const hasDirection =
    direction !== null &&
    direction !== undefined &&
    direction !== '' &&
    Number.isFinite(Number(direction))

  const speedValue = hasSpeed ? Number(speed) : null

  const directionValue = hasDirection
    ? ((Number(direction) % 360) + 360) % 360
    : null

  const compassDirections = [
    'N', 'NE', 'E', 'SE',
    'S', 'SW', 'W', 'NW',
  ]

  const calculatedDirection = hasDirection
    ? compassDirections[
        Math.round(directionValue / 45) % 8
      ]
    : 'UNKNOWN'

  const finalDirectionLabel =
    directionLabel &&
    directionLabel !== 'UNKNOWN'
      ? directionLabel
      : calculatedDirection

  return (
    <div className="
      bg-white
      rounded-3xl
      p-5
      shadow-sm
      border
      border-gray-100
      w-full
      max-w-none
      h-full
      flex
      flex-col
      gap-4
    ">

      {/* HEADER */}
      <div className="flex items-center gap-3">
        <IconBadge
          icon={Wind}
          tone="sky"
        />

        <span className="
          text-base
          font-medium
          text-gray-500
        ">
          Angin
        </span>
      </div>

      {/* WIND CONTENT */}
      <div className="
        grid
        grid-cols-2
        gap-3
        items-center
      ">

        {/* LEFT: WIND DIRECTION */}
        <div className="
          min-w-0
          flex
          flex-col
          items-center
          justify-center
          border-r
          border-gray-100
          pr-3
        ">

          <p className="
            text-xs
            text-gray-400
            mb-3
          ">
            Arah angin
          </p>

          <div className="
            flex
            items-center
            justify-center
            gap-2
          ">

            {/* COMPASS */}
            <div className="
              relative
              w-16
              h-16
              sm:w-[72px]
              sm:h-[72px]
              shrink-0
              rounded-full
              border-2
              border-sky-100
              bg-sky-50
              flex
              items-center
              justify-center
            ">

              <span className="
                absolute
                top-1
                text-[9px]
                font-bold
                text-gray-400
              ">
                N
              </span>

              <span className="
                absolute
                bottom-1
                text-[9px]
                font-bold
                text-gray-400
              ">
                S
              </span>

              <span className="
                absolute
                left-1
                text-[9px]
                font-bold
                text-gray-400
              ">
                W
              </span>

              <span className="
                absolute
                right-1
                text-[9px]
                font-bold
                text-gray-400
              ">
                E
              </span>

              {hasDirection && (
                <div
                  className="
                    absolute
                    inset-0
                    flex
                    items-center
                    justify-center
                    transition-transform
                    duration-700
                  "
                  style={{
                    transform: `rotate(${directionValue}deg)`,
                  }}
                >
                  <Navigation
                    size={25}
                    strokeWidth={2.5}
                    className="
                      text-sky-600
                      fill-sky-200
                    "
                  />
                </div>
              )}

              {!hasDirection && (
                <span className="
                  text-gray-300
                  text-xs
                ">
                  --
                </span>
              )}

            </div>

            {/* DIRECTION LABEL */}
            <div className="
              flex
              flex-col
              items-start
              min-w-0
            ">

              <span className="
                text-2xl
                sm:text-3xl
                font-bold
                text-sky-600
                leading-none
              ">
                {hasDirection
                  ? finalDirectionLabel
                  : '--'}
              </span>

              <span className="
                text-xs
                text-gray-500
                mt-2
              ">
                {hasDirection
                  ? `${Math.round(directionValue)}°`
                  : 'Tidak tersedia'}
              </span>

            </div>

          </div>

          <p className="
            text-xs
            text-gray-500
            mt-3
          ">
            Open-Meteo
          </p>

        </div>

        {/* RIGHT: WIND SPEED */}
        <div className="
          min-w-0
          flex
          flex-col
          justify-center
          pl-2
        ">

          <p className="
            text-xs
            text-gray-400
            mb-3
          ">
            Kecepatan angin
          </p>

          <div className="
            flex
            items-end
            gap-1.5
            mb-2
          ">

            <span className="
              text-4xl
              sm:text-5xl
              font-bold
              text-gray-900
              tracking-tight
              leading-none
            ">
              {hasSpeed
                ? speedValue.toFixed(1)
                : '--'}
            </span>

            <span className="
              text-base
              font-medium
              text-gray-500
              mb-1
            ">
              m/s
            </span>

          </div>

          <p className="
            text-xs
            text-gray-500
            leading-5
          ">
            Anemometer ESP32
          </p>

        </div>

      </div>

      {/* DATA SOURCE */}
      <div className="
        border-t
        border-gray-100
        pt-3
        flex
        items-center
        justify-between
        gap-2
      ">

        <span className="
          text-[10px]
          sm:text-xs
          text-gray-400
        ">
          Arah: Open-Meteo
        </span>

        <span className="
          text-[10px]
          sm:text-xs
          text-gray-400
        ">
          Kecepatan: ESP32
        </span>

      </div>

    </div>
  )
}
