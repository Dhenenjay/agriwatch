/**
 * React Query hooks for Advanced Analysis API
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { advancedApi, type AnalysisRequest, type ComprehensiveAnalysis } from '@/services/advancedApi'

// Query keys
export const advancedKeys = {
  all: ['advanced'] as const,
  status: () => [...advancedKeys.all, 'status'] as const,
  comprehensive: (farmId: string) => [...advancedKeys.all, 'comprehensive', farmId] as const,
  indices: (farmId: string) => [...advancedKeys.all, 'indices', farmId] as const,
  health: (farmId: string) => [...advancedKeys.all, 'health', farmId] as const,
  stress: (farmId: string) => [...advancedKeys.all, 'stress', farmId] as const,
  yield: (farmId: string) => [...advancedKeys.all, 'yield', farmId] as const,
  weather: (farmId: string) => [...advancedKeys.all, 'weather', farmId] as const,
  cropStage: (farmId: string) => [...advancedKeys.all, 'cropStage', farmId] as const,
  timeSeries: (farmId: string, index: string, days: number) => 
    [...advancedKeys.all, 'timeSeries', farmId, index, days] as const,
  risk: (farmId: string) => [...advancedKeys.all, 'risk', farmId] as const,
}

/**
 * Check if GEE service is available
 */
export function useAdvancedStatus() {
  return useQuery({
    queryKey: advancedKeys.status(),
    queryFn: advancedApi.getStatus,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

/**
 * Run comprehensive analysis for a farm
 */
export function useComprehensiveAnalysis(request: AnalysisRequest | null) {
  return useQuery({
    queryKey: advancedKeys.comprehensive(request?.farm_id || ''),
    queryFn: () => advancedApi.runComprehensiveAnalysis(request!),
    enabled: !!request,
    staleTime: 1000 * 60 * 15, // 15 minutes
  })
}

/**
 * Mutation hook for running comprehensive analysis on demand
 */
export function useRunComprehensiveAnalysis() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: advancedApi.runComprehensiveAnalysis,
    onSuccess: (data, variables) => {
      queryClient.setQueryData(
        advancedKeys.comprehensive(variables.farm_id),
        data
      )
    },
  })
}

/**
 * Get all vegetation indices
 */
export function useAdvancedIndices(request: AnalysisRequest | null) {
  return useQuery({
    queryKey: advancedKeys.indices(request?.farm_id || ''),
    queryFn: () => advancedApi.getIndices(request!),
    enabled: !!request,
    staleTime: 1000 * 60 * 15,
  })
}

/**
 * Get crop health score
 */
export function useHealthScore(request: AnalysisRequest | null) {
  return useQuery({
    queryKey: advancedKeys.health(request?.farm_id || ''),
    queryFn: () => advancedApi.getHealthScore(request!),
    enabled: !!request,
    staleTime: 1000 * 60 * 15,
  })
}

/**
 * Detect stress conditions
 */
export function useStressDetection(request: AnalysisRequest | null) {
  return useQuery({
    queryKey: advancedKeys.stress(request?.farm_id || ''),
    queryFn: () => advancedApi.detectStress(request!),
    enabled: !!request,
    staleTime: 1000 * 60 * 15,
  })
}

/**
 * Estimate yield
 */
export function useYieldEstimation(request: AnalysisRequest | null) {
  return useQuery({
    queryKey: advancedKeys.yield(request?.farm_id || ''),
    queryFn: () => advancedApi.estimateYield(request!),
    enabled: !!request,
    staleTime: 1000 * 60 * 15,
  })
}

/**
 * Get weather data
 */
export function useWeatherData(request: AnalysisRequest | null) {
  return useQuery({
    queryKey: advancedKeys.weather(request?.farm_id || ''),
    queryFn: () => advancedApi.getWeather(request!),
    enabled: !!request,
    staleTime: 1000 * 60 * 30, // 30 minutes for weather
  })
}

/**
 * Detect crop growth stage
 */
export function useCropStage(request: AnalysisRequest | null) {
  return useQuery({
    queryKey: advancedKeys.cropStage(request?.farm_id || ''),
    queryFn: () => advancedApi.detectCropStage(request!),
    enabled: !!request,
    staleTime: 1000 * 60 * 15,
  })
}

/**
 * Get time series data
 */
export function useAdvancedTimeSeries(
  farmId: string | null,
  index = 'NDVI',
  days = 90
) {
  return useQuery({
    queryKey: advancedKeys.timeSeries(farmId || '', index, days),
    queryFn: () => advancedApi.getTimeSeries(farmId!, index, days),
    enabled: !!farmId,
    staleTime: 1000 * 60 * 30,
  })
}

/**
 * Get risk assessment
 */
export function useRiskAssessment(farmId: string | null) {
  return useQuery({
    queryKey: advancedKeys.risk(farmId || ''),
    queryFn: () => advancedApi.getRiskAssessment(farmId!),
    enabled: !!farmId,
    staleTime: 1000 * 60 * 15,
  })
}

/**
 * Helper to create an analysis request from farm data
 */
export function createAnalysisRequest(
  farmId: string,
  geometry: { type: 'Polygon'; coordinates: number[][][] },
  cropType = 'wheat'
): AnalysisRequest {
  return {
    farm_id: farmId,
    geometry,
    crop_type: cropType,
  }
}
