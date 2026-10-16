import type {
  ApiErrorResponse,
  DashboardSummary,
  FuzzyConfigData,
  IngestionRunItem,
  PaginatedResponse,
  PendingMatchItem,
  ScoreDetail,
  ScoreHistoryItem,
  SignalItem,
  User,
  VendorCreateInput,
  VendorSummary,
  VendorUpdateInput,
  AlertItem,
  AlertStatus,
  RiskLevel,
  CsvImportResponse,
  AuditLogItem,
  TrustLevel,
} from '@/types/api';

const API_BASE = '/api/v1';

export class ApiError extends Error {
  code: string;
  details?: unknown[];
  status: number;

  constructor(status: number, code: string, message: string, details?: unknown[]) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined | null>;
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { params, headers, ...rest } = options;
  const isMutating = ['POST', 'PUT', 'PATCH', 'DELETE'].includes((options.method || 'GET').toUpperCase());

  let url = `${API_BASE}${endpoint}`;
  if (params) {
    const searchParams = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '') {
        searchParams.append(k, String(v));
      }
    }
    const queryString = searchParams.toString();
    if (queryString) {
      url += (url.includes('?') ? '&' : '?') + queryString;
    }
  }

  const reqHeaders: Record<string, string> = {
    Accept: 'application/json',
    ...(headers as Record<string, string>),
  };

  if (isMutating) {
    // Required header on mutating requests per docs/06 and CSRF defense in docs/10
    reqHeaders['X-Requested-With'] = 'fetch';
    if (!reqHeaders['Content-Type'] && !(rest.body instanceof FormData)) {
      reqHeaders['Content-Type'] = 'application/json';
    }
  }

  const res = await fetch(url, {
    ...rest,
    headers: reqHeaders,
    credentials: 'include', // httpOnly cookie session
  });

  if (!res.ok) {
    if (res.status === 401) {
      // Redirect to /login if unauthenticated and not already on /login
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`;
      }
    }

    let errorData: ApiErrorResponse | null = null;
    try {
      errorData = (await res.json()) as ApiErrorResponse;
    } catch {
      // Non-JSON response
    }

    const code = errorData?.error?.code || (res.status === 401 ? 'UNAUTHENTICATED' : 'INTERNAL');
    const message = errorData?.error?.message || `Request failed with status ${res.status}`;
    const details = errorData?.error?.details;

    throw new ApiError(res.status, code, message, details);
  }

  if (res.status === 204) {
    return {} as T;
  }

  return (await res.json()) as T;
}

export const apiClient = {
  // Auth
  async login(credentials: { email: string; password: string }): Promise<{ user: User }> {
    return request<{ user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  },

  async logout(): Promise<void> {
    return request<void>('/auth/logout', { method: 'POST' });
  },

  async getMe(): Promise<{ user: User }> {
    return request<{ user: User }>('/auth/me');
  },

  // Dashboard
  async getDashboardSummary(): Promise<DashboardSummary> {
    return request<DashboardSummary>('/dashboard/summary');
  },

  // Vendors
  async listVendors(params?: {
    page?: number;
    pageSize?: number;
    level?: RiskLevel;
    q?: string;
    sortBy?: 'score' | 'name' | 'criticality';
    sortOrder?: 'asc' | 'desc';
  }): Promise<PaginatedResponse<VendorSummary>> {
    return request<PaginatedResponse<VendorSummary>>('/vendors', { params });
  },

  async createVendor(input: VendorCreateInput): Promise<VendorSummary> {
    return request<VendorSummary>('/vendors', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  async getVendor(id: number): Promise<VendorSummary> {
    return request<VendorSummary>(`/vendors/${id}`);
  },

  async updateVendor(id: number, input: VendorUpdateInput): Promise<VendorSummary> {
    return request<VendorSummary>(`/vendors/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  },

  async deleteVendor(id: number): Promise<void> {
    return request<void>(`/vendors/${id}`, { method: 'DELETE' });
  },

  async importCsv(file: File): Promise<CsvImportResponse> {
    const formData = new FormData();
    formData.append('file', file);
    return request<CsvImportResponse>('/vendors/import', {
      method: 'POST',
      body: formData,
    });
  },

  async getVendorSignals(
    id: number,
    params?: { trust?: TrustLevel; page?: number; pageSize?: number }
  ): Promise<PaginatedResponse<SignalItem>> {
    return request<PaginatedResponse<SignalItem>>(`/vendors/${id}/signals`, { params });
  },

  async getVendorScore(id: number): Promise<ScoreDetail> {
    return request<ScoreDetail>(`/vendors/${id}/score`);
  },

  async getVendorScoreHistory(id: number): Promise<ScoreHistoryItem[]> {
    return request<ScoreHistoryItem[]>(`/vendors/${id}/score-history`);
  },

  // Matches
  async getPendingMatches(params?: { page?: number; pageSize?: number }): Promise<PaginatedResponse<PendingMatchItem>> {
    return request<PaginatedResponse<PendingMatchItem>>('/matches/pending', { params });
  },

  async confirmMatch(id: number): Promise<{ success: boolean; rescoreTriggered: boolean }> {
    return request<{ success: boolean; rescoreTriggered: boolean }>(`/matches/${id}/confirm`, {
      method: 'POST',
    });
  },

  async rejectMatch(id: number): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(`/matches/${id}/reject`, {
      method: 'POST',
    });
  },

  // Alerts
  async listAlerts(params?: {
    status?: AlertStatus;
    level?: RiskLevel;
    page?: number;
    pageSize?: number;
  }): Promise<PaginatedResponse<AlertItem>> {
    return request<PaginatedResponse<AlertItem>>('/alerts', { params });
  },

  async updateAlert(id: number, input: { status: AlertStatus; note?: string }): Promise<AlertItem> {
    return request<AlertItem>(`/alerts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  },

  // Ingestion
  async runIngestion(): Promise<{ message: string; runId: number }> {
    return request<{ message: string; runId: number }>('/ingest/run', {
      method: 'POST',
    });
  },

  async getIngestionRuns(params?: { page?: number; pageSize?: number }): Promise<PaginatedResponse<IngestionRunItem>> {
    return request<PaginatedResponse<IngestionRunItem>>('/ingestion-runs', { params });
  },

  // Fuzzy Config
  async getFuzzyConfig(): Promise<FuzzyConfigData> {
    return request<FuzzyConfigData>('/fuzzy-config');
  },

  async updateFuzzyConfig(config: Partial<FuzzyConfigData>): Promise<FuzzyConfigData> {
    return request<FuzzyConfigData>('/fuzzy-config', {
      method: 'PUT',
      body: JSON.stringify(config),
    });
  },

  // Audit Log
  async getAuditLog(params?: {
    entity?: string;
    action?: string;
    page?: number;
    pageSize?: number;
  }): Promise<PaginatedResponse<AuditLogItem>> {
    return request<PaginatedResponse<AuditLogItem>>('/audit-log', { params });
  },

  // Health
  async getHealth(): Promise<{ status: string }> {
    return request<{ status: string }>('/health');
  },

  async getReady(): Promise<{ status: string; database: string }> {
    return request<{ status: string; database: string }>('/ready');
  },
};
