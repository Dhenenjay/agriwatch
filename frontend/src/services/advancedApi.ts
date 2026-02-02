/**
 * Advanced Analysis API Service
 * Connects to the comprehensive GEE-powered analysis endpoints
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// ============================================================================
// TYPES
// ============================================================================

export interface Coordinates {
  type: 'Polygon'
  coordinates: number[][][]
}

export interface AnalysisRequest {
  farm_id: string
  geometry: Coordinates
  crop_type: string
  start_date?: string
  end_date?: string
}

export interface IndexData {
  NDVI?: number
  EVI?: number
  NDRE?: number
  GNDVI?: number
  SAVI?: number
  MSAVI2?: number
  LSWI?: number
  NDMI?: number
  NDWI?: number
  NBR?: number
  CIgreen?: number
  CIre?: number
  MCARI?: number
  TCARI?: number
  WDRVI?: number
  LAI?: number
  fPAR?: number
  BSI?: number
  NDTI?: number
}

export interface HealthScore {
  overall_score: number
  greenness_score: number
  vigor_score: number
  nutrient_score: number
  water_score: number
  canopy_score: number
  health_status: string
}

export interface StressLevel {
  level: number
  status: string
  indicator?: string
  value?: number
  temperature_c?: number
}

export interface StressData {
  water_stress: StressLevel
  nutrient_stress: StressLevel
  heat_stress: StressLevel
  vegetation_stress: StressLevel
  soil_exposure: StressLevel
}

export interface YieldEstimate {
  estimated_yield_tha: number
  yield_min: number
  yield_max: number
  confidence: number
  crop_type: string
  model_type: string
}

export interface WeatherData {
  temperature_c?: number
  precipitation_mm?: number
  wind_speed_ms?: number
  soil_temp_c?: number
  evaporation_mm?: number
  humidity_percent?: number
}

export interface CropStage {
  current_stage: string
  stage_confidence: number
  days_in_stage: number
  estimated_days_to_next: number
  growth_rate: string
  phenology_score: number
}

export interface ComprehensiveAnalysis {
  farm_id: string
  analysis_date: string
  indices: IndexData
  health_score: HealthScore
  stress_detection: StressData
  yield_estimation: YieldEstimate
  weather: WeatherData
  crop_stage: CropStage
  recommendations: string[]
}

export interface TimeSeriesPoint {
  date: string
  value: number
}

export interface TimeSeriesData {
  farm_id: string
  index: string
  period_days: number
  data: TimeSeriesPoint[]
}

export interface RiskFactor {
  name: string
  level: number
  status: 'low' | 'moderate' | 'high' | 'critical'
  description: string
}

export interface RiskAlert {
  type: string
  severity: string
  message: string
  timestamp: string
}

export interface RiskAssessment {
  farm_id: string
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
  alerts: RiskAlert[]
  assessment_date: string
}

export interface ServiceStatus {
  gee_available: boolean
  service_version: string
  features: string[]
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.text()
    throw new Error(error || `HTTP ${response.status}`)
  }
  return response.json()
}

export const advancedApi = {
  /**
   * Check service status
   */
  getStatus: async (): Promise<ServiceStatus> => {
    const response = await fetch(`${API_BASE}/api/advanced/status`)
    return handleResponse(response)
  },

  /**
   * Run comprehensive analysis
   */
  runComprehensiveAnalysis: async (request: AnalysisRequest): Promise<ComprehensiveAnalysis> => {
    const response = await fetch(`${API_BASE}/api/advanced/comprehensive`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    })
    return handleResponse(response)
  },

  /**
   * Get all vegetation indices
   */
  getIndices: async (request: AnalysisRequest): Promise<IndexData> => {
    const response = await fetch(`${API_BASE}/api/advanced/indices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    })
    return handleResponse(response)
  },

  /**
   * Get crop health score
   */
  getHealthScore: async (request: AnalysisRequest): Promise<HealthScore> => {
    const response = await fetch(`${API_BASE}/api/advanced/health-score`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    })
    return handleResponse(response)
  },

  /**
   * Detect stress conditions
   */
  detectStress: async (request: AnalysisRequest): Promise<StressData> => {
    const response = await fetch(`${API_BASE}/api/advanced/stress`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    })
    return handleResponse(response)
  },

  /**
   * Estimate yield
   */
  estimateYield: async (request: AnalysisRequest): Promise<YieldEstimate> => {
    const response = await fetch(`${API_BASE}/api/advanced/yield`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    })
    return handleResponse(response)
  },

  /**
   * Get weather data
   */
  getWeather: async (request: AnalysisRequest): Promise<WeatherData> => {
    const response = await fetch(`${API_BASE}/api/advanced/weather`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    })
    return handleResponse(response)
  },

  /**
   * Detect crop stage
   */
  detectCropStage: async (request: AnalysisRequest): Promise<CropStage> => {
    const response = await fetch(`${API_BASE}/api/advanced/crop-stage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    })
    return handleResponse(response)
  },

  /**
   * Get time series data
   */
  getTimeSeries: async (farmId: string, index = 'NDVI', days = 90): Promise<TimeSeriesData> => {
    const response = await fetch(
      `${API_BASE}/api/advanced/time-series/${farmId}?index=${index}&days=${days}`
    )
    return handleResponse(response)
  },

  /**
   * Get risk assessment
   */
  getRiskAssessment: async (farmId: string): Promise<RiskAssessment> => {
    const response = await fetch(`${API_BASE}/api/advanced/risk-assessment/${farmId}`)
    return handleResponse(response)
  },
}

export default advancedApi
