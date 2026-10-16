/**
 * Audit Log API hooks using React Query
 */

import type { PaginatedResponse, AuditLogItem } from '@/types/api';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

export function useAuditLog(
  entity?: string,
  action?: string,
  page = 1,
  pageSize = 20,
) {
  return useQuery<
    PaginatedResponse<AuditLogItem>,
    Error
  >({
    queryKey: ['audit-log', entity, action, page, pageSize],
    queryFn: () =>
      apiClient.getAuditLog({ entity, action, page, pageSize }),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
}