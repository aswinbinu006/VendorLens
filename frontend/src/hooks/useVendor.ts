/**
 * Vendor API hooks using React Query
 */

import type {
  PaginatedResponse,
  VendorSummary,
  VendorCreateInput,
  VendorUpdateInput,
  CsvImportResponse,
  ScoreDetail,
  ScoreHistoryItem,
  SignalItem,
  DashboardSummary,
  RiskLevel,
} from '@/types/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

// useVendors - List vendors with filters
export function useVendors(
  page = 1,
  pageSize = 20,
  level?: RiskLevel,
  q?: string,
  sortBy?: 'score' | 'name' | 'criticality',
  sortOrder: 'asc' | 'desc' = 'desc',
) {
  return useQuery<
    PaginatedResponse<VendorSummary>,
    Error
  >({
    queryKey: ['vendors', page, pageSize, level, q, sortBy, sortOrder],
    queryFn: () => apiClient.listVendors({ page, pageSize, level, q, sortBy, sortOrder }),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    refetchOnWindowFocus: false,
  });
}

// useVendorDetail - Get vendor details
export function useVendorDetail(id: number) {
  return useQuery<VendorSummary, Error>({
    queryKey: ['vendor', id],
    queryFn: () => apiClient.getVendor(id),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    enabled: !!id,
  });
}
export const useVendor = useVendorDetail;

// useCreateVendor - Create vendor mutation
export function useCreateVendor() {
  const queryClient = useQueryClient();

  return useMutation<VendorSummary, Error, VendorCreateInput>({
    mutationFn: (input) => apiClient.createVendor(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
    },
    retry: 2,
  });
}

// useUpdateVendor - Update vendor mutation
export function useUpdateVendor(id: number) {
  const queryClient = useQueryClient();

  return useMutation<VendorSummary, Error, VendorUpdateInput>({
    mutationFn: (input) => apiClient.updateVendor(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      queryClient.invalidateQueries({ queryKey: ['vendor', id] });
    },
    retry: 2,
  });
}

// useDeleteVendor - Delete vendor mutation
export function useDeleteVendor(defaultId?: number) {
  const queryClient = useQueryClient();

  return useMutation<void, Error, number>({
    mutationFn: (id) => apiClient.deleteVendor(id ?? defaultId!),
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      queryClient.invalidateQueries({ queryKey: ['vendor', deletedId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'summary'] });
    },
    retry: 2,
  });
}

// useImportVendors - Import CSV mutation
export function useImportVendors() {
  const queryClient = useQueryClient();

  return useMutation<CsvImportResponse, Error, File>({
    mutationFn: (file) => {
      const formData = new FormData();
      formData.append('file', file);
      return apiClient.importCsv(file);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
    },
    retry: 2,
  });
}

// useVendorSignals - Get vendor signals
export function useVendorSignals(
  id: number,
  page = 1,
  pageSize = 20,
  trust?: 'official' | 'unverified',
) {
  return useQuery<PaginatedResponse<SignalItem>, Error>({
    queryKey: ['vendor', id, 'signals', page, pageSize, trust],
    queryFn: () =>
      apiClient.getVendorSignals(id, { trust, page, pageSize }),
    staleTime: 5 * 60 * 1000,
    retry: 2,
    enabled: !!id,
  });
}

// useVendorScore - Get vendor risk score with rules
export function useVendorScore(id: number) {
  return useQuery<ScoreDetail, Error>({
    queryKey: ['vendor', id, 'score'],
    queryFn: () => apiClient.getVendorScore(id),
    staleTime: 5 * 60 * 1000,
    retry: 2,
    enabled: !!id,
  });
}

// useVendorScoreHistory - Get scores over time
export function useVendorScoreHistory(id: number) {
  return useQuery<ScoreHistoryItem[], Error>({
    queryKey: ['vendor', id, 'score-history'],
    queryFn: () => apiClient.getVendorScoreHistory(id),
    staleTime: 5 * 60 * 1000,
    retry: 2,
    enabled: !!id,
  });
}

// useVendorDashboardSummary - Get dashboard summary (re-export for convenience)
export function useVendorDashboardSummary() {
  return useQuery<DashboardSummary, Error>({
    queryKey: ['dashboard', 'summary'],
    queryFn: () => apiClient.getDashboardSummary(),
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
}