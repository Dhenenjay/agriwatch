import { Leaf, Droplets, Sprout, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

interface InsightData {
  ndvi: number
  ndre: number
  lswi: number
  savi: number
}

interface InsightCardsProps {
  data: InsightData
}

function getInsightLevel(value: number, thresholds: { low: number; high: number }) {
  if (value < thresholds.low) return 'low'
  if (value > thresholds.high) return 'high'
  return 'moderate'
}

function getInsightColor(level: 'low' | 'moderate' | 'high') {
  switch (level) {
    case 'low':
      return 'text-red-500'
    case 'moderate':
      return 'text-yellow-500'
    case 'high':
      return 'text-green-500'
  }
}

function getProgressColor(level: 'low' | 'moderate' | 'high') {
  switch (level) {
    case 'low':
      return 'bg-red-500'
    case 'moderate':
      return 'bg-yellow-500'
    case 'high':
      return 'bg-green-500'
  }
}

export default function InsightCards({ data }: InsightCardsProps) {
  const insights = [
    {
      title: 'Crop Greenness',
      description: 'Overall vegetation health based on NDVI',
      icon: Leaf,
      value: data.ndvi,
      displayValue: `${(data.ndvi * 100).toFixed(0)}%`,
      level: getInsightLevel(data.ndvi, { low: 0.3, high: 0.6 }),
      interpretation:
        data.ndvi < 0.3
          ? 'Low vegetation density - consider field inspection'
          : data.ndvi > 0.6
          ? 'Healthy dense vegetation'
          : 'Moderate vegetation cover',
    },
    {
      title: 'Nutrient Uptake',
      description: 'Chlorophyll content indicator from NDRE',
      icon: Sprout,
      value: data.ndre,
      displayValue: `${(data.ndre * 100).toFixed(0)}%`,
      level: getInsightLevel(data.ndre, { low: 0.25, high: 0.5 }),
      interpretation:
        data.ndre < 0.25
          ? 'Possible nutrient deficiency detected'
          : data.ndre > 0.5
          ? 'Good nutrient uptake'
          : 'Normal nutrient levels',
    },
    {
      title: 'Water Stress',
      description: 'Moisture content from LSWI analysis',
      icon: Droplets,
      value: Math.max(0, data.lswi), // LSWI can be negative
      displayValue: data.lswi.toFixed(2),
      level: getInsightLevel(data.lswi, { low: 0, high: 0.3 }),
      interpretation:
        data.lswi < 0
          ? 'Water stress detected - irrigation recommended'
          : data.lswi > 0.3
          ? 'Adequate soil moisture'
          : 'Monitor moisture levels',
    },
    {
      title: 'Soil-Adjusted Health',
      description: 'Vegetation health accounting for soil background',
      icon: AlertTriangle,
      value: data.savi,
      displayValue: `${(data.savi * 100).toFixed(0)}%`,
      level: getInsightLevel(data.savi, { low: 0.3, high: 0.6 }),
      interpretation:
        data.savi < 0.3
          ? 'Sparse vegetation with visible soil'
          : data.savi > 0.6
          ? 'Dense canopy cover'
          : 'Moderate vegetation density',
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {insights.map((insight) => {
        const IconComponent = insight.icon
        return (
          <Card key={insight.title}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">
                  {insight.title}
                </CardTitle>
                <IconComponent
                  className={cn('h-5 w-5', getInsightColor(insight.level))}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {insight.description}
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-baseline justify-between">
                  <span
                    className={cn(
                      'text-2xl font-bold',
                      getInsightColor(insight.level)
                    )}
                  >
                    {insight.displayValue}
                  </span>
                  <span
                    className={cn(
                      'text-xs font-medium uppercase',
                      getInsightColor(insight.level)
                    )}
                  >
                    {insight.level}
                  </span>
                </div>
                <div className="relative">
                  <Progress
                    value={insight.value * 100}
                    className="h-2"
                  />
                  <div
                    className={cn(
                      'absolute top-0 left-0 h-2 rounded-full transition-all',
                      getProgressColor(insight.level)
                    )}
                    style={{ width: `${Math.min(100, insight.value * 100)}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {insight.interpretation}
                </p>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
