import { useMemo } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import {
  AlertTriangle, Shield, CloudRain, Bug, Thermometer,
  Droplets, Wind, TrendingDown, AlertCircle, CheckCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Types
interface RiskFactor {
  name: string
  level: number
  status: 'low' | 'moderate' | 'high' | 'critical'
  description: string
  recommendation?: string
}

interface RiskAssessmentData {
  overall_risk: number
  risk_status: string
  factors: {
    drought: RiskFactor
    flood: RiskFactor
    pest: RiskFactor
    disease: RiskFactor
    frost: RiskFactor
    heatwave: RiskFactor
  }
  alerts: Array<{
    type: string
    severity: string
    message: string
    timestamp: string
  }>
}

// ============================================================================
// OVERALL RISK METER
// ============================================================================

interface RiskMeterProps {
  risk: number
  status: string
  className?: string
}

export function RiskMeter({ risk, status, className }: RiskMeterProps) {
  const getColor = (risk: number) => {
    if (risk <= 25) return '#22c55e' // green
    if (risk <= 50) return '#eab308' // yellow
    if (risk <= 75) return '#f97316' // orange
    return '#ef4444' // red
  }

  const segments = [
    { start: 0, end: 25, color: '#22c55e', label: 'Low' },
    { start: 25, end: 50, color: '#eab308', label: 'Moderate' },
    { start: 50, end: 75, color: '#f97316', label: 'High' },
    { start: 75, end: 100, color: '#ef4444', label: 'Critical' },
  ]

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Overall Risk Assessment
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center">
          {/* Semi-circular gauge */}
          <div className="relative w-48 h-24 mb-4">
            <svg viewBox="0 0 200 100" className="w-full h-full">
              {/* Background arc segments */}
              {segments.map((seg, i) => {
                const startAngle = (seg.start / 100) * 180 - 90
                const endAngle = (seg.end / 100) * 180 - 90
                const startRad = (startAngle * Math.PI) / 180
                const endRad = (endAngle * Math.PI) / 180
                const x1 = 100 + 80 * Math.cos(startRad)
                const y1 = 100 + 80 * Math.sin(startRad)
                const x2 = 100 + 80 * Math.cos(endRad)
                const y2 = 100 + 80 * Math.sin(endRad)
                
                return (
                  <path
                    key={i}
                    d={`M ${x1} ${y1} A 80 80 0 0 1 ${x2} ${y2}`}
                    fill="none"
                    stroke={seg.color}
                    strokeWidth="12"
                    strokeOpacity="0.3"
                  />
                )
              })}
              
              {/* Active indicator */}
              <circle
                cx={100 + 80 * Math.cos(((risk / 100) * 180 - 90) * Math.PI / 180)}
                cy={100 + 80 * Math.sin(((risk / 100) * 180 - 90) * Math.PI / 180)}
                r="8"
                fill={getColor(risk)}
                stroke="white"
                strokeWidth="2"
              />
            </svg>
            
            {/* Center text */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-center">
              <div className="text-3xl font-bold" style={{ color: getColor(risk) }}>
                {Math.round(risk)}%
              </div>
              <div className="text-sm text-muted-foreground capitalize">{status}</div>
            </div>
          </div>

          {/* Legend */}
          <div className="flex gap-4 text-xs">
            {segments.map((seg) => (
              <div key={seg.label} className="flex items-center gap-1">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: seg.color }} />
                <span>{seg.label}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// RISK FACTORS BREAKDOWN
// ============================================================================

interface RiskFactorsProps {
  factors: RiskAssessmentData['factors']
  className?: string
}

export function RiskFactors({ factors, className }: RiskFactorsProps) {
  const getIcon = (name: string) => {
    const icons: Record<string, React.ReactNode> = {
      drought: <Droplets className="h-4 w-4" />,
      flood: <CloudRain className="h-4 w-4" />,
      pest: <Bug className="h-4 w-4" />,
      disease: <AlertCircle className="h-4 w-4" />,
      frost: <Thermometer className="h-4 w-4" />,
      heatwave: <Thermometer className="h-4 w-4" />,
    }
    return icons[name] || <AlertTriangle className="h-4 w-4" />
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'low': return 'text-green-500 bg-green-500/10'
      case 'moderate': return 'text-yellow-500 bg-yellow-500/10'
      case 'high': return 'text-orange-500 bg-orange-500/10'
      case 'critical': return 'text-red-500 bg-red-500/10'
      default: return 'text-gray-500 bg-gray-500/10'
    }
  }

  const getProgressColor = (status: string) => {
    switch (status) {
      case 'low': return 'bg-green-500'
      case 'moderate': return 'bg-yellow-500'
      case 'high': return 'bg-orange-500'
      case 'critical': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  const factorList = Object.entries(factors).map(([key, value]) => ({
    key,
    ...value
  }))

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-yellow-500" />
          Risk Factors
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {factorList.map((factor) => (
            <div key={factor.key} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getIcon(factor.key)}
                  <span className="text-sm font-medium capitalize">{factor.name}</span>
                </div>
                <span className={cn(
                  "text-xs px-2 py-0.5 rounded capitalize",
                  getStatusColor(factor.status)
                )}>
                  {factor.status}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn("h-full transition-all", getProgressColor(factor.status))}
                    style={{ width: `${factor.level}%` }}
                  />
                </div>
                <span className="text-xs w-10 text-right">{factor.level}%</span>
              </div>
              <p className="text-xs text-muted-foreground">{factor.description}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// RISK ALERTS
// ============================================================================

interface RiskAlertsProps {
  alerts: RiskAssessmentData['alerts']
  className?: string
}

export function RiskAlerts({ alerts, className }: RiskAlertsProps) {
  const getSeverityIcon = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical': return <AlertCircle className="h-4 w-4 text-red-500" />
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case 'info': return <CheckCircle className="h-4 w-4 text-blue-500" />
      default: return <AlertCircle className="h-4 w-4 text-gray-500" />
    }
  }

  const getSeverityBg = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical': return 'bg-red-500/10 border-red-500/30'
      case 'warning': return 'bg-yellow-500/10 border-yellow-500/30'
      case 'info': return 'bg-blue-500/10 border-blue-500/30'
      default: return 'bg-gray-500/10 border-gray-500/30'
    }
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-red-500" />
          Active Alerts
          {alerts.length > 0 && (
            <span className="ml-auto text-xs bg-red-500 text-white px-2 py-0.5 rounded-full">
              {alerts.length}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <div className="flex items-center gap-2 text-green-500 p-4 bg-green-500/10 rounded-lg">
            <CheckCircle className="h-5 w-5" />
            <span>No active alerts</span>
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert, index) => (
              <div
                key={index}
                className={cn(
                  "p-3 rounded-lg border",
                  getSeverityBg(alert.severity)
                )}
              >
                <div className="flex items-start gap-2">
                  {getSeverityIcon(alert.severity)}
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium capitalize">{alert.type}</span>
                      <span className="text-xs text-muted-foreground">{alert.timestamp}</span>
                    </div>
                    <p className="text-xs mt-1">{alert.message}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================================================
// RISK TREND CHART
// ============================================================================

interface RiskTrendProps {
  data: Array<{ date: string; risk: number }>
  className?: string
}

export function RiskTrend({ data, className }: RiskTrendProps) {
  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Risk Trend (30 Days)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="riskGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="risk"
                stroke="#f97316"
                fill="url(#riskGradient)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// INSURANCE RECOMMENDATION
// ============================================================================

interface InsuranceRecommendationProps {
  riskLevel: number
  cropType: string
  area: number
  className?: string
}

export function InsuranceRecommendation({
  riskLevel,
  cropType,
  area,
  className
}: InsuranceRecommendationProps) {
  const premium = useMemo(() => {
    // Simplified premium calculation
    const baseRate = 0.03 // 3% base rate
    const riskMultiplier = 1 + (riskLevel / 100) * 0.5
    const cropMultiplier = cropType === 'wheat' ? 1.0 : cropType === 'rice' ? 1.1 : 1.2
    const sumInsured = area * 50000 // Rs 50k per hectare
    return Math.round(sumInsured * baseRate * riskMultiplier * cropMultiplier)
  }, [riskLevel, cropType, area])

  const coverage = area * 50000

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Shield className="h-4 w-4 text-blue-500" />
          Crop Insurance Recommendation
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Sum Insured</span>
            <span className="font-medium">₹{coverage.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Est. Premium</span>
            <span className="font-medium text-primary">₹{premium.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Risk Category</span>
            <span className={cn(
              "font-medium",
              riskLevel <= 30 && "text-green-500",
              riskLevel > 30 && riskLevel <= 60 && "text-yellow-500",
              riskLevel > 60 && "text-red-500"
            )}>
              {riskLevel <= 30 ? 'Low' : riskLevel <= 60 ? 'Medium' : 'High'}
            </span>
          </div>
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground">
              Based on current risk assessment, we recommend enrolling in PMFBY 
              (Pradhan Mantri Fasal Bima Yojana) for comprehensive coverage.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// COMPREHENSIVE RISK DASHBOARD
// ============================================================================

interface RiskDashboardProps {
  assessment: RiskAssessmentData
  trendData?: Array<{ date: string; risk: number }>
  cropType?: string
  area?: number
  className?: string
}

export function RiskDashboard({
  assessment,
  trendData,
  cropType = 'wheat',
  area = 10,
  className
}: RiskDashboardProps) {
  return (
    <div className={cn("space-y-6", className)}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <RiskMeter risk={assessment.overall_risk} status={assessment.risk_status} />
        <RiskAlerts alerts={assessment.alerts} className="lg:col-span-2" />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RiskFactors factors={assessment.factors} />
        {trendData && <RiskTrend data={trendData} />}
      </div>
      
      <InsuranceRecommendation
        riskLevel={assessment.overall_risk}
        cropType={cropType}
        area={area}
      />
    </div>
  )
}

export default RiskDashboard
