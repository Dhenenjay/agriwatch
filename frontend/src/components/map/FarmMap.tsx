import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import MapboxDraw from '@mapbox/mapbox-gl-draw'
import { cn } from '@/lib/utils'
import { MapPin } from 'lucide-react'
import 'mapbox-gl/dist/mapbox-gl.css'
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css'

// Set your Mapbox token here or via environment variable
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || ''

interface Farm {
  id: string
  name: string
  geometry: GeoJSON.Polygon
  ndvi?: number
}

interface FarmMapProps {
  farms?: Farm[]
  selectedFarmId?: string
  onFarmSelect?: (farmId: string) => void
  onDrawComplete?: (geometry: GeoJSON.Polygon) => void
  enableDrawing?: boolean
  showNDVIOverlay?: boolean
  center?: [number, number]
  zoom?: number
  className?: string
}

export default function FarmMap({
  farms = [],
  selectedFarmId,
  onFarmSelect,
  onDrawComplete,
  enableDrawing = false,
  showNDVIOverlay = false,
  center = [78.9629, 20.5937], // India center
  zoom = 5,
  className,
}: FarmMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const draw = useRef<MapboxDraw | null>(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [mapError, setMapError] = useState<string | null>(null)

  // Initialize map
  useEffect(() => {
    if (!MAPBOX_TOKEN || !mapContainer.current || map.current) return

    try {
      mapboxgl.accessToken = MAPBOX_TOKEN
      
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/satellite-streets-v12',
        center: center,
        zoom: zoom,
      })
      
      map.current.on('error', (e) => {
        console.error('Map error:', e)
        setMapError('Failed to load map. Check your Mapbox token.')
      })

      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right')
      map.current.addControl(new mapboxgl.ScaleControl(), 'bottom-left')

      map.current.on('load', () => {
        setMapLoaded(true)
      })
    } catch (err) {
      console.error('Map init error:', err)
      setMapError('Failed to initialize map.')
    }

    return () => {
      map.current?.remove()
      map.current = null
    }
  }, [])

  // Add drawing control
  useEffect(() => {
    if (!map.current || !mapLoaded || !enableDrawing) return

    draw.current = new MapboxDraw({
      displayControlsDefault: false,
      controls: {
        polygon: true,
        trash: true,
      },
      defaultMode: 'draw_polygon',
    })

    map.current.addControl(draw.current as any, 'top-left')

    map.current.on('draw.create', (e: any) => {
      const feature = e.features[0]
      if (feature && onDrawComplete) {
        onDrawComplete(feature.geometry as GeoJSON.Polygon)
      }
    })

    return () => {
      if (draw.current && map.current) {
        map.current.removeControl(draw.current as any)
      }
    }
  }, [mapLoaded, enableDrawing, onDrawComplete])

  // Add farm polygons
  useEffect(() => {
    if (!map.current || !mapLoaded || farms.length === 0) return

    // Add source for farms
    if (!map.current.getSource('farms')) {
      map.current.addSource('farms', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: farms.map((farm) => ({
            type: 'Feature',
            id: farm.id,
            properties: {
              name: farm.name,
              ndvi: farm.ndvi ?? 0,
            },
            geometry: farm.geometry,
          })),
        },
      })

      // Add fill layer with NDVI coloring
      map.current.addLayer({
        id: 'farms-fill',
        type: 'fill',
        source: 'farms',
        paint: {
          'fill-color': showNDVIOverlay
            ? [
                'interpolate',
                ['linear'],
                ['get', 'ndvi'],
                0, '#d73027',
                0.2, '#fee08b',
                0.4, '#d9ef8b',
                0.6, '#91cf60',
                0.8, '#1a9850',
              ]
            : '#22c55e',
          'fill-opacity': 0.5,
        },
      })

      // Add outline layer
      map.current.addLayer({
        id: 'farms-outline',
        type: 'line',
        source: 'farms',
        paint: {
          'line-color': '#ffffff',
          'line-width': 2,
        },
      })

      // Add labels
      map.current.addLayer({
        id: 'farms-labels',
        type: 'symbol',
        source: 'farms',
        layout: {
          'text-field': ['get', 'name'],
          'text-size': 12,
          'text-anchor': 'center',
        },
        paint: {
          'text-color': '#ffffff',
          'text-halo-color': '#000000',
          'text-halo-width': 1,
        },
      })

      // Click handler
      map.current.on('click', 'farms-fill', (e) => {
        if (e.features && e.features[0] && onFarmSelect) {
          onFarmSelect(e.features[0].id as string)
        }
      })

      // Cursor change on hover
      map.current.on('mouseenter', 'farms-fill', () => {
        if (map.current) map.current.getCanvas().style.cursor = 'pointer'
      })

      map.current.on('mouseleave', 'farms-fill', () => {
        if (map.current) map.current.getCanvas().style.cursor = ''
      })
    }

    return () => {
      if (map.current) {
        if (map.current.getLayer('farms-labels')) map.current.removeLayer('farms-labels')
        if (map.current.getLayer('farms-outline')) map.current.removeLayer('farms-outline')
        if (map.current.getLayer('farms-fill')) map.current.removeLayer('farms-fill')
        if (map.current.getSource('farms')) map.current.removeSource('farms')
      }
    }
  }, [mapLoaded, farms, showNDVIOverlay, onFarmSelect])

  // Highlight selected farm
  useEffect(() => {
    if (!map.current || !mapLoaded || !selectedFarmId) return

    const selectedFarm = farms.find((f) => f.id === selectedFarmId)
    if (selectedFarm) {
      // Fly to selected farm
      const coords = selectedFarm.geometry.coordinates[0]
      const bounds = coords.reduce(
        (b, c) => b.extend(c as [number, number]),
        new mapboxgl.LngLatBounds(coords[0] as [number, number], coords[0] as [number, number])
      )
      map.current.fitBounds(bounds, { padding: 50 })
    }
  }, [selectedFarmId, mapLoaded, farms])

  // Render fallback if no token
  if (!MAPBOX_TOKEN) {
    return (
      <div className={cn("relative w-full h-full min-h-[400px] bg-muted rounded-lg flex items-center justify-center", className)}>
        <div className="text-center p-6">
          <MapPin className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="font-semibold mb-2">Map Not Configured</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Add your Mapbox token to <code className="bg-background px-1 rounded">.env</code>
          </p>
          <code className="text-xs bg-background p-2 rounded block">
            VITE_MAPBOX_TOKEN=your_token_here
          </code>
        </div>
      </div>
    )
  }

  // Render error state
  if (mapError) {
    return (
      <div className={cn("relative w-full h-full min-h-[400px] bg-muted rounded-lg flex items-center justify-center", className)}>
        <div className="text-center p-6">
          <MapPin className="h-12 w-12 mx-auto mb-4 text-destructive" />
          <h3 className="font-semibold mb-2">Map Error</h3>
          <p className="text-sm text-muted-foreground">{mapError}</p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("relative w-full h-full min-h-[400px]", className)}>
      <div ref={mapContainer} className="absolute inset-0 rounded-lg overflow-hidden" />
      
      {/* NDVI Legend */}
      {showNDVIOverlay && (
        <div className="absolute bottom-8 right-4 bg-card/90 backdrop-blur-sm rounded-lg p-3 shadow-lg">
          <div className="text-xs font-medium mb-2">NDVI Scale</div>
          <div className="flex items-center gap-2">
            <div className="ndvi-scale w-24 h-3 rounded" />
            <div className="flex justify-between w-24 text-xs text-muted-foreground">
              <span>0</span>
              <span>1</span>
            </div>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>Bare</span>
            <span>Dense</span>
          </div>
        </div>
      )}
    </div>
  )
}
