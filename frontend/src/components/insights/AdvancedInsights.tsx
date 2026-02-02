import { useMemo } from 'react'
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip, Legend
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { 
  Droplets, Sun, Leaf, ThermometerSun, Gauge, 
  TrendingUp, TrendingDown, Minus, AlertTriangle,
  CloudRain, Wind, Sprout, Target
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Types
interface IndexData {
  NDVI?: number
  EVI?: number
  NDRE?: number
  GNDVI?: number
  SAVI?: number
  LSWI?: number
  NDMI?: number
  LAI?: number
  fPAR?: number
  BSI?: number
  [key: string]: number | undefined
}

interface HealthScore {
  overall_score: number
  greenness_score: number
  vigor_score: number
  nutrient_score: number
  water_score: number
  canopy_score: number
  health_status: string
}

interface StressData {
  water_stress: { level: number; status: string; indicator: string; value: number }
  nutrient_stress: { level: number; status: string; indicator: string; value: number }
  heat_stress: { level: number; status: string; temperature_c?: number }
  vegetation_stress: { level: number; status: string; indicator: string; value: number }
  soil_exposure: { level: number; status: string; indicator: string; value: number }
}

interface YieldEstimate {
  estimated_yield_tha: number
  yield_min: number
  yield_max: number
  confidence: number
  crop_type: string
}

interface WeatherData {
  temperature_c?: number
  precipitation_mm?: number
  humidity_percent?: number
  soil_temp_c?: number
}

// ============================================================================
// HEALTH SCORE GAUGE
// ============================================================================

interface HealthGaugeProps {
  score: number
  label: string
  status: string
  icon?: React.ReactNode
}

export function HealthGauge({ score, label, status, icon }: HealthGaugeProps) {
  const getColor = (score: number) => {
    if (score >= 80) return 'text-green-500'
    if (score >= 65) return 'text-lime-500'
    if (score >= 50) return 'text-yellow-500'
    if (score >= 35) return 'text-orange-500'
    return 'text-red-500'
  }

  const getBgColor = (score: number) => {
    if (score >= 80) return 'bg-green-500'
    if (score >= 65) return 'bg-lime-500'
    if (score >= 50) return 'bg-yellow-500'
    if (score >= 35) return 'bg-orange-500'
    return 'bg-red-500'
  }

  return (
    <div className="flex flex-col items-center p-4 rounded-lg bg-muted/30">
      <div className="relative w-24 h-24 mb-2">
        {/* Background circle */}
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="48"
            cy="48"
            r="40"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            className="text-muted"
          />
          <circle
            cx="48"
            cy="48"
            r="40"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${score * 2.51} 251`}
            className={getColor(score)}
          />
        </svg>
        {/* Score text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn("text-2xl font-bold", getColor(score))}>
            {Math.round(score)}
          </span>
          {icon}
        </div>
      </div>
      <span className="text-sm font-medium">{label}</span>
      <span className={cn("text-xs", getColor(score))}>{status}</span>
    </div>
  )
}

// ============================================================================
// CROP HEALTH DASHBOARD
// ============================================================================

interface CropHealthDashboardProps {
  health: HealthScore
  className?: string
}

export function CropHealthDashboard({ health, className }: CropHealthDashboardProps) {
  const scores = [
    { label: 'Greenness', score: health.greenness_score, icon: <Leaf className="h-3 w-3" /> },
    { label: 'Vigor', score: health.vigor_score, icon: <Sprout className="h-3 w-3" /> },
    { label: 'Nutrient', score: health.nutrient_score, icon: <Target className="h-3 w-3" /> },
    { label: 'Water', score: health.water_score, icon: <Droplets className="h-3 w-3" /> },
    { label: 'Canopy', score: health.canopy_score, icon: <Sun className="h-3 w-3" /> },
  ]

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <Gauge className="h-5 w-5 text-primary" />
          Crop Health Score
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center mb-6">
          <HealthGauge
            score={health.overall_score}
            label="Overall Health"
            status={health.health_status}
            icon={<Leaf className="h-4 w-4 mt-1" />}
          />
        </div>
        
        <div className="grid grid-cols-5 gap-2">
          {scores.map((item) => (
            <div key={item.label} className="text-center">
              <div className="flex items-center justify-center mb-1">
                {item.icon}
              </div>
              <Progress 
                value={item.score} 
                className="h-2 mb-1"
              />
              <span className="text-xs text-muted-foreground">{item.label}</span>
              <span className="text-xs font-medium block">{Math.round(item.score)}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// RADAR CHART FOR INDICES
// ============================================================================

interface IndicesRadarChartProps {
  indices: IndexData
  className?: string
}

export function IndicesRadarChart({ indices, className }: IndicesRadarChartProps) {
  const data = useMemo(() => {
    const normalize = (val: number | undefined, min: number, max: number) => {
      if (val === undefined) return 0
      return Math.max(0, Math.min(100, ((val - min) / (max - min)) * 100))
    }

    return [
      { subject: 'NDVI', value: normalize(indices.NDVI, -1, 1), fullMark: 100 },
      { subject: 'EVI', value: normalize(indices.EVI, -1, 1), fullMark: 100 },
      { subject: 'NDRE', value: normalize(indices.NDRE, -1, 1), fullMark: 100 },
      { subject: 'GNDVI', value: normalize(indices.GNDVI, -1, 1), fullMark: 100 },
      { subject: 'SAVI', value: normalize(indices.SAVI, -1, 1), fullMark: 100 },
      { subject: 'LSWI', value: normalize(indices.LSWI, -1, 1), fullMark: 100 },
    ]
  }, [indices])

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Vegetation Index Profile</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={data}>
              <PolarGrid />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
              <Radar
                name="Indices"
                dataKey="value"
                stroke="#22c55e"
                fill="#22c55e"
                fillOpacity={0.5}
              />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// STRESS INDICATORS
// ============================================================================

interface StressIndicatorsProps {
  stress: StressData
  className?: string
}

export function StressIndicators({ stress, className }: StressIndicatorsProps) {
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'critical': return 'bg-red-500 text-white'
      case 'warning': return 'bg-yellow-500 text-black'
      case 'high': return 'bg-orange-500 text-white'
      case 'moderate': return 'bg-yellow-400 text-black'
      default: return 'bg-green-500 text-white'
    }
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'water': return <Droplets className="h-4 w-4" />
      case 'nutrient': return <Leaf className="h-4 w-4" />
      case 'heat': return <ThermometerSun className="h-4 w-4" />
      case 'vegetation': return <Sprout className="h-4 w-4" />
      case 'soil': return <Target className="h-4 w-4" />
      default: return <AlertTriangle className="h-4 w-4" />
    }
  }

  const stressItems = [
    { 
      type: 'water', 
      label: 'Water Stress', 
      ...stress.water_stress,
      extra: `LSWI: ${stress.water_stress.value?.toFixed(2)}`
    },
    { 
      type: 'nutrient', 
      label: 'Nutrient Stress', 
      ...stress.nutrient_stress,
      extra: `NDRE: ${stress.nutrient_stress.value?.toFixed(2)}`
    },
    { 
      type: 'heat', 
      label: 'Heat Stress', 
      ...stress.heat_stress,
      extra: stress.heat_stress.temperature_c ? `${stress.heat_stress.temperature_c}°C` : 'N/A'
    },
    { 
      type: 'vegetation', 
      label: 'Vegetation Stress', 
      ...stress.vegetation_stress,
      extra: `NDVI: ${stress.vegetation_stress.value?.toFixed(2)}`
    },
  ]

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-yellow-500" />
          Stress Indicators
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {stressItems.map((item) => (
            <div key={item.type} className="flex items-center gap-3">
              <div className="flex items-center gap-2 w-32">
                {getIcon(item.type)}
                <span className="text-sm">{item.label}</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Progress value={item.level} className="h-2 flex-1" />
                  <span className="text-xs w-10 text-right">{Math.round(item.level)}%</span>
                </div>
              </div>
              <span className={cn(
                "text-xs px-2 py-0.5 rounded",
                getStatusColor(item.status)
              )}>
                {item.status}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// YIELD ESTIMATION CARD
// ============================================================================

interface YieldEstimationCardProps {
  yield: YieldEstimate
  className?: string
}

export function YieldEstimationCard({ yield: yieldData, className }: YieldEstimationCardProps) {
  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-green-500" />
          Yield Estimation
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center mb-4">
          <div className="text-4xl font-bold text-primary">
            {yieldData.estimated_yield_tha}
          </div>
          <div className="text-sm text-muted-foreground">tonnes/hectare</div>
          <div className="text-xs text-muted-foreground mt-1">
            Range: {yieldData.yield_min} - {yieldData.yield_max} t/ha
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Crop Type</span>
            <span className="font-medium capitalize">{yieldData.crop_type}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Confidence</span>
            <span className="font-medium">{yieldData.confidence}%</span>
          </div>
          <Progress value={yieldData.confidence} className="h-2" />
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// WEATHER WIDGET
// ============================================================================

interface WeatherWidgetProps {
  weather: WeatherData
  className?: string
}

export function WeatherWidget({ weather, className }: WeatherWidgetProps) {
  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <CloudRain className="h-5 w-5 text-blue-500" />
          Weather Conditions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <ThermometerSun className="h-8 w-8 text-orange-500" />
            <div>
              <div className="text-2xl font-bold">
                {weather.temperature_c?.toFixed(1) ?? '--'}°C
              </div>
              <div className="text-xs text-muted-foreground">Air Temp</div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Droplets className="h-8 w-8 text-blue-500" />
            <div>
              <div className="text-2xl font-bold">
                {weather.precipitation_mm?.toFixed(1) ?? '--'}
              </div>
              <div className="text-xs text-muted-foreground">Precip (mm)</div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Target className="h-8 w-8 text-amber-600" />
            <div>
              <div className="text-2xl font-bold">
                {weather.soil_temp_c?.toFixed(1) ?? '--'}°C
              </div>
              <div className="text-xs text-muted-foreground">Soil Temp</div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Wind className="h-8 w-8 text-gray-500" />
            <div>
              <div className="text-2xl font-bold">
                {weather.humidity_percent?.toFixed(0) ?? '--'}%
              </div>
              <div className="text-xs text-muted-foreground">Humidity</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// INDEX VALUE CARDS
// ============================================================================

interface IndexValueCardsProps {
  indices: IndexData
  className?: string
}

export function IndexValueCards({ indices, className }: IndexValueCardsProps) {
  const indexInfo = [
    { key: 'NDVI', label: 'NDVI', desc: 'Vegetation Health', range: [-1, 1] },
    { key: 'EVI', label: 'EVI', desc: 'Enhanced Vegetation', range: [-1, 1] },
    { key: 'NDRE', label: 'NDRE', desc: 'Chlorophyll Content', range: [-1, 1] },
    { key: 'LAI', label: 'LAI', desc: 'Leaf Area Index', range: [0, 6] },
    { key: 'LSWI', label: 'LSWI', desc: 'Water Content', range: [-1, 1] },
    { key: 'fPAR', label: 'fPAR', desc: 'Light Absorption', range: [0, 1] },
  ]

  const getColor = (key: string, value: number) => {
    const val = value || 0
    if (key === 'LSWI') {
      if (val < 0) return 'text-red-500'
      if (val < 0.1) return 'text-yellow-500'
      return 'text-green-500'
    }
    if (val > 0.6) return 'text-green-500'
    if (val > 0.3) return 'text-yellow-500'
    return 'text-red-500'
  }

  return (
    <div className={cn("grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3", className)}>
      {indexInfo.map((info) => {
        const value = indices[info.key]
        return (
          <Card key={info.key} className="p-3">
            <div className="text-xs text-muted-foreground">{info.desc}</div>
            <div className={cn("text-2xl font-bold", getColor(info.key, value || 0))}>
              {value?.toFixed(2) ?? '--'}
            </div>
            <div className="text-sm font-medium">{info.label}</div>
          </Card>
        )
      })}
    </div>
  )
}

// ============================================================================
// COMPREHENSIVE ANALYSIS VIEW
// ============================================================================

interface ComprehensiveAnalysisProps {
  indices: IndexData
  health: HealthScore
  stress: StressData
  yield: YieldEstimate
  weather: WeatherData
  className?: string
}

export function ComprehensiveAnalysis({
  indices,
  health,
  stress,
  yield: yieldData,
  weather,
  className
}: ComprehensiveAnalysisProps) {
  return (
    <div className={cn("space-y-6", className)}>
      {/* Index Value Summary */}
      <IndexValueCards indices={indices} />
      
      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Health Score */}
        <CropHealthDashboard health={health} />
        
        {/* Radar Chart */}
        <IndicesRadarChart indices={indices} />
        
        {/* Weather */}
        <WeatherWidget weather={weather} />
      </div>
      
      {/* Secondary Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stress Indicators */}
        <StressIndicators stress={stress} />
        
        {/* Yield Estimation */}
        <YieldEstimationCard yield={yieldData} />
      </div>
    </div>
  )
}

export default ComprehensiveAnalysis
