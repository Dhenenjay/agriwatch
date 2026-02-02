import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { 
  Play, Map, Layers, Check, Loader2, 
  AlertCircle, MousePointer, Trash2, Info, 
  Leaf, Droplets, Sun, ThermometerSun, Target
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import FarmMap from '@/components/map/FarmMap'
import { useFarms } from '@/hooks/useApi'
import { useRunComprehensiveAnalysis } from '@/hooks/useAdvancedAnalysis'
import { cn } from '@/lib/utils'

// Crop types for selection
const CROP_TYPES = [
  { value: 'wheat', label: 'Wheat' },
  { value: 'rice', label: 'Rice' },
  { value: 'maize', label: 'Maize' },
  { value: 'cotton', label: 'Cotton' },
  { value: 'sugarcane', label: 'Sugarcane' },
  { value: 'potato', label: 'Potato' },
  { value: 'soybean', label: 'Soybean' },
  { value: 'mustard', label: 'Mustard' },
]

// Index interpretation functions
function interpretNDVI(value: number): { status: string; color: string; description: string } {
  if (value < 0.1) return { status: 'Bare Soil/Water', color: 'text-red-500', description: 'No vegetation detected. Could be fallow land, bare soil, or water body.' }
  if (value < 0.2) return { status: 'Very Low', color: 'text-red-500', description: 'Sparse or stressed vegetation. Possible crop failure or early germination.' }
  if (value < 0.3) return { status: 'Low', color: 'text-orange-500', description: 'Weak vegetation. Young crop or stressed plants needing attention.' }
  if (value < 0.4) return { status: 'Moderate-Low', color: 'text-yellow-500', description: 'Developing vegetation. Early to mid vegetative stage.' }
  if (value < 0.5) return { status: 'Moderate', color: 'text-yellow-500', description: 'Reasonable crop cover. Mid-season growth or recovering plants.' }
  if (value < 0.6) return { status: 'Moderate-High', color: 'text-lime-500', description: 'Good vegetation density. Healthy crop in active growth.' }
  if (value < 0.7) return { status: 'High', color: 'text-green-500', description: 'Very healthy vegetation. Peak growth period with excellent vigor.' }
  return { status: 'Very High', color: 'text-green-600', description: 'Dense, healthy canopy. Excellent crop health and biomass.' }
}

function interpretLSWI(value: number): { status: string; color: string; description: string } {
  if (value < -0.2) return { status: 'Severe Water Stress', color: 'text-red-600', description: 'Critical water deficiency. Immediate irrigation required.' }
  if (value < 0) return { status: 'Water Stress', color: 'text-red-500', description: 'Low water content. Plants showing drought stress signs.' }
  if (value < 0.1) return { status: 'Low Moisture', color: 'text-orange-500', description: 'Below optimal water content. Consider irrigation.' }
  if (value < 0.2) return { status: 'Adequate', color: 'text-yellow-500', description: 'Acceptable water levels. Monitor closely.' }
  if (value < 0.3) return { status: 'Good', color: 'text-green-500', description: 'Good moisture levels. Plants well hydrated.' }
  return { status: 'Excellent', color: 'text-green-600', description: 'Optimal water content. Excellent hydration.' }
}

function interpretNDRE(value: number): { status: string; color: string; description: string } {
  if (value < 0.1) return { status: 'Very Low Chlorophyll', color: 'text-red-500', description: 'Severe nutrient deficiency. Apply fertilizer immediately.' }
  if (value < 0.2) return { status: 'Low Chlorophyll', color: 'text-orange-500', description: 'Nutrient stress detected. Consider foliar application.' }
  if (value < 0.3) return { status: 'Moderate', color: 'text-yellow-500', description: 'Average chlorophyll. Monitor nutrient levels.' }
  if (value < 0.4) return { status: 'Good', color: 'text-green-500', description: 'Healthy chlorophyll levels. Good nutrient uptake.' }
  return { status: 'Excellent', color: 'text-green-600', description: 'Excellent chlorophyll. Optimal nutrient status.' }
}

function interpretLAI(value: number): { status: string; color: string; description: string } {
  if (value < 1) return { status: 'Sparse Canopy', color: 'text-red-500', description: 'Very low leaf area. Early stage or poor stand.' }
  if (value < 2) return { status: 'Low Canopy', color: 'text-orange-500', description: 'Developing canopy. Expected in early growth stages.' }
  if (value < 3) return { status: 'Moderate Canopy', color: 'text-yellow-500', description: 'Moderate leaf coverage. Mid-season growth.' }
  if (value < 4) return { status: 'Good Canopy', color: 'text-green-500', description: 'Good leaf area index. Healthy canopy development.' }
  return { status: 'Dense Canopy', color: 'text-green-600', description: 'Excellent canopy closure. Maximum light interception.' }
}

// Index card component with interpretation
function IndexCard({ 
  name, 
  value, 
  icon: Icon, 
  interpret 
}: { 
  name: string
  value: number
  icon: React.ElementType
  interpret: (v: number) => { status: string; color: string; description: string }
}) {
  const { status, color, description } = interpret(value)
  
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-muted-foreground" />
            <span className="font-medium">{name}</span>
          </div>
          <span className={cn("text-2xl font-bold", color)}>
            {value?.toFixed(2) ?? '--'}
          </span>
        </div>
        <div className={cn("text-sm font-medium mb-1", color)}>{status}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}

export default function Analysis() {
  const [step, setStep] = useState<'select' | 'configure' | 'results'>('select')
  const [selectedGeometry, setSelectedGeometry] = useState<GeoJSON.Polygon | null>(null)
  const [selectedFarmId, setSelectedFarmId] = useState<string | null>(null)
  const [selectedCrop, setSelectedCrop] = useState('wheat')
  
  // Fetch existing farms
  const { data: farms } = useFarms()
  
  // Analysis mutation
  const analysisM = useRunComprehensiveAnalysis()
  
  // Handle polygon draw completion
  const handleDrawComplete = (geometry: GeoJSON.Polygon) => {
    setSelectedGeometry(geometry)
    setSelectedFarmId(null)
  }
  
  // Handle existing farm selection
  const handleFarmSelect = (farmId: string) => {
    const farm = farms?.find(f => f.id === farmId)
    if (farm) {
      setSelectedFarmId(farmId)
      setSelectedGeometry(farm.geometry)
    }
  }
  
  // Clear selection
  const clearSelection = () => {
    setSelectedGeometry(null)
    setSelectedFarmId(null)
  }
  
  // Run analysis
  const runAnalysis = async () => {
    if (!selectedGeometry) return
    
    try {
      await analysisM.mutateAsync({
        farm_id: selectedFarmId || 'custom-area',
        geometry: {
          type: 'Polygon',
          coordinates: selectedGeometry.coordinates
        },
        crop_type: selectedCrop
      })
      setStep('results')
    } catch (err) {
      console.error('Analysis failed:', err)
    }
  }
  
  // Get area in hectares
  const areaHa = useMemo(() => {
    if (!selectedGeometry) return 0
    const coords = selectedGeometry.coordinates[0]
    if (coords.length < 3) return 0
    let area = 0
    for (let i = 0; i < coords.length - 1; i++) {
      area += coords[i][0] * coords[i + 1][1]
      area -= coords[i + 1][0] * coords[i][1]
    }
    area = Math.abs(area) / 2
    const metersPerDegree = 111000 * Math.cos(20 * Math.PI / 180)
    return (area * metersPerDegree * metersPerDegree) / 10000
  }, [selectedGeometry])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Satellite Analysis</h1>
        <p className="text-muted-foreground">
          Analyze vegetation indices using Sentinel-2 imagery via Google Earth Engine
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center justify-center gap-2">
        {[
          { key: 'select', label: '1. Select Area' },
          { key: 'configure', label: '2. Configure' },
          { key: 'results', label: '3. Results' },
        ].map((s, i) => (
          <div key={s.key} className="flex items-center">
            <button
              onClick={() => {
                if (s.key === 'select') setStep('select')
                else if (s.key === 'configure' && selectedGeometry) setStep('configure')
                else if (s.key === 'results' && analysisM.data) setStep('results')
              }}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium transition-colors",
                step === s.key 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {s.label}
            </button>
            {i < 2 && <div className="w-8 h-0.5 bg-muted mx-1" />}
          </div>
        ))}
      </div>

      {/* Step 1: Select Area */}
      {step === 'select' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <Card className="lg:col-span-3">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2">
                <Map className="h-5 w-5" />
                Select Analysis Area
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[500px] relative">
                <FarmMap
                  farms={farms?.map(f => ({
                    id: f.id,
                    name: f.name,
                    geometry: f.geometry,
                    ndvi: f.latest_ndvi
                  })) || []}
                  enableDrawing={true}
                  onDrawComplete={handleDrawComplete}
                  onFarmSelect={handleFarmSelect}
                  selectedFarmId={selectedFarmId || undefined}
                  center={[78.9629, 20.5937]}
                  zoom={5}
                />
                
                {/* Drawing instructions */}
                <div className="absolute top-4 left-16 bg-card/95 backdrop-blur rounded-lg p-3 shadow-lg max-w-xs">
                  <div className="flex items-start gap-2">
                    <MousePointer className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                    <div className="text-xs">
                      <p className="font-medium mb-1">How to draw:</p>
                      <ol className="list-decimal list-inside space-y-0.5 text-muted-foreground">
                        <li>Click the <strong>polygon icon</strong> (top-left)</li>
                        <li>Click on map to add points</li>
                        <li>Double-click to finish</li>
                      </ol>
                      <p className="mt-2 text-muted-foreground">
                        Or click an existing farm polygon
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sidebar */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Selection Status</CardTitle>
              </CardHeader>
              <CardContent>
                {selectedGeometry ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-green-600">
                      <Check className="h-5 w-5" />
                      <span className="font-medium">Area Selected!</span>
                    </div>
                    
                    {selectedFarmId && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Farm: </span>
                        <span className="font-medium">
                          {farms?.find(f => f.id === selectedFarmId)?.name}
                        </span>
                      </div>
                    )}
                    
                    <div className="text-sm">
                      <span className="text-muted-foreground">Area: </span>
                      <span className="font-medium">{areaHa.toFixed(2)} hectares</span>
                    </div>
                    
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full"
                      onClick={clearSelection}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Clear Selection
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <AlertCircle className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Draw a polygon or click a farm
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {farms && farms.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Quick Select Farm</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {farms.slice(0, 6).map(farm => (
                      <button
                        key={farm.id}
                        onClick={() => handleFarmSelect(farm.id)}
                        className={cn(
                          "w-full text-left p-2 rounded-lg text-sm transition-colors",
                          selectedFarmId === farm.id
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted hover:bg-muted/80"
                        )}
                      >
                        <div className="font-medium">{farm.name}</div>
                        <div className="text-xs opacity-70">
                          NDVI: {farm.latest_ndvi?.toFixed(2) || '--'}
                        </div>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <Button 
              className="w-full" 
              size="lg"
              disabled={!selectedGeometry}
              onClick={() => setStep('configure')}
            >
              Continue →
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Configure */}
      {step === 'configure' && (
        <div className="max-w-2xl mx-auto space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers className="h-5 w-5" />
                Analysis Configuration
              </CardTitle>
              <CardDescription>
                Configure parameters for satellite analysis
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <label className="text-sm font-medium mb-2 block">Select Crop Type</label>
                <div className="grid grid-cols-4 gap-2">
                  {CROP_TYPES.map(crop => (
                    <button
                      key={crop.value}
                      onClick={() => setSelectedCrop(crop.value)}
                      className={cn(
                        "p-3 rounded-lg text-sm font-medium transition-colors border",
                        selectedCrop === crop.value
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background hover:bg-muted border-input"
                      )}
                    >
                      {crop.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-muted/50 rounded-lg p-4">
                <h4 className="font-medium mb-2">Analysis Summary</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Area: </span>
                    <span className="font-medium">{areaHa.toFixed(2)} ha</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Crop: </span>
                    <span className="font-medium capitalize">{selectedCrop}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Satellite: </span>
                    <span className="font-medium">Sentinel-2</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Resolution: </span>
                    <span className="font-medium">10m</span>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-blue-700 dark:text-blue-400">
                    Analysis includes:
                  </p>
                  <ul className="mt-1 text-blue-600 dark:text-blue-300 space-y-0.5">
                    <li>• 19 vegetation indices (NDVI, EVI, NDRE, LAI, etc.)</li>
                    <li>• Crop health scoring with qualitative interpretation</li>
                    <li>• Stress detection (water, nutrient, heat)</li>
                    <li>• Yield estimation with confidence interval</li>
                  </ul>
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep('select')}>
                  ← Back
                </Button>
                <Button 
                  className="flex-1" 
                  size="lg"
                  onClick={runAnalysis}
                  disabled={analysisM.isPending}
                >
                  {analysisM.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Analyzing with GEE...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Run Satellite Analysis
                    </>
                  )}
                </Button>
              </div>

              {analysisM.isError && (
                <div className="p-3 bg-red-50 dark:bg-red-950/30 text-red-600 rounded-lg text-sm">
                  Analysis failed. Please try again.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 3: Results */}
      {step === 'results' && analysisM.data && (
        <div className="space-y-6">
          <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-950/30 rounded-lg">
            <Check className="h-6 w-6 text-green-600" />
            <div>
              <p className="font-medium text-green-700 dark:text-green-400">
                Analysis Complete
              </p>
              <p className="text-sm text-green-600 dark:text-green-300">
                Processed at {new Date(analysisM.data.analysis_date).toLocaleString()}
              </p>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4">Key Indices with Interpretation</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <IndexCard 
                name="NDVI (Vegetation)" 
                value={analysisM.data.indices.NDVI || 0}
                icon={Leaf}
                interpret={interpretNDVI}
              />
              <IndexCard 
                name="LSWI (Water)" 
                value={analysisM.data.indices.LSWI || 0}
                icon={Droplets}
                interpret={interpretLSWI}
              />
              <IndexCard 
                name="NDRE (Nutrients)" 
                value={analysisM.data.indices.NDRE || 0}
                icon={Sun}
                interpret={interpretNDRE}
              />
              <IndexCard 
                name="LAI (Canopy)" 
                value={analysisM.data.indices.LAI || 0}
                icon={Target}
                interpret={interpretLAI}
              />
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Crop Health Score</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                <div className="md:col-span-2 flex flex-col items-center justify-center p-6 bg-muted/30 rounded-lg">
                  <div className={cn(
                    "text-5xl font-bold",
                    analysisM.data.health_score.overall_score >= 70 ? "text-green-500" :
                    analysisM.data.health_score.overall_score >= 50 ? "text-yellow-500" : "text-red-500"
                  )}>
                    {Math.round(analysisM.data.health_score.overall_score)}
                  </div>
                  <div className="text-lg font-medium mt-1">
                    {analysisM.data.health_score.health_status}
                  </div>
                  <div className="text-sm text-muted-foreground">Overall Score</div>
                </div>
                
                {[
                  { label: 'Greenness', value: analysisM.data.health_score.greenness_score },
                  { label: 'Vigor', value: analysisM.data.health_score.vigor_score },
                  { label: 'Nutrient', value: analysisM.data.health_score.nutrient_score },
                  { label: 'Water', value: analysisM.data.health_score.water_score },
                ].map(item => (
                  <div key={item.label} className="text-center p-4 bg-muted/30 rounded-lg">
                    <div className="text-2xl font-bold">{Math.round(item.value)}</div>
                    <div className="text-sm text-muted-foreground">{item.label}</div>
                    <Progress value={item.value} className="mt-2 h-1.5" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Yield Estimation</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center mb-4">
                  <div className="text-4xl font-bold text-primary">
                    {analysisM.data.yield_estimation.estimated_yield_tha}
                  </div>
                  <div className="text-sm text-muted-foreground">tonnes/hectare</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Range: {analysisM.data.yield_estimation.yield_min} - {analysisM.data.yield_estimation.yield_max} t/ha
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Confidence</span>
                    <span className="font-medium">{analysisM.data.yield_estimation.confidence}%</span>
                  </div>
                  <Progress value={analysisM.data.yield_estimation.confidence} className="h-2" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recommendations</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {analysisM.data.recommendations.map((rec, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                      <span className="text-sm">{rec}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ThermometerSun className="h-5 w-5" />
                Weather Conditions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <div className="text-2xl font-bold">
                    {analysisM.data.weather.temperature_c?.toFixed(1)}°C
                  </div>
                  <div className="text-xs text-muted-foreground">Temperature</div>
                </div>
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <div className="text-2xl font-bold">
                    {analysisM.data.weather.precipitation_mm?.toFixed(1)} mm
                  </div>
                  <div className="text-xs text-muted-foreground">Precipitation</div>
                </div>
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <div className="text-2xl font-bold">
                    {analysisM.data.weather.soil_temp_c?.toFixed(1)}°C
                  </div>
                  <div className="text-xs text-muted-foreground">Soil Temp</div>
                </div>
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <div className="text-2xl font-bold">
                    {analysisM.data.weather.humidity_percent?.toFixed(0)}%
                  </div>
                  <div className="text-xs text-muted-foreground">Humidity</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => { setStep('select'); analysisM.reset(); }}>
              New Analysis
            </Button>
            <Button variant="outline" asChild>
              <Link to="/farms">View All Farms</Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
