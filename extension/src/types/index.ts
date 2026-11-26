// ============================================================
// LeadPing AI — TypeScript Type Definitions
// ============================================================

// ---- Auth ----

export interface User {
  id: number;
  name: string;
  email: string;
  company?: string;
  created_at: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

// ---- Page Data (extracted by content script) ----

export interface PageData {
  url: string;
  title: string;
  meta_description: string;
  headings: string[];
  content: string;
  links: string[];
  opengraph: Record<string, string>;
  json_ld: Record<string, unknown>[];
  contact_info: {
    emails: string[];
    phones: string[];
  };
  technologies: string[];
  prospect?: {
    name: string;
    title: string;
    company: string;
    location: string;
  };
}

// ---- Analysis ----

export interface ICPScore {
  overall: number;
  industry_fit: number;
  company_size_fit: number;
  technology_fit: number;
  problem_fit: number;
  buying_signal_score: number;
}

export interface BuyingSignal {
  description: string;
  confidence: 'high' | 'medium' | 'low';
  source: string;
  observed_or_inferred: 'observed' | 'inferred';
}

export interface PainPoint {
  title: string;
  description: string;
  confidence: 'high' | 'medium' | 'low';
  explanation: string;
}

export interface Opportunity {
  title: string;
  description: string;
  why: string;
  potential_solution: string;
  priority: 'high' | 'medium' | 'low';
}

export interface CompanyAnalysis {
  lead_id?: number;
  company_name: string;
  website: string;
  industry: string;
  location: string;
  company_size: string;
  description: string;
  products_services: string[];
  icp_score: ICPScore;
  buying_signals: BuyingSignal[];
  pain_points: PainPoint[];
  opportunities: Opportunity[];
  recommended_pitch: string;
  lead_qualification: {
    score: 'hot' | 'warm' | 'cold';
    reasoning: string;
    next_steps: string[];
  };
  ai_summary: string;
}

// ---- Outreach ----

export interface OutreachMessage {
  channel: 'email' | 'linkedin' | 'cold_call';
  subject: string;
  body: string;
}

// ---- Leads ----

export interface Lead {
  id: number;
  company_name: string;
  website: string;
  industry: string;
  location: string;
  company_size: string;
  icp_score: ICPScore;
  buying_signals: BuyingSignal[];
  pain_points: PainPoint[];
  opportunities: Opportunity[];
  ai_summary: string;
  outreach: OutreachMessage[];
  source_url: string;
  status: 'new' | 'contacted' | 'qualified' | 'converted' | 'lost';
  notes: string;
  created_at: string;
}

// ---- Usage & Subscription ----

export interface UsageInfo {
  analyses_used: number;
  analyses_limit: number;
  outreach_used: number;
  outreach_limit: number;
  leads_saved: number;
  leads_limit: number;
}

export interface SubscriptionInfo {
  plan: string;
  status: 'active' | 'expired' | 'cancelled' | 'trial';
  features: string[];
}

// ---- API ----

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

// ---- Messages between extension parts ----

export type ExtensionMessage =
  | { type: 'EXTRACT_PAGE_DATA' }
  | { type: 'PAGE_DATA_RESULT'; data: PageData }
  | { type: 'OPEN_SIDE_PANEL' }
  | { type: 'GET_CURRENT_TAB_URL' }
  | { type: 'CURRENT_TAB_URL'; url: string }
  | { type: 'REGISTER_SIDE_PANEL' }
  | { type: 'CLEAR_SIDE_PANEL_OWNER'; tabId?: number | null }
  | { type: 'CLOSE_SIDE_PANEL'; keepTabId?: number | null }
  | { type: 'FORCE_CLOSE_SIDE_PANEL' };
