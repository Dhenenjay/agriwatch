/**
 * API service for AgriWatch backend communication
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean>
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { params, ...fetchOptions } = options
  
  let url = `${API_BASE_URL}${endpoint}`
  
  if (params) {
    const searchParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      searchParams.append(key, String(value))
    })
    url += `?${searchParams.toString()}`
  }
  
  const response = await fetch(url, {
    ...fetchOptions,
    headers: {
      'Content-Type': 'application/json',
      ...fetchOptions.headers,
    },
  })
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }))
    throw new Error(error.detail || `HTTP ${response.status}`)
  }
  
  return response.json()
}

// Types
export interface Farm {
  id: string
  name: string
  farmer_name?: string
  farmer_phone?: string
  location?: string
  district?: string
  state?: string
  crop_type?: string
  sowing_date?: string
  expected_harvest?: string
  geometry: {
    type: 'Polygon'
    coordinates: number[][][]
  }
  area_sqm: number
  created_at: string
  updated_at: string
  latest_ndvi?: number
  last_analysis_date?: string
}

export interface FarmCreate {
  name: string
  farmer_name?: string
  farmer_phone?: string
  location?: string
  district?: string
  state?: string
  crop_type?: string
  sowing_date?: string
  expected_harvest?: string
  geometry: {
    type: 'Polygon'
    coordinates: number[][][]
  }
}

export interface AnalysisRequest {
  geometry: {
    type: 'Polygon'
    coordinates: number[][][]
  }
  start_date: string
  end_date: string
  indices?: string[]
  farm_id?: string
  max_cloud_cover?: number
  scale?: number
}

export interface AnalysisJob {
  job_id: string
  status: 'pending' | 'queued' | 'processing' | 'completed' | 'failed'
  created_at: string
  started_at?: string
  completed_at?: string
  progress: number
  message?: string
  farm_id?: string
}

export interface AnalysisResult {
  job_id: string
  status: string
  indices: Record<string, number>
  statistics: Record<string, { min: number; max: number; mean: number; std: number }>
  histogram?: Record<string, Array<{ range: string; count: number; percentage: number }>>
  images_processed: number
  date_range: { start: string; end: string }
}

export interface IndexTimeSeries {
  farm_id: string
  start_date: string
  end_date: string
  data: Array<{
    date: string
    ndvi?: number
    ndre?: number
    lswi?: number
    savi?: number
    cloud_cover?: number
  }>
}

// API Functions

// Farms
export const farmsApi = {
  list: (search?: string) => 
    request<Farm[]>('/api/farms', { params: search ? { search } : undefined }),
  
  get: (id: string) => 
    request<Farm>(`/api/farms/${id}`),
  
  create: (farm: FarmCreate) => 
    request<Farm>('/api/farms', {
      method: 'POST',
      body: JSON.stringify(farm),
    }),
  
  update: (id: string, farm: Partial<FarmCreate>) => 
    request<Farm>(`/api/farms/${id}`, {
      method: 'PUT',
      body: JSON.stringify(farm),
    }),
  
  delete: (id: string) => 
    request<void>(`/api/farms/${id}`, { method: 'DELETE' }),
}

// Analysis
export const analysisApi = {
  create: (req: AnalysisRequest) => 
    request<AnalysisJob>('/api/analysis', {
      method: 'POST',
      body: JSON.stringify(req),
    }),
  
  getStatus: (jobId: string) => 
    request<AnalysisJob>(`/api/analysis/${jobId}`),
  
  getResult: (jobId: string) => 
    request<AnalysisResult>(`/api/analysis/${jobId}/result`),
  
  cancel: (jobId: string) => 
    request<void>(`/api/analysis/${jobId}`, { method: 'DELETE' }),
}

// Indices
export const indicesApi = {
  getTimeSeries: (farmId: string, startDate: string, endDate: string) => 
    request<IndexTimeSeries>(`/api/indices/time-series/${farmId}`, {
      params: { start_date: startDate, end_date: endDate },
    }),
  
  getDistribution: (farmId: string, indexType = 'ndvi', date?: string) => 
    request<any>(`/api/indices/distribution/${farmId}`, {
      params: { index_type: indexType, ...(date && { analysis_date: date }) },
    }),
  
  getLatest: (farmId: string) => 
    request<any>(`/api/indices/latest/${farmId}`),
}

// Health check
export const healthCheck = () => request<{ status: string }>('/health')

export default {
  farms: farmsApi,
  analysis: analysisApi,
  indices: indicesApi,
  healthCheck,
}
