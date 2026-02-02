import { MapPin, Leaf, AlertTriangle, TrendingUp, Activity, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Link } from 'react-router-dom'
import FarmMap from '@/components/map/FarmMap'
import IndexTimeSeries from '@/components/charts/IndexTimeSeries'
import { useFarms } from '@/hooks/useApi'
import { useMemo } from 'react'

export default function Dashboard() {
  const { data: farms = [], isLoading, error } = useFarms()

  // Calculate stats from real data
  const stats = useMemo(() => {
    const avgNdvi = farms.length > 0 
      ? farms.reduce((sum, f) => sum + (f.latest_ndvi || 0), 0) / farms.length 
      : 0
    const lowNdviFarms = farms.filter(f => (f.latest_ndvi || 0) < 0.4).length
    
    return [
      { title: 'Total Farms', value: String(farms.length), icon: MapPin, trend: 'Monitored fields' },
      { title: 'Avg. NDVI', value: avgNdvi.toFixed(2), icon: Leaf, trend: avgNdvi > 0.5 ? 'Healthy' : 'Needs attention' },
      { title: 'Active Alerts', value: String(lowNdviFarms), icon: AlertTriangle, trend: 'Low NDVI fields' },
      { title: 'Analysis Ready', value: String(farms.length), icon: Activity, trend: 'Fields available' },
    ]
  }, [farms])

  // Transform farms for map
  const mapFarms = useMemo(() => 
    farms.map(f => ({
      id: f.id,
      name: f.name,
      geometry: f.geometry,
      ndvi: f.latest_ndvi,
    })), [farms])

  // Generate alerts from low NDVI farms
  const alerts = useMemo(() => 
    farms
      .filter(f => (f.latest_ndvi || 0) < 0.5)
      .slice(0, 5)
      .map((f, i) => ({
        id: i,
        farm: f.name,
        type: (f.latest_ndvi || 0) < 0.3 ? 'Water Stress' : 'Low NDVI',
        severity: (f.latest_ndvi || 0) < 0.3 ? 'high' : 'medium',
        time: 'Recently',
      })), [farms])

  // Mock time series for now (would need farm-specific API)
  const timeSeriesData = [
    { date: '2024-12-01', ndvi: 0.45, ndre: 0.35 },
    { date: '2024-12-08', ndvi: 0.52, ndre: 0.38 },
    { date: '2024-12-15', ndvi: 0.58, ndre: 0.42 },
    { date: '2024-12-22', ndvi: 0.62, ndre: 0.45 },
    { date: '2024-12-29', ndvi: 0.65, ndre: 0.48 },
    { date: '2025-01-05', ndvi: 0.68, ndre: 0.50 },
  ]

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-destructive">Failed to load dashboard data. Is the backend running?</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor your farms and track vegetation health
          </p>
        </div>
        <Button asChild>
          <Link to="/analysis">
            <TrendingUp className="mr-2 h-4 w-4" />
            Run Analysis
          </Link>
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          <div className="col-span-4 flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          stats.map((stat) => (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <stat.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">{stat.trend}</p>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Farm Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[400px]">
              <FarmMap
                farms={mapFarms}
                showNDVIOverlay={true}
                center={[78.9629, 20.5937]}
                zoom={5}
              />
            </div>
          </CardContent>
        </Card>

        {/* Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Active Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {alerts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No active alerts
                </p>
              ) : (
                alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
                  >
                    <div
                      className={`w-2 h-2 mt-2 rounded-full ${
                        alert.severity === 'high'
                          ? 'bg-red-500'
                          : alert.severity === 'medium'
                          ? 'bg-yellow-500'
                          : 'bg-blue-500'
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{alert.type}</p>
                      <p className="text-xs text-muted-foreground">{alert.farm}</p>
                      <p className="text-xs text-muted-foreground">{alert.time}</p>
                    </div>
                  </div>
                ))
              )}
              <Button variant="outline" size="sm" className="w-full" asChild>
                <Link to="/farms">View All Farms</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Time Series Chart */}
      <IndexTimeSeries
        data={timeSeriesData}
        indices={['ndvi', 'ndre']}
        title="Regional Vegetation Trend (Last 6 Weeks)"
      />
    </div>
  )
}
