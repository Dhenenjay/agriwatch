import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { format } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface DataPoint {
  date: string
  ndvi?: number
  ndre?: number
  lswi?: number
  savi?: number
}

interface IndexTimeSeriesProps {
  data: DataPoint[]
  indices?: ('ndvi' | 'ndre' | 'lswi' | 'savi')[]
  title?: string
}

const indexConfig = {
  ndvi: { color: '#22c55e', name: 'NDVI', description: 'Crop Greenness' },
  ndre: { color: '#8b5cf6', name: 'NDRE', description: 'Nutrient Uptake' },
  lswi: { color: '#3b82f6', name: 'LSWI', description: 'Water Content' },
  savi: { color: '#f59e0b', name: 'SAVI', description: 'Soil-Adjusted VI' },
}

export default function IndexTimeSeries({
  data,
  indices = ['ndvi'],
  title = 'Vegetation Index Time Series',
}: IndexTimeSeriesProps) {
  const formattedData = data.map((d) => ({
    ...d,
    dateFormatted: format(new Date(d.date), 'MMM d'),
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={formattedData}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="dateFormatted"
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
              />
              <YAxis
                domain={[0, 1]}
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  borderColor: 'hsl(var(--border))',
                  borderRadius: 'var(--radius)',
                }}
                labelFormatter={(label) => `Date: ${label}`}
                formatter={(value: number, name: string) => [
                  value.toFixed(3),
                  indexConfig[name as keyof typeof indexConfig]?.name || name,
                ]}
              />
              <Legend
                formatter={(value) =>
                  indexConfig[value as keyof typeof indexConfig]?.name || value
                }
              />
              
              {/* Reference lines for common thresholds */}
              <ReferenceLine
                y={0.2}
                stroke="#ef4444"
                strokeDasharray="5 5"
                label={{ value: 'Stress', position: 'right', fontSize: 10 }}
              />
              <ReferenceLine
                y={0.6}
                stroke="#22c55e"
                strokeDasharray="5 5"
                label={{ value: 'Healthy', position: 'right', fontSize: 10 }}
              />

              {indices.map((index) => (
                <Line
                  key={index}
                  type="monotone"
                  dataKey={index}
                  stroke={indexConfig[index].color}
                  strokeWidth={2}
                  dot={{ fill: indexConfig[index].color, strokeWidth: 0, r: 4 }}
                  activeDot={{ r: 6 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Index descriptions */}
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2">
          {indices.map((index) => (
            <div
              key={index}
              className="flex items-center gap-2 text-sm"
            >
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: indexConfig[index].color }}
              />
              <span className="text-muted-foreground">
                {indexConfig[index].description}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
