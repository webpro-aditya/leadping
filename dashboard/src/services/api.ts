import axios from 'axios';
import type {
  ApiResponse,
  AuthTokens,
  Lead,
  LeadFilters,
  PaginatedResponse,
  User,
  UsageInfo,
  SubscriptionInfo,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
});

// Attach bearer token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 → redirect to login
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  },
);

// ── Auth ──
export const authApi = {
  login: (email: string, password: string) =>
    api.post<ApiResponse<AuthTokens>>('/auth/login', { email, password }),
  register: (name: string, email: string, password: string, password_confirmation: string) =>
    api.post<ApiResponse<{ message: string }>>('/auth/register', {
      name,
      email,
      password,
      password_confirmation,
    }),
  me: () => api.get<ApiResponse<User>>('/auth/me'),
  logout: () => api.post('/auth/logout'),
};

// ── Leads ──
export const leadsApi = {
  list: (filters: LeadFilters = {}) =>
    api.get<ApiResponse<PaginatedResponse<Lead>>>('/leads', { params: filters }),
  get: (id: number) => api.get<ApiResponse<Lead>>(`/leads/${id}`),
  update: (id: number, data: Partial<Pick<Lead, 'status' | 'notes'>>) =>
    api.put<ApiResponse<Lead>>(`/leads/${id}`, data),
  delete: (id: number) => api.delete<ApiResponse<null>>(`/leads/${id}`),
  bulkDelete: (ids: number[]) =>
    api.post<ApiResponse<null>>('/leads/bulk-delete', { ids }),
  exportCsv: (filters: LeadFilters = {}) =>
    api.get('/leads/export', { params: filters, responseType: 'blob' }),
};

// ── Usage ──
export const usageApi = {
  get: () => api.get<ApiResponse<UsageInfo>>('/usage'),
};

// ── Subscription ──
export const subscriptionApi = {
  get: () => api.get<ApiResponse<SubscriptionInfo>>('/subscription'),
};

export default api;
