import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Sprout, Leaf, Sun, Wheat, CheckCircle2,
  Circle
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Crop growth stages
const CROP_STAGES = [
  { 
    id: 'germination', 
    name: 'Germination', 
    icon: Sprout,
    description: 'Seed emergence',
    color: 'text-lime-400'
  },
  { 
    id: 'vegetative', 
    name: 'Vegetative', 
    icon: Leaf,
    description: 'Leaf development',
    color: 'text-green-500'
  },
  { 
    id: 'reproductive', 
    name: 'Reproductive', 
    icon: Sun,
    description: 'Flowering stage',
    color: 'text-emerald-500'
  },
  { 
    id: 'maturity', 
    name: 'Maturity', 
    icon: Wheat,
    description: 'Grain filling',
    color: 'text-amber-500'
  },
  { 
    id: 'senescence', 
    name: 'Senescence', 
    icon: CheckCircle2,
    description: 'Harvest ready',
    color: 'text-yellow-600'
  },
]

interface CropStageData {
  current_stage: string
  stage_confidence: number
  days_in_stage: number
  estimated_days_to_next: number
  growth_rate: string
  phenology_score: number
}

interface CropStageIndicatorProps {
  stageData: CropStageData
  cropType?: string
  className?: string
}

export function CropStageIndicator({ 
  stageData, 
  cropType = 'wheat',
  className 
}: CropStageIndicatorProps) {
  const currentStageIndex = useMemo(() => {
    return CROP_STAGES.findIndex(s => 
      s.id.toLowerCase() === stageData.current_stage.toLowerCase()
    )
  }, [stageData.current_stage])

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <Sprout className="h-5 w-5 text-green-500" />
          Crop Growth Stage
          <span className="text-sm font-normal text-muted-foreground ml-auto">
            {cropType}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Stage Progress */}
        <div className="relative mb-6">
          <div className="absolute top-5 left-0 right-0 h-1 bg-muted rounded-full">
            <div 
              className="absolute top-0 left-0 h-full bg-green-500 rounded-full transition-all duration-500"
              style={{ 
                width: `${((currentStageIndex + 1) / CROP_STAGES.length) * 100}%` 
              }}
            />
          </div>
          
          <div className="relative flex justify-between">
            {CROP_STAGES.map((stage, index) => {
              const Icon = stage.icon
              const isActive = index === currentStageIndex
              const isPast = index < currentStageIndex
              
              return (
                <div key={stage.id} className="flex flex-col items-center">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center transition-all",
                    isActive && "bg-green-500 text-white scale-110 shadow-lg",
                    isPast && "bg-green-500/20 text-green-500",
                    !isActive && !isPast && "bg-muted text-muted-foreground"
                  )}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className={cn(
                    "text-xs mt-2 text-center",
                    isActive && "font-semibold text-green-500",
                    !isActive && "text-muted-foreground"
                  )}>
                    {stage.name}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        <div className="bg-muted/30 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Current Stage</span>
            <span className="font-semibold text-green-500 capitalize">
              {stageData.current_stage}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Confidence</span>
            <span className="font-medium">{stageData.stage_confidence}%</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Days in Stage</span>
            <span className="font-medium">{stageData.days_in_stage} days</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Est. Days to Next</span>
            <span className="font-medium">{stageData.estimated_days_to_next} days</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Growth Rate</span>
            <span className={cn(
              "font-medium capitalize",
              stageData.growth_rate === 'fast' && "text-green-500",
              stageData.growth_rate === 'normal' && "text-blue-500",
              stageData.growth_rate === 'slow' && "text-yellow-500"
            )}>
              {stageData.growth_rate}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

interface PhenologyEvent {
  date: string
  stage: string
  ndvi: number
  notes?: string
}

interface PhenologyTimelineProps {
  events: PhenologyEvent[]
  className?: string
}

export function PhenologyTimeline({ events, className }: PhenologyTimelineProps) {
  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Phenology Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {events.map((event, index) => (
            <div key={index} className="flex gap-4">
              <div className="flex flex-col items-center">
                <Circle className={cn(
                  "h-3 w-3",
                  index === 0 && "fill-green-500 text-green-500",
                  index !== 0 && "fill-muted text-muted"
                )} />
                {index < events.length - 1 && (
                  <div className="w-0.5 h-full bg-muted mt-1" />
                )}
              </div>
              <div className="flex-1 pb-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium capitalize">{event.stage}</span>
                  <span className="text-xs text-muted-foreground">{event.date}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  NDVI: {event.ndvi.toFixed(2)}
                </div>
                {event.notes && (
                  <div className="text-xs text-muted-foreground mt-1">{event.notes}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

interface GrowthCalendarProps {
  sowingDate: string
  expectedHarvest: string
  currentStage: string
  cropType: string
  className?: string
}

export function GrowthCalendar({
  sowingDate,
  expectedHarvest,
  currentStage,
  cropType,
  className
}: GrowthCalendarProps) {
  const sowDate = new Date(sowingDate)
  const harvestDate = new Date(expectedHarvest)
  const today = new Date()
  
  const totalDays = Math.ceil((harvestDate.getTime() - sowDate.getTime()) / (1000 * 60 * 60 * 24))
  const elapsedDays = Math.ceil((today.getTime() - sowDate.getTime()) / (1000 * 60 * 60 * 24))
  const remainingDays = totalDays - elapsedDays
  const progress = Math.min(100, Math.max(0, (elapsedDays / totalDays) * 100))

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          Growth Calendar
          <span className="text-xs font-normal text-muted-foreground ml-auto capitalize">
            {cropType}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>Sowing: {sowingDate}</span>
              <span>Harvest: {expectedHarvest}</span>
            </div>
            <div className="h-4 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-green-400 to-amber-500 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-muted/30 rounded-lg p-2">
              <div className="text-2xl font-bold text-green-500">{elapsedDays}</div>
              <div className="text-xs text-muted-foreground">Days Elapsed</div>
            </div>
            <div className="bg-muted/30 rounded-lg p-2">
              <div className="text-2xl font-bold text-amber-500">{remainingDays}</div>
              <div className="text-xs text-muted-foreground">Days Remaining</div>
            </div>
            <div className="bg-muted/30 rounded-lg p-2">
              <div className="text-2xl font-bold">{Math.round(progress)}%</div>
              <div className="text-xs text-muted-foreground">Complete</div>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-green-500/10 rounded-lg p-3">
            <Sprout className="h-5 w-5 text-green-500" />
            <div>
              <div className="text-sm font-medium">Current: {currentStage}</div>
              <div className="text-xs text-muted-foreground">On track for estimated harvest</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default CropStageIndicator
