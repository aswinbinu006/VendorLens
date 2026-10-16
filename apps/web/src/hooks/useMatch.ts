/**
 * Match API hooks using React Query
 */

import type {
  PaginatedResponse,
  PendingMatchItem,
} from '@/types/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

export function usePendingMatches(
  page = 1,
  pageSize = 20,
) {
  return useQuery<
    PaginatedResponse<PendingMatchItem>,
    Error
  >({
    queryKey: ['matches', 'pending', page, pageSize],
    queryFn: () => apiClient.getPendingMatches({ page, pageSize }),
    staleTime: 3 * 60 * 1000, // 3 minutes
    retry: 2,
    refetchOnWindowFocus: false,
  });
}

export function useConfirmMatch() {
  const queryClient = useQueryClient();

  return useMutation<{ success: boolean; rescoreTriggered: boolean }, Error, number>({
    mutationFn: (id) => apiClient.confirmMatch(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matches', 'pending'] });
    },
    retry: 2,
  });
}

export function useRejectMatch() {
  const queryClient = useQueryClient();

  return useMutation<{ success: boolean }, Error, number>({
    mutationFn: (id) => apiClient.rejectMatch(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matches', 'pending'] });
    },
    retry: 2,
  });
}