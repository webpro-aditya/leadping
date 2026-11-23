// ============================================================
// API Client — axios-based, points to Laravel backend
// ============================================================

import axios, { AxiosInstance, AxiosError } from 'axios';
import { getAuthToken } from './storage';
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
  (error: AxiosError<ApiResponse<null>>) => {
    if (error.response) {
      const status = error.response.status;
      const message =
        error.response.data?.message || error.message;

      if (status === 401) {
        return Promise.reject(new ApiError('Your session has expired. Please log in again.', status));
      }
      if (status === 403) {
        return Promise.reject(new ApiError('You do not have permission to perform this action.', status));
      }
      if (status === 429) {
        return Promise.reject(new ApiError('You have reached your usage limit. Please upgrade your plan.', status));
      }
      if (status >= 500) {
        return Promise.reject(new ApiError('Server error. Please try again later.', status));
      }
      return Promise.reject(new ApiError(message, status));
    }

    if (error.code === 'ECONNABORTED') {
      return Promise.reject(new ApiError('The request timed out. The AI analysis may take a moment — please try again.', 0));
    }

    return Promise.reject(new ApiError('No internet connection. Please check your network.', 0));
  }
);

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
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
  const { data } = await apiClient.post<ApiResponse<CompanyAnalysis>>(
    '/analyze/company',
    pageData
  );
  return data;
}

// ---- Leads ----

export async function saveLeadApi(
  lead: Omit<Lead, 'id' | 'created_at'>
): Promise<ApiResponse<Lead>> {
  const { data } = await apiClient.post<ApiResponse<Lead>>('/leads', lead);
  return data;
}

export async function fetchLeads(): Promise<ApiResponse<Lead[]>> {
  const { data } = await apiClient.get<ApiResponse<Lead[]>>('/leads');
  return data;
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
  variant?: string
): Promise<ApiResponse<OutreachMessage>> {
  const { data } = await apiClient.post<ApiResponse<OutreachMessage>>(
    `/leads/${leadId}/outreach`,
    { channel, variant }
  );
  return data;
}

// ---- Usage & Subscription ----

export async function fetchUsage(): Promise<ApiResponse<UsageInfo>> {
  const { data } = await apiClient.get<ApiResponse<UsageInfo>>('/usage');
  return data;
}

export async function fetchSubscription(): Promise<ApiResponse<SubscriptionInfo>> {
  const { data } = await apiClient.get<ApiResponse<SubscriptionInfo>>(
    '/subscription'
  );
  return data;
}

export default apiClient;
