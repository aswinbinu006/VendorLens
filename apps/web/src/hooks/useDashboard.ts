/**
 * Dashboard API hooks using React Query
 */

import type { DashboardSummary } from '@/types/api';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

export function useDashboardSummary() {
  return useQuery<DashboardSummary, Error>({
    queryKey: ['dashboard', 'summary'],
    queryFn: () => apiClient.getDashboardSummary(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
}