// ── User & Auth ──
export interface User {
  id: number;
  name: string;
  email: string;
  plan: string;
  created_at: string;
}

export interface AuthTokens {
  access_token: string;
  token_type: string;
}

// ── Company & Lead ──
export interface Company {
  name: string;
  website: string;
  industry: string;
  description: string;
  size?: string;
  location?: string;
  founded?: string;
  technologies?: string[];
}

export interface BuyingSignal {
  signal: string;
  confidence: 'high' | 'medium' | 'low';
  evidence: string;
}

export interface PainPoint {
  pain_point: string;
  severity: 'high' | 'medium' | 'low';
  explanation: string;
}

export interface Opportunity {
  opportunity: string;
  priority: 'high' | 'medium' | 'low';
  approach: string;
}

export interface OutreachMessage {
  type: string;
  subject?: string;
  body: string;
}

export interface Lead {
  id: number;
  user_id: number;
  url: string;
  company: Company;
  icp_score: number;
  icp_breakdown?: Record<string, number>;
  buying_signals: BuyingSignal[];
  pain_points: PainPoint[];
  opportunities: Opportunity[];
  summary: string;
  status: LeadStatus;
  notes?: string;
  outreach_messages?: OutreachMessage[];
  created_at: string;
  updated_at: string;
}

export type LeadStatus =
  | 'new'
  | 'qualified'
  | 'contacted'
  | 'replied'
  | 'meeting'
  | 'won'
  | 'lost';

// ── Usage & Subscription ──
export interface UsageInfo {
  analyses_used: number;
  analyses_limit: number;
  outreach_used: number;
  outreach_limit: number;
  leads_used: number;
  leads_limit: number;
}

export interface Plan {
  name: string;
  price: number;
  analyses_limit: number;
  outreach_limit: number;
  leads_limit: number;
  features: string[];
}

export interface SubscriptionInfo {
  current_plan: Plan;
  status: string;
  expires_at?: string;
}

// ── API ──
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

// ── Filters ──
export interface LeadFilters {
  search?: string;
  status?: LeadStatus | '';
  score_min?: number;
  score_max?: number;
  date_from?: string;
  date_to?: string;
  sort_by?: 'icp_score' | 'created_at' | 'company_name';
  sort_dir?: 'asc' | 'desc';
  page?: number;
  per_page?: number;
}
