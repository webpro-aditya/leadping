// ============================================================
// API Client — axios-based, points to Laravel backend
// ============================================================

import axios, { AxiosInstance, AxiosError } from 'axios';
import { getAuthToken, removeAuthToken, removeStoredUser } from './storage';
import { normalizeTargetUrl } from '../utils/url';
import type {
  ApiResponse,
  AuthResponse,
  CompanyAnalysis,
  Lead,
  OutreachMessage,
  PageData,
  UsageInfo,
  SubscriptionInfo,
  User,
} from '../types';

const API_BASE_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) ||
  'http://localhost:8000/api';

const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  timeout: 60000,
});

// Attach bearer token to every request
apiClient.interceptors.request.use(async (config) => {
  const token = await getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Normalize error responses
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiResponse<{ error_code?: string } | null>>) => {
    if (error.response) {
      const status = error.response.status;
      const message = error.response.data?.message || error.message;
      const errorCode =
        (error.response.data?.data as { error_code?: string } | null | undefined)?.error_code;

      if (status === 401) {
        void Promise.all([removeAuthToken(), removeStoredUser()]);
        return Promise.reject(new ApiError('Your session has expired. Please log in again.', status, errorCode));
      }
      if (status === 403) {
        return Promise.reject(new ApiError('You do not have permission to perform this action.', status, errorCode));
      }
      if (status === 429) {
        return Promise.reject(
          new ApiError(
            message || 'Rate limit or quota exceeded. Please try again later.',
            status,
            errorCode
          )
        );
      }
      if (status >= 500) {
        return Promise.reject(new ApiError('Server error. Please try again later.', status, errorCode));
      }
      return Promise.reject(new ApiError(message, status, errorCode));
    }

    if (error.code === 'ECONNABORTED') {
      return Promise.reject(new ApiError('The request timed out. The AI analysis may take a moment — please try again.', 0));
    }

    return Promise.reject(new ApiError('No internet connection. Please check your network.', 0));
  }
);

export class ApiError extends Error {
  status: number;
  errorCode?: string;
  constructor(message: string, status: number, errorCode?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errorCode = errorCode;
  }
}

const inFlightRequests = new Map<string, Promise<unknown>>();

function dedupeRequest<T>(key: string, factory: () => Promise<T>): Promise<T> {
  const existing = inFlightRequests.get(key) as Promise<T> | undefined;
  if (existing) {
    return existing;
  }

  const promise = factory().finally(() => {
    inFlightRequests.delete(key);
  });
  inFlightRequests.set(key, promise);
  return promise;
}

async function retryTransient<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof ApiError) {
      const isTransient =
        err.status === 502 ||
        err.status === 503 ||
        err.status === 504 ||
        (err.status === 429 && err.errorCode !== 'insufficient_quota');

      if (isTransient) {
        const delayMs = 1200 + Math.floor(Math.random() * 600);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        return fn();
      }
    }
    throw err;
  }
}

// ---- Auth endpoints ----

export async function registerUser(
  name: string,
  email: string,
  password: string,
  password_confirmation: string
): Promise<ApiResponse<AuthResponse>> {
  const { data } = await apiClient.post<ApiResponse<AuthResponse>>(
    '/auth/register',
    { name, email, password, password_confirmation }
  );
  return data;
}

export async function loginUser(
  email: string,
  password: string
): Promise<ApiResponse<AuthResponse>> {
  const { data } = await apiClient.post<ApiResponse<AuthResponse>>(
    '/auth/login',
    { email, password }
  );
  return data;
}

export async function logoutUser(): Promise<ApiResponse<null>> {
  const { data } = await apiClient.post<ApiResponse<null>>('/auth/logout');
  return data;
}

export async function fetchUser(): Promise<ApiResponse<User>> {
  const { data } = await apiClient.get<ApiResponse<User>>('/user');
  return data;
}

// ---- Analysis ----

export async function analyzeCompany(
  pageData: PageData
): Promise<ApiResponse<CompanyAnalysis>> {
  const key = `analyze:${normalizeTargetUrl(pageData.url)}`;
  return dedupeRequest(key, () =>
    retryTransient(async () => {
      const { data } = await apiClient.post<ApiResponse<CompanyAnalysis>>(
        '/analyze/company',
        pageData
      );
      return data;
    })
  );
}

// ---- Leads ----

export async function saveLeadApi(
  lead: Omit<Lead, 'id' | 'created_at'>
): Promise<ApiResponse<Lead>> {
  const { data } = await apiClient.post<ApiResponse<Lead>>('/leads', lead);
  return data;
}

function normalizeLead(raw: Record<string, unknown>): Lead {
  const company = (raw.company as Record<string, unknown> | undefined) ?? {};
  const rawIcp = raw.icp_score;
  const icpScoreObj =
    typeof rawIcp === 'number'
      ? {
          overall: Number(raw.overall_score ?? rawIcp),
          industry_fit: rawIcp,
          company_size_fit: rawIcp,
          technology_fit: rawIcp,
          problem_fit: Number(raw.pain_fit_score ?? rawIcp),
          buying_signal_score: Number(raw.buying_intent_score ?? rawIcp),
        }
      : ((rawIcp as Lead['icp_score']) ?? {
          overall: 0,
          industry_fit: 0,
          company_size_fit: 0,
          technology_fit: 0,
          problem_fit: 0,
          buying_signal_score: 0,
        });

  return {
    id: Number(raw.id),
    company_name: String(raw.company_name || company.name || 'Unknown Company'),
    website: String(raw.website || company.website || raw.source_url || ''),
    industry: String(raw.industry || company.industry || ''),
    location: String(raw.location || company.location || ''),
    company_size: String(raw.company_size || company.company_size || ''),
    icp_score: icpScoreObj,
    buying_signals: Array.isArray(raw.buying_signals)
      ? raw.buying_signals
      : Array.isArray(raw.signals)
      ? raw.signals
      : [],
    pain_points: Array.isArray(raw.pain_points) ? raw.pain_points : [],
    opportunities: Array.isArray(raw.opportunities) ? raw.opportunities : [],
    ai_summary: String(raw.ai_summary || ''),
    outreach: Array.isArray(raw.outreach)
      ? raw.outreach
      : Array.isArray(raw.outreach_messages)
      ? raw.outreach_messages
      : [],
    source_url: String(raw.source_url || ''),
    status: (raw.status as Lead['status']) || 'new',
    notes: String(raw.notes || ''),
    created_at: String(raw.created_at || ''),
  };
}

export interface PagedLeadsResult {
  leads: Lead[];
  current_page: number;
  last_page: number;
  total: number;
}

export async function fetchLeadsPaged(params: {
  page?: number;
  per_page?: number;
  search?: string;
} = {}): Promise<PagedLeadsResult> {
  const query: Record<string, string | number> = {
    compact: 1,
    page: params.page ?? 1,
    per_page: params.per_page ?? 20,
  };
  if (params.search && params.search.trim()) {
    query.search = params.search.trim();
  }

  const { data } = await apiClient.get<ApiResponse<unknown>>('/leads', { params: query });
  const payload = data.data as {
    data?: Record<string, unknown>[];
    current_page?: number;
    last_page?: number;
    total?: number;
  } | Record<string, unknown>[];

  if (Array.isArray(payload)) {
    const leads = payload.map(normalizeLead);
    return { leads, current_page: 1, last_page: 1, total: leads.length };
  }

  const leads = (payload?.data ?? []).map(normalizeLead);
  return {
    leads,
    current_page: Number(payload?.current_page ?? 1),
    last_page: Number(payload?.last_page ?? 1),
    total: Number(payload?.total ?? leads.length),
  };
}

export async function fetchLeads(): Promise<ApiResponse<Lead[]>> {
  const paged = await fetchLeadsPaged({ page: 1, per_page: 20 });
  return {
    success: true,
    data: paged.leads,
    message: 'Leads retrieved successfully',
  };
}

export async function fetchLead(id: number): Promise<ApiResponse<Lead>> {
  const { data } = await apiClient.get<ApiResponse<Lead>>(`/leads/${id}`);
  return data;
}

export async function updateLead(
  id: number,
  updates: Partial<Lead>
): Promise<ApiResponse<Lead>> {
  const { data } = await apiClient.put<ApiResponse<Lead>>(
    `/leads/${id}`,
    updates
  );
  return data;
}

export async function deleteLead(id: number): Promise<ApiResponse<null>> {
  const { data } = await apiClient.delete<ApiResponse<null>>(`/leads/${id}`);
  return data;
}

// ---- Outreach ----

export async function generateOutreach(
  leadId: number,
  channel?: string,
  tone?: string,
  regenerate = false
): Promise<ApiResponse<OutreachMessage>> {
  const key = `outreach:${leadId}:${channel || ''}:${tone || ''}:${regenerate}`;
  return dedupeRequest(key, async () => {
    const { data } = await apiClient.post<ApiResponse<OutreachMessage>>(
      `/leads/${leadId}/outreach`,
      { channel, tone, regenerate }
    );
    return data;
  });
}

// ---- Usage & Subscription ----

export async function fetchUsage(): Promise<ApiResponse<UsageInfo>> {
  const { data } = await apiClient.get<ApiResponse<Record<string, unknown>>>('/usage');
  const raw = data.data ?? {};
  const analyses = (raw.analyses as { used?: number; limit?: number } | undefined) ?? {};
  const outreach = (raw.outreach as { used?: number; limit?: number } | undefined) ?? {};
  const leads = (raw.leads as { used?: number; limit?: number } | undefined) ?? {};

  return {
    ...data,
    data: {
      analyses_used: Number(raw.analyses_used ?? analyses.used ?? 0),
      analyses_limit: Number(raw.analyses_limit ?? analyses.limit ?? 10),
      outreach_used: Number(raw.outreach_used ?? outreach.used ?? 0),
      outreach_limit: Number(raw.outreach_limit ?? outreach.limit ?? 5),
      leads_saved: Number(raw.leads_saved ?? leads.used ?? 0),
      leads_limit: Number(raw.leads_limit ?? leads.limit ?? 25),
    },
  };
}

export async function fetchSubscription(): Promise<ApiResponse<SubscriptionInfo>> {
  const { data } = await apiClient.get<ApiResponse<Record<string, unknown>>>(
    '/subscription'
  );
  const raw = data.data ?? {};
  const sub = (raw.subscription as { status?: string } | null | undefined) ?? null;
  const planObj = (raw.plan as { name?: string; features?: string[] | string } | undefined) ?? {};
  const featuresRaw = planObj.features ?? raw.features;
  const features = Array.isArray(featuresRaw)
    ? featuresRaw.map(String)
    : typeof featuresRaw === 'string'
    ? [featuresRaw]
    : [];

  return {
    ...data,
    data: {
      plan: typeof raw.plan === 'string' ? raw.plan : String(planObj.name || 'free'),
      status: ((sub?.status || raw.status || 'active') as SubscriptionInfo['status']),
      features,
    },
  };
}

export default apiClient;
