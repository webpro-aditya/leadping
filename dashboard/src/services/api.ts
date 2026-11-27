import axios from 'axios';
import type {
  ApiResponse,
  AuthTokens,
  IcpProfile,
  Lead,
  LeadFilters,
  PaginatedResponse,
  User,
  UsageInfo,
  SubscriptionInfo,
  WebhookConfig,
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

// Handle 401 → redirect to login (unless already on a public auth/legal route)
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      const path = window.location.pathname;
      const publicPaths = ['/login', '/register', '/forgot-password', '/reset-password', '/verify-email', '/privacy', '/terms'];
      if (!publicPaths.includes(path)) {
        window.location.href = '/login';
      }
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
  forgotPassword: (email: string) =>
    api.post<ApiResponse<[]>>('/auth/forgot-password', { email }),
  resetPassword: (payload: { token: string; email: string; password: string; password_confirmation: string }) =>
    api.post<ApiResponse<[]>>('/auth/reset-password', payload),
  resendVerification: () =>
    api.post<ApiResponse<{ verified: boolean }>>('/auth/email/resend'),
  changePassword: (payload: { current_password: string; password: string; password_confirmation: string }) =>
    api.post<ApiResponse<[]>>('/auth/change-password', payload),
  deleteAccount: (current_password: string) =>
    api.delete<ApiResponse<[]>>('/auth/account', { data: { current_password } }),
  me: () => api.get<ApiResponse<User>>('/auth/me'),
  logout: () => api.post('/auth/logout'),
};

// ── Leads ──
export const leadsApi = {
  list: (filters: LeadFilters = {}) =>
    api.get<ApiResponse<PaginatedResponse<Lead>>>('/leads', { params: filters }),
  stats: () =>
    api.get<ApiResponse<{ total: number; high_potential: number; medium_potential: number; low_potential: number }>>('/leads/stats'),
  get: (id: number) => api.get<ApiResponse<Lead>>(`/leads/${id}`),
  update: (id: number, data: Partial<Pick<Lead, 'status' | 'notes'>>) =>
    api.put<ApiResponse<Lead>>(`/leads/${id}`, data),
  delete: (id: number) => api.delete<ApiResponse<null>>(`/leads/${id}`),
  bulkDelete: (ids: number[]) =>
    api.post<ApiResponse<null>>('/leads/bulk-delete', { ids }),
  exportCsv: (filters: LeadFilters = {}) =>
    api.get('/leads-export', { params: filters, responseType: 'blob' }),
};

// ── Usage ──
export const usageApi = {
  get: () => api.get<ApiResponse<UsageInfo>>('/usage'),
};

// ── Subscription ──
export const subscriptionApi = {
  get: () => api.get<ApiResponse<SubscriptionInfo>>('/subscription'),
  plans: () => api.get<ApiResponse<{ plans: unknown[] }>>('/plans'),
};

// ── Payments ──
export interface CheckoutOrderResponse {
  transaction_id: number;
  gateway: string;
  order_id: string;
  amount: number;
  currency: string;
  public_key: string;
  billing_cycle: 'monthly' | 'annual';
  checkout_payload: {
    key: string;
    amount: number;
    currency: string;
    order_id: string;
    name: string;
    description: string;
    prefill?: { name?: string; email?: string };
    notes?: Record<string, string>;
  };
}

export const paymentsApi = {
  gateways: () =>
    api.get<ApiResponse<{ default_gateway: string; gateways: Array<{ id: string; label: string; currency: string; is_default: boolean; configured: boolean }> }>>('/payments/gateways'),
  createCheckout: (payload: { plan: string | number; billing_cycle: 'monthly' | 'annual'; gateway?: string }) =>
    api.post<ApiResponse<CheckoutOrderResponse>>('/payments/checkout', payload),
  verifyPayment: (payload: {
    gateway?: string;
    gateway_order_id: string;
    gateway_payment_id: string;
    gateway_signature: string;
  }) => api.post<ApiResponse<{ transaction: unknown; subscription: unknown; plan: { name: string; display_name: string } }>>('/payments/verify', payload),
  transactions: () => api.get<ApiResponse<PaginatedResponse<{
    id: number;
    gateway: string;
    billing_cycle: 'monthly' | 'annual';
    amount: number;
    currency: string;
    gateway_payment_id?: string;
    status: 'pending' | 'paid' | 'failed' | 'refunded';
    created_at: string;
    plan?: { name: string; display_name: string };
  }>>>('/payments/transactions'),
};

// ── Settings & Integrations ──
export const settingsApi = {
  getIcp: () =>
    api.get<ApiResponse<{ supported: boolean; plan: string; icp_profile: IcpProfile }>>('/settings/icp'),
  updateIcp: (payload: IcpProfile) =>
    api.put<ApiResponse<{ supported: boolean; plan: string; icp_profile: IcpProfile }>>('/settings/icp', payload),
};

export const integrationsApi = {
  getWebhook: () => api.get<ApiResponse<WebhookConfig>>('/integrations/webhook'),
  updateWebhook: (payload: { webhook_url: string; webhook_enabled: boolean; rotate_secret?: boolean }) =>
    api.put<ApiResponse<WebhookConfig>>('/integrations/webhook', payload),
  testWebhook: () =>
    api.post<ApiResponse<{ delivered: boolean; status_code: number; latency_ms: number }>>('/integrations/webhook/test'),
  pushLeadToWebhook: (leadId: number) =>
    api.post<ApiResponse<{ delivered: boolean; status_code: number; latency_ms: number }>>(`/leads/${leadId}/push-webhook`),
};

export default api;
