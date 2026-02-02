import { useState } from 'react'
import { Play, Calendar, Map, Layers, Check, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import FarmMap from '@/components/map/FarmMap'

type AnalysisStep = 'select-area' | 'configure' | 'processing' | 'complete'

const indices = [
  { id: 'ndvi', name: 'NDVI', description: 'Normalized Difference Vegetation Index - Crop greenness', default: true },
  { id: 'ndre', name: 'NDRE', description: 'Normalized Difference Red Edge - Nutrient uptake', default: true },
  { id: 'lswi', name: 'LSWI', description: 'Land Surface Water Index - Water stress', default: true },
  { id: 'savi', name: 'SAVI', description: 'Soil-Adjusted Vegetation Index', default: false },
]

export default function Analysis() {
  const [step, setStep] = useState<AnalysisStep>('select-area')
  const [selectedGeometry, setSelectedGeometry] = useState<GeoJSON.Polygon | null>(null)
  const [selectedIndices, setSelectedIndices] = useState<string[]>(
    indices.filter(i => i.default).map(i => i.id)
  )
  const [dateRange, setDateRange] = useState({
    start: '2024-01-01',
    end: '2024-02-05',
  })
  const [progress, setProgress] = useState(0)

  const handleDrawComplete = (geometry: GeoJSON.Polygon) => {
    setSelectedGeometry(geometry)
  }

  const startAnalysis = () => {
    setStep('processing')
    setProgress(0)
    
    // Simulate processing
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval)
          setStep('complete')
          return 100
        }
        return prev + 10
      })
    }, 500)
  }

  const toggleIndex = (indexId: string) => {
    setSelectedIndices(prev =>
      prev.includes(indexId)
        ? prev.filter(id => id !== indexId)
        : [...prev, indexId]
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Run Analysis</h1>
        <p className="text-muted-foreground">
          Analyze vegetation indices for your farms using Sentinel-2 satellite imagery
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-center gap-4">
        {['select-area', 'configure', 'processing', 'complete'].map((s, i) => (
          <div key={s} className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step === s
                  ? 'bg-primary text-primary-foreground'
                  : ['select-area', 'configure', 'processing', 'complete'].indexOf(step) > i
                  ? 'bg-primary/20 text-primary'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {['select-area', 'configure', 'processing', 'complete'].indexOf(step) > i ? (
                <Check className="h-4 w-4" />
              ) : (
                i + 1
              )}
            </div>
            {i < 3 && (
              <div
                className={`w-16 h-1 mx-2 ${
                  ['select-area', 'configure', 'processing', 'complete'].indexOf(step) > i
                    ? 'bg-primary'
                    : 'bg-muted'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      {step === 'select-area' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Map className="h-5 w-5" />
                Select Analysis Area
              </CardTitle>
              <CardDescription>
                Draw a polygon on the map to define your analysis area, or select an existing farm
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[500px]">
                <FarmMap
                  enableDrawing={true}
                  onDrawComplete={handleDrawComplete}
                  center={[78.9629, 20.5937]}
                  zoom={5}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Instructions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-medium">Draw Area</h4>
                <p className="text-sm text-muted-foreground">
                  Use the polygon tool in the map to draw the area you want to analyze.
                  Click to add points and double-click to finish.
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium">Or Select Existing Farm</h4>
                <p className="text-sm text-muted-foreground">
                  Choose from your registered farms to quickly analyze their areas.
                </p>
              </div>
              {selectedGeometry && (
                <div className="p-3 bg-primary/10 rounded-lg">
                  <p className="text-sm font-medium text-primary">
                    ✓ Area selected
                  </p>
                </div>
              )}
              <Button
                className="w-full"
                disabled={!selectedGeometry}
                onClick={() => setStep('configure')}
              >
                Continue
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {step === 'configure' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Date Range
              </CardTitle>
              <CardDescription>
                Select the time period for satellite imagery analysis
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Start Date</label>
                  <input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 rounded-md border bg-background"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">End Date</label>
                  <input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 rounded-md border bg-background"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Note: Sentinel-2 has a 5-day revisit time. Cloudy images will be filtered automatically.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers className="h-5 w-5" />
                Vegetation Indices
              </CardTitle>
              <CardDescription>
                Select which indices to calculate
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {indices.map((index) => (
                <label
                  key={index.id}
                  className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50"
                >
                  <input
                    type="checkbox"
                    checked={selectedIndices.includes(index.id)}
                    onChange={() => toggleIndex(index.id)}
                    className="mt-1"
                  />
                  <div>
                    <p className="font-medium">{index.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {index.description}
                    </p>
                  </div>
                </label>
              ))}
            </CardContent>
          </Card>

          <div className="lg:col-span-2 flex justify-between">
            <Button variant="outline" onClick={() => setStep('select-area')}>
              Back
            </Button>
            <Button onClick={startAnalysis} disabled={selectedIndices.length === 0}>
              <Play className="mr-2 h-4 w-4" />
              Start Analysis
            </Button>
          </div>
        </div>
      )}

      {step === 'processing' && (
        <Card className="max-w-xl mx-auto">
          <CardHeader className="text-center">
            <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary" />
            <CardTitle>Processing Analysis</CardTitle>
            <CardDescription>
              Fetching Sentinel-2 imagery and calculating vegetation indices...
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress value={progress} />
            <div className="text-center text-sm text-muted-foreground">
              {progress < 30 && 'Querying satellite imagery...'}
              {progress >= 30 && progress < 60 && 'Applying cloud mask...'}
              {progress >= 60 && progress < 90 && 'Calculating indices...'}
              {progress >= 90 && 'Generating statistics...'}
            </div>
          </CardContent>
        </Card>
      )}

      {step === 'complete' && (
        <Card className="max-w-xl mx-auto">
          <CardHeader className="text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-green-100 flex items-center justify-center">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle>Analysis Complete!</CardTitle>
            <CardDescription>
              Your vegetation analysis has been processed successfully
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-2xl font-bold text-primary">0.68</p>
                <p className="text-sm text-muted-foreground">Mean NDVI</p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-2xl font-bold">12</p>
                <p className="text-sm text-muted-foreground">Images Processed</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button className="flex-1" onClick={() => setStep('select-area')}>
                New Analysis
              </Button>
              <Button variant="outline" className="flex-1">
                View Results
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
