import { Flame } from 'lucide-react'
import IconBadge from '../ui/IconBadge.jsx'

export default function FireSpreadCard({
  spreadRate = null,
}) {

  const hasSpread =
    spreadRate !== null &&
    spreadRate !== undefined &&
    Number.isFinite(Number(spreadRate))

  const value = hasSpread
    ? Number(spreadRate)
    : null

  const pct = hasSpread
    ? Math.min(Math.max(value, 0), 100)
    : 0

  const barColor = !hasSpread
    ? 'bg-gray-300'
    : value < 10
      ? 'bg-forest-500'
      : value < 50
        ? 'bg-yellow-400'
        : 'bg-red-500'

  return (

    <div className="
      bg-white
      rounded-3xl
      p-6
      shadow-sm
      border
      border-gray-100
      flex
      flex-col
      gap-4
    ">

      <div className="flex items-center gap-3">

        <IconBadge
          icon={Flame}
          tone="red"
        />

        <span className="
          text-base
          font-medium
          text-gray-500
        ">
          Laju Rambat Api
        </span>

      </div>


      <div className="flex items-end gap-1.5">

        <span className="
          text-5xl
          font-bold
          text-gray-900
          tracking-tight
          leading-none
        ">

          {hasSpread
            ? value.toFixed(2)
            : '--'}

        </span>

        <span className="
          text-lg
          font-medium
          text-gray-500
          mb-1
        ">
          cm/jam
        </span>

      </div>


      <p className="
        text-xs
        leading-5
        text-gray-500
      ">

        Estimasi laju rambat berdasarkan perhitungan model.
        Nilai ini bukan pengukuran langsung di lapangan.

      </p>


      <div className="
        h-2.5
        bg-gray-100
        rounded-full
        overflow-hidden
      ">

        <div
          className={`
            h-full
            rounded-full
            transition-all
            duration-700
            ${barColor}
          `}
          style={{
            width: `${Math.max(pct, hasSpread ? 2 : 0)}%`,
          }}
        />

      </div>

    </div>

  )

}