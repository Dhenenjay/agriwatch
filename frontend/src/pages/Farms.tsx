import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, MapPin, Leaf, Calendar, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import FarmMap from '@/components/map/FarmMap'
import { cn, formatArea, formatDate, getNDVIColor, getNDVICategory } from '@/lib/utils'
import { useFarms } from '@/hooks/useApi'

export default function Farms() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFarmId, setSelectedFarmId] = useState<string | undefined>()
  const { data: farms = [], isLoading, error } = useFarms()

  const filteredFarms = useMemo(() => 
    farms.filter(
      (farm) =>
        farm.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (farm.farmer_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (farm.location || '').toLowerCase().includes(searchQuery.toLowerCase())
    ), [farms, searchQuery])

  // Transform for map component
  const mapFarms = useMemo(() =>
    filteredFarms.map(f => ({
      id: f.id,
      name: f.name,
      geometry: f.geometry,
      ndvi: f.latest_ndvi,
    })), [filteredFarms])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Farms</h1>
          <p className="text-muted-foreground">
            Manage and monitor your registered farms
          </p>
        </div>
        <Button asChild>
          <Link to="/farms/new">
            <Plus className="mr-2 h-4 w-4" />
            Add Farm
          </Link>
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search farms by name, farmer, or location..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 rounded-md border bg-background"
        />
      </div>

      {error ? (
        <div className="flex items-center justify-center h-64">
          <p className="text-destructive">Failed to load farms. Is the backend running?</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Farm List */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">
              {isLoading ? 'Loading...' : `${filteredFarms.length} Farms`}
            </h2>
            <div className="space-y-3">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : filteredFarms.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No farms found. Add your first farm to get started.
                </p>
              ) : (
                filteredFarms.map((farm) => (
                  <Card
                    key={farm.id}
                    className={cn(
                      'cursor-pointer transition-all hover:shadow-md',
                      selectedFarmId === farm.id && 'ring-2 ring-primary'
                    )}
                    onClick={() => setSelectedFarmId(farm.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <Link
                            to={`/farms/${farm.id}`}
                            className="font-semibold hover:text-primary"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {farm.name}
                          </Link>
                          <p className="text-sm text-muted-foreground">
                            {farm.farmer_name || 'Unknown farmer'}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {farm.location || farm.district || 'Unknown location'}
                            </span>
                            <span>{formatArea(farm.area_sqm)}</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <div
                            className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium"
                            style={{
                              backgroundColor: `${getNDVIColor(farm.latest_ndvi || 0)}20`,
                              color: getNDVIColor(farm.latest_ndvi || 0),
                            }}
                          >
                            <Leaf className="h-3 w-3" />
                            {getNDVICategory(farm.latest_ndvi || 0)}
                          </div>
                          {farm.last_analysis_date && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(farm.last_analysis_date)}
                            </span>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>

          {/* Map View */}
          <Card className="sticky top-20">
            <CardHeader>
              <CardTitle>Farm Locations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[500px]">
                <FarmMap
                  farms={mapFarms}
                  selectedFarmId={selectedFarmId}
                  onFarmSelect={setSelectedFarmId}
                  showNDVIOverlay={true}
                  center={[78.9629, 20.5937]}
                  zoom={5}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
