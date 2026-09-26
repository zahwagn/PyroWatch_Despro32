import {
  BarChart3,
} from 'lucide-react'

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts'


export default function ProbabilityDistributionCard({
  probabilities = {},
}) {

  const data = [
    {
      name: 'Low',
      probability: Number(
        probabilities.Low ?? 0
      ),
    },
    {
      name: 'Moderate',
      probability: Number(
        probabilities.Moderate ?? 0
      ),
    },
    {
      name: 'High',
      probability: Number(
        probabilities.High ?? 0
      ),
    },
    {
      name: 'Extreme',
      probability: Number(
        probabilities.Extreme ?? 0
      ),
    },
  ]


  return (
    <div className="
      bg-white
      rounded-3xl
      p-5
      shadow-sm
      border
      border-forest-50
    ">

      <div className="
        flex
        items-center
        gap-2
        mb-4
      ">

        <BarChart3
          size={16}
          strokeWidth={1.75}
          className="text-forest-400"
        />

        <span className="
          text-sm
          font-medium
          text-forest-500
        ">
          Probability Distribution
        </span>

      </div>


      <ResponsiveContainer
        width="100%"
        height={150}
      >

        <BarChart
          data={data}
          margin={{
            top: 5,
            right: 5,
            left: -20,
            bottom: 0,
          }}
        >

          <XAxis
            dataKey="name"
            tick={{
              fontSize: 10,
            }}
          />

          <YAxis
            domain={[0, 100]}
            tick={{
              fontSize: 10,
            }}
          />

          <Tooltip
            formatter={(value) => [
              `${Number(value).toFixed(2)}%`,
              'Probability',
            ]}
          />

          <Bar
            dataKey="probability"
            fill="#52b788"
            radius={[6, 6, 0, 0]}
          />

        </BarChart>

      </ResponsiveContainer>

    </div>
  )
}