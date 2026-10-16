/**
 * Ingestion API hooks using React Query
 */

import type {
  PaginatedResponse,
  IngestionRunItem,
} from '@/types/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

export function useRunIngestion() {
  const queryClient = useQueryClient();

  return useMutation<{ message: string; runId: number }, Error>({
    mutationFn: () => apiClient.runIngestion(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingestion-runs'] });
    },
    retry: 2,
  });
}

export function useIngestionRuns(
  page = 1,
  pageSize = 20,
) {
  return useQuery<
    PaginatedResponse<IngestionRunItem>,
    Error
  >({
    queryKey: ['ingestion-runs', page, pageSize],
    queryFn: () =>
      apiClient.getIngestionRuns({ page, pageSize }),
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
}