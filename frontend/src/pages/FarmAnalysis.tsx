/**
 * Farm Analysis Page
 * Comprehensive analysis dashboard with advanced insights
 */
import { useState, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { 
  ArrowLeft, RefreshCw, Download, Loader2, 
  Satellite, AlertCircle, CheckCircle2, Leaf
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from '@/components/ui/select'

// Components
import { 
  ComprehensiveAnalysis,
  CropHealthDashboard,
  IndicesRadarChart,
  StressIndicators,
  YieldEstimationCard,
  WeatherWidget,
  IndexValueCards
} from '@/components/insights/AdvancedInsights'
import { 
  CropStageIndicator, 
  GrowthCalendar 
} from '@/components/insights/CropStageIndicator'
import { RiskDashboard } from '@/components/insights/RiskAssessment'

// Hooks
import { useFarm } from '@/hooks/useApi'
import { 
  useRunComprehensiveAnalysis,
  useRiskAssessment,
  useAdvancedTimeSeries,
  createAnalysisRequest
} from '@/hooks/useAdvancedAnalysis'

// Crop type options
const CROP_TYPES = [
  { value: 'wheat', label: 'Wheat' },
  { value: 'rice', label: 'Rice (Paddy)' },
  { value: 'maize', label: 'Maize (Corn)' },
  { value: 'cotton', label: 'Cotton' },
  { value: 'sugarcane', label: 'Sugarcane' },
  { value: 'potato', label: 'Potato' },
  { value: 'soybean', label: 'Soybean' },
  { value: 'mustard', label: 'Mustard' },
]

export default function FarmAnalysis() {
  const { id } = useParams<{ id: string }>()
  const [selectedCrop, setSelectedCrop] = useState('wheat')
  const [activeTab, setActiveTab] = useState('overview')
  
  // Fetch farm data
  const { data: farm, isLoading: farmLoading } = useFarm(id || '')
  
  // Analysis mutation
  const analysisM = useRunComprehensiveAnalysis()
  
  // Risk assessment
  const { data: riskData } = useRiskAssessment(id || null)
  
  // Time series
  const { data: timeSeriesData } = useAdvancedTimeSeries(id || null, 'NDVI', 90)
  
  // Create analysis request
  const analysisRequest = useMemo(() => {
    if (!farm || !id) return null
    
    // Create a sample polygon from farm center (in real app, use actual boundary)
    const center = farm.center || [75.8, 30.9]
    const offset = 0.01 // ~1km
    const polygon: [number, number][][] = [[
      [center[0] - offset, center[1] - offset],
      [center[0] + offset, center[1] - offset],
      [center[0] + offset, center[1] + offset],
      [center[0] - offset, center[1] + offset],
      [center[0] - offset, center[1] - offset],
    ]]
    
    return createAnalysisRequest(
      id,
      { type: 'Polygon', coordinates: polygon },
      selectedCrop
    )
  }, [farm, id, selectedCrop])
  
  // Run analysis
  const runAnalysis = () => {
    if (analysisRequest) {
      analysisM.mutate(analysisRequest)
    }
  }
  
  // Prepare risk trend data
  const riskTrendData = useMemo(() => {
    if (!timeSeriesData) return undefined
    return timeSeriesData.data.map(d => ({
      date: d.date.slice(5), // MM-DD format
      risk: Math.max(0, 100 - d.value * 100) // Inverse of NDVI as risk proxy
    }))
  }, [timeSeriesData])
  
  if (farmLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }
  
  if (!farm) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <AlertCircle className="h-12 w-12 text-red-500" />
        <p className="text-lg">Farm not found</p>
        <Link to="/farms">
          <Button>Back to Farms</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to={`/farms/${id}`}>
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-bold">{farm.name}</h1>
                <p className="text-sm text-muted-foreground">
                  Advanced Analysis Dashboard
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Select value={selectedCrop} onValueChange={setSelectedCrop}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Select crop" />
                </SelectTrigger>
                <SelectContent>
                  {CROP_TYPES.map(crop => (
                    <SelectItem key={crop.value} value={crop.value}>
                      {crop.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Button 
                onClick={runAnalysis} 
                disabled={analysisM.isPending}
              >
                {analysisM.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Satellite className="h-4 w-4 mr-2" />
                )}
                Run Analysis
              </Button>
            </div>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {/* Status Banner */}
        {analysisM.isSuccess && (
          <div className="mb-6 flex items-center gap-2 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            <span>Analysis completed successfully</span>
            <span className="text-sm text-muted-foreground ml-auto">
              {new Date(analysisM.data.analysis_date).toLocaleString()}
            </span>
          </div>
        )}
        
        {analysisM.isError && (
          <div className="mb-6 flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <span>Analysis failed. Please try again.</span>
          </div>
        )}
        
        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="indices">Vegetation Indices</TabsTrigger>
            <TabsTrigger value="growth">Growth & Phenology</TabsTrigger>
            <TabsTrigger value="risk">Risk Assessment</TabsTrigger>
          </TabsList>
          
          {/* Overview Tab */}
          <TabsContent value="overview">
            {analysisM.data ? (
              <ComprehensiveAnalysis
                indices={analysisM.data.indices}
                health={analysisM.data.health_score}
                stress={analysisM.data.stress_detection}
                yield={analysisM.data.yield_estimation}
                weather={analysisM.data.weather}
              />
            ) : (
              <Card className="p-12">
                <div className="flex flex-col items-center justify-center text-center gap-4">
                  <Satellite className="h-16 w-16 text-muted-foreground" />
                  <div>
                    <h3 className="text-lg font-semibold">No Analysis Data</h3>
                    <p className="text-muted-foreground">
                      Click "Run Analysis" to fetch satellite data and generate insights
                    </p>
                  </div>
                  <Button onClick={runAnalysis} disabled={analysisM.isPending}>
                    {analysisM.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Satellite className="h-4 w-4 mr-2" />
                    )}
                    Run Analysis
                  </Button>
                </div>
              </Card>
            )}
            
            {/* Recommendations */}
            {analysisM.data?.recommendations && analysisM.data.recommendations.length > 0 && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Leaf className="h-5 w-5 text-green-500" />
                    Recommendations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {analysisM.data.recommendations.map((rec, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                        <span className="text-sm">{rec}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          {/* Indices Tab */}
          <TabsContent value="indices">
            {analysisM.data ? (
              <div className="space-y-6">
                <IndexValueCards indices={analysisM.data.indices} />
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <IndicesRadarChart indices={analysisM.data.indices} />
                  <CropHealthDashboard health={analysisM.data.health_score} />
                </div>
                
                {/* Index Descriptions */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Index Reference Guide</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                      <div>
                        <strong>NDVI</strong>
                        <p className="text-muted-foreground">Normalized Difference Vegetation Index - Overall vegetation health</p>
                      </div>
                      <div>
                        <strong>EVI</strong>
                        <p className="text-muted-foreground">Enhanced Vegetation Index - Reduced atmospheric interference</p>
                      </div>
                      <div>
                        <strong>NDRE</strong>
                        <p className="text-muted-foreground">Normalized Difference Red Edge - Chlorophyll content</p>
                      </div>
                      <div>
                        <strong>LSWI</strong>
                        <p className="text-muted-foreground">Land Surface Water Index - Plant water content</p>
                      </div>
                      <div>
                        <strong>LAI</strong>
                        <p className="text-muted-foreground">Leaf Area Index - Canopy density (0-6)</p>
                      </div>
                      <div>
                        <strong>fPAR</strong>
                        <p className="text-muted-foreground">Fraction of Photosynthetically Active Radiation</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card className="p-12 text-center">
                <p className="text-muted-foreground">Run analysis to view vegetation indices</p>
              </Card>
            )}
          </TabsContent>
          
          {/* Growth Tab */}
          <TabsContent value="growth">
            {analysisM.data ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <CropStageIndicator 
                  stageData={analysisM.data.crop_stage}
                  cropType={selectedCrop}
                />
                <GrowthCalendar
                  sowingDate="2025-11-15"
                  expectedHarvest="2026-04-15"
                  currentStage={analysisM.data.crop_stage.current_stage}
                  cropType={selectedCrop}
                />
                <StressIndicators stress={analysisM.data.stress_detection} />
                <YieldEstimationCard yield={analysisM.data.yield_estimation} />
              </div>
            ) : (
              <Card className="p-12 text-center">
                <p className="text-muted-foreground">Run analysis to view growth data</p>
              </Card>
            )}
          </TabsContent>
          
          {/* Risk Tab */}
          <TabsContent value="risk">
            {riskData ? (
              <RiskDashboard
                assessment={riskData}
                trendData={riskTrendData}
                cropType={selectedCrop}
                area={farm.area || 10}
              />
            ) : (
              <Card className="p-12 text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                <p className="text-muted-foreground">Loading risk assessment...</p>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
