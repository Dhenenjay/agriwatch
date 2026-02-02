import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getNDVIColor } from '@/lib/utils'

interface DistributionData {
  range: string
  count: number
  percentage: number
  minValue: number
}

interface NDVIDistributionProps {
  data: DistributionData[]
  title?: string
  mean?: number
  stdDev?: number
}

export default function NDVIDistribution({
  data,
  title = 'NDVI Distribution',
  mean,
  stdDev,
}: NDVIDistributionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        {(mean !== undefined || stdDev !== undefined) && (
          <div className="flex gap-4 text-sm text-muted-foreground">
            {mean !== undefined && <span>Mean: {mean.toFixed(3)}</span>}
            {stdDev !== undefined && <span>Std Dev: {stdDev.toFixed(3)}</span>}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="range"
                tick={{ fontSize: 11 }}
                className="text-muted-foreground"
              />
              <YAxis
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
                label={{
                  value: 'Area %',
                  angle: -90,
                  position: 'insideLeft',
                  fontSize: 12,
                }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  borderColor: 'hsl(var(--border))',
                  borderRadius: 'var(--radius)',
                }}
                formatter={(value: number) => [`${value.toFixed(1)}%`, 'Coverage']}
              />
              <Bar dataKey="percentage" radius={[4, 4, 0, 0]}>
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={getNDVIColor(entry.minValue + 0.05)}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Color legend */}
        <div className="mt-4">
          <div className="text-xs text-muted-foreground mb-2">
            Vegetation Health Scale
          </div>
          <div className="flex items-center gap-1">
            <div className="ndvi-scale flex-1 h-4 rounded" />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>Bare/Stressed</span>
            <span>Sparse</span>
            <span>Moderate</span>
            <span>Healthy</span>
            <span>Dense</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
