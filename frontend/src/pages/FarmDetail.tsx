import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Calendar, MapPin, User, Download, RefreshCw, Loader2, Satellite, BarChart3 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import FarmMap from '@/components/map/FarmMap'
import IndexTimeSeries from '@/components/charts/IndexTimeSeries'
import NDVIDistribution from '@/components/charts/NDVIDistribution'
import InsightCards from '@/components/insights/InsightCards'
import { formatArea, formatDate } from '@/lib/utils'
import { useFarm, useLatestIndices, useIndexDistribution } from '@/hooks/useApi'

// Mock time series data (would come from API with date range)
const mockTimeSeries = [
  { date: '2024-12-01', ndvi: 0.25, ndre: 0.18, lswi: 0.15, savi: 0.22 },
  { date: '2024-12-15', ndvi: 0.35, ndre: 0.25, lswi: 0.20, savi: 0.32 },
  { date: '2025-01-01', ndvi: 0.48, ndre: 0.35, lswi: 0.28, savi: 0.45 },
  { date: '2025-01-05', ndvi: 0.58, ndre: 0.42, lswi: 0.30, savi: 0.55 },
  { date: '2025-01-10', ndvi: 0.68, ndre: 0.45, lswi: 0.25, savi: 0.65 },
  { date: '2025-01-15', ndvi: 0.72, ndre: 0.48, lswi: 0.25, savi: 0.68 },
]

// Mock NDVI distribution (would come from API)
const mockDistribution = [
  { range: '0-0.1', count: 50, percentage: 2, minValue: 0 },
  { range: '0.1-0.2', count: 100, percentage: 4, minValue: 0.1 },
  { range: '0.2-0.3', count: 150, percentage: 6, minValue: 0.2 },
  { range: '0.3-0.4', count: 200, percentage: 8, minValue: 0.3 },
  { range: '0.4-0.5', count: 300, percentage: 12, minValue: 0.4 },
  { range: '0.5-0.6', count: 450, percentage: 18, minValue: 0.5 },
  { range: '0.6-0.7', count: 600, percentage: 24, minValue: 0.6 },
  { range: '0.7-0.8', count: 500, percentage: 20, minValue: 0.7 },
  { range: '0.8-0.9', count: 125, percentage: 5, minValue: 0.8 },
  { range: '0.9-1.0', count: 25, percentage: 1, minValue: 0.9 },
]

export default function FarmDetail() {
  const { id } = useParams()
  const { data: farm, isLoading, error } = useFarm(id || '')
  const { data: latestIndices } = useLatestIndices(id || '')
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (error || !farm) {
    return (
      <div className="space-y-4">
        <Link
          to="/farms"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Farms
        </Link>
        <div className="flex items-center justify-center h-64">
          <p className="text-destructive">Farm not found or failed to load.</p>
        </div>
      </div>
    )
  }

  // Use latest indices from API or generate from latest_ndvi
  const indices = latestIndices || {
    ndvi: farm.latest_ndvi || 0.5,
    ndre: (farm.latest_ndvi || 0.5) * 0.7,
    lswi: 0.25,
    savi: (farm.latest_ndvi || 0.5) * 0.95,
  }

  // Calculate map center from farm geometry
  const getMapCenter = (): [number, number] => {
    const coords = farm.geometry.coordinates[0]
    const lngs = coords.map(c => c[0])
    const lats = coords.map(c => c[1])
    return [
      (Math.min(...lngs) + Math.max(...lngs)) / 2,
      (Math.min(...lats) + Math.max(...lats)) / 2
    ]
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <Link
            to="/farms"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to Farms
          </Link>
          <h1 className="text-3xl font-bold">{farm.name}</h1>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              {farm.location || farm.district || 'Unknown location'}
            </span>
            <span className="flex items-center gap-1">
              <User className="h-4 w-4" />
              {farm.farmer_name || 'Unknown farmer'}
            </span>
            <span>{formatArea(farm.area_sqm)}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button variant="outline" asChild>
            <Link to="/analysis">
              <RefreshCw className="mr-2 h-4 w-4" />
              Quick Analysis
            </Link>
          </Button>
          <Button asChild>
            <Link to={`/farms/${id}/analysis`}>
              <Satellite className="mr-2 h-4 w-4" />
              Advanced Analysis
            </Link>
          </Button>
        </div>
      </div>

      {/* Insight Cards */}
      <InsightCards data={indices} />

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Field Map</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[400px]">
              <FarmMap
                farms={[{
                  id: farm.id,
                  name: farm.name,
                  geometry: farm.geometry,
                  ndvi: farm.latest_ndvi,
                }]}
                showNDVIOverlay={true}
                center={getMapCenter()}
                zoom={13}
              />
            </div>
          </CardContent>
        </Card>

        {/* Farm Details */}
        <Card>
          <CardHeader>
            <CardTitle>Farm Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Crop Type</p>
                <p className="font-medium">{farm.crop_type || 'Not specified'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Area</p>
                <p className="font-medium">{formatArea(farm.area_sqm)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Sowing Date</p>
                <p className="font-medium">{farm.sowing_date ? formatDate(farm.sowing_date) : 'Not set'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Expected Harvest</p>
                <p className="font-medium">{farm.expected_harvest ? formatDate(farm.expected_harvest) : 'Not set'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">District</p>
                <p className="font-medium">{farm.district || 'Not specified'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">State</p>
                <p className="font-medium">{farm.state || 'Not specified'}</p>
              </div>
            </div>

            <div className="border-t pt-4">
              <p className="text-muted-foreground text-sm">Farmer Contact</p>
              <p className="font-medium">{farm.farmer_name || 'Not specified'}</p>
              <p className="text-sm text-muted-foreground">{farm.farmer_phone || 'No phone'}</p>
            </div>

            <div className="border-t pt-4">
              <p className="text-muted-foreground text-sm flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Last Analysis
              </p>
              <p className="font-medium">
                {farm.last_analysis_date ? formatDate(farm.last_analysis_date) : 'No analysis yet'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <IndexTimeSeries
          data={mockTimeSeries}
          indices={['ndvi', 'ndre', 'lswi', 'savi']}
          title="Vegetation Index History"
        />
        <NDVIDistribution
          data={mockDistribution}
          title="NDVI Distribution Across Field"
          mean={indices.ndvi || 0.5}
          stdDev={0.15}
        />
      </div>
    </div>
  )
}
