/**
 * Alert API hooks using React Query
 */

import type {
  PaginatedResponse,
  AlertItem,
  AlertStatus,
  RiskLevel,
} from '@/types/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

export function useAlerts(
  status?: AlertStatus,
  level?: RiskLevel,
  page = 1,
  pageSize = 20,
) {
  return useQuery<
    PaginatedResponse<AlertItem>,
    Error
  >({
    queryKey: ['alerts', status, level, page, pageSize],
    queryFn: () =>
      apiClient.listAlerts({ status, level, page, pageSize }),
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
}

export function useUpdateAlert(defaultId?: number) {
  const queryClient = useQueryClient();

  return useMutation<AlertItem, Error, { id?: number; status: AlertStatus; note?: string }>({
    mutationFn: ({ id, ...input }) => apiClient.updateAlert(id ?? defaultId!, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'summary'] });
    },
    retry: 2,
  });
}