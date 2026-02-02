import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { farmsApi, analysisApi, indicesApi, type Farm, type FarmCreate, type AnalysisRequest } from '@/services/api'

// Farms hooks
export function useFarms(search?: string) {
  return useQuery({
    queryKey: ['farms', search],
    queryFn: () => farmsApi.list(search),
  })
}

export function useFarm(id: string) {
  return useQuery({
    queryKey: ['farms', id],
    queryFn: () => farmsApi.get(id),
    enabled: !!id,
  })
}

export function useCreateFarm() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (farm: FarmCreate) => farmsApi.create(farm),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['farms'] })
    },
  })
}

export function useUpdateFarm() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, farm }: { id: string; farm: Partial<FarmCreate> }) => 
      farmsApi.update(id, farm),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['farms'] })
      queryClient.invalidateQueries({ queryKey: ['farms', id] })
    },
  })
}

export function useDeleteFarm() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => farmsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['farms'] })
    },
  })
}

// Analysis hooks
export function useCreateAnalysis() {
  return useMutation({
    mutationFn: (req: AnalysisRequest) => analysisApi.create(req),
  })
}

export function useAnalysisStatus(jobId: string | null) {
  return useQuery({
    queryKey: ['analysis', jobId],
    queryFn: () => analysisApi.getStatus(jobId!),
    enabled: !!jobId,
    refetchInterval: (query) => {
      const status = query.state.data?.status
      if (status === 'completed' || status === 'failed') return false
      return 2000 // Poll every 2 seconds while processing
    },
  })
}

export function useAnalysisResult(jobId: string | null) {
  return useQuery({
    queryKey: ['analysis', jobId, 'result'],
    queryFn: () => analysisApi.getResult(jobId!),
    enabled: !!jobId,
  })
}

// Indices hooks
export function useIndexTimeSeries(farmId: string, startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['indices', 'timeseries', farmId, startDate, endDate],
    queryFn: () => indicesApi.getTimeSeries(farmId, startDate, endDate),
    enabled: !!farmId && !!startDate && !!endDate,
  })
}

export function useIndexDistribution(farmId: string, indexType = 'ndvi', date?: string) {
  return useQuery({
    queryKey: ['indices', 'distribution', farmId, indexType, date],
    queryFn: () => indicesApi.getDistribution(farmId, indexType, date),
    enabled: !!farmId,
  })
}

export function useLatestIndices(farmId: string) {
  return useQuery({
    queryKey: ['indices', 'latest', farmId],
    queryFn: () => indicesApi.getLatest(farmId),
    enabled: !!farmId,
  })
}
