const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// --- Types ---

export interface FeedbackResponse {
  feedback_id: string;
  tracking_id: string;
  status: string;
  message?: string;
}

export interface PriorityBreakdown {
  urgency: number;
  size: number;
  vulnerability: number;
  decay: number;
  raw_score: number;
}

export interface ClusterListItem {
  id: string;
  title: string;
  category: string;
  ward_id: string;
  size: number;
  priority: number;
  priority_breakdown_json: PriorityBreakdown | null;
  status: string;
  created_at: string;
  updated_at: string;
  h3_cell?: string;
  lat?: number;
  lng?: number;
}

export interface SampleComplaint {
  id: string;
  tracking_id?: string;
  language: string;
  transcript?: string;
  media_urls?: string[];
  created_at: string;
}

export interface ClusterDetail extends ClusterListItem {
  summary?: string;
  sample_complaints: SampleComplaint[];
  ticket?: {
    id: string;
    department: string;
    officer: string;
    sla_due: string;
    status: string;
    escalation_level: number;
    history_json: { status: string; timestamp: string; note?: string }[];
    resolution?: {
      id: string;
      action_taken?: string;
      after_media_url?: string;
      vision_check_json?: VisionCheckResult;
      confirmations_yes: number;
      confirmations_no: number;
      reopened_bool: boolean;
    };
  };
  suggested_action?: string;
}

export interface VisionCheckResult {
  location_match: boolean;
  defect_resolved: boolean;
  confidence: number;
  reason: string;
}

export interface H3CellMetrics {
  h3_cell: string;
  volume: number;
  resolved: number;
  resolution_pct: number;
  median_resolution_hours?: number;
}

export interface DepartmentMetrics {
  department: string;
  volume: number;
  resolved: number;
  resolution_pct: number;
  median_resolution_hours?: number;
}

export interface CategoryMetrics {
  category: string;
  volume: number;
  count?: number;
}

export interface PublicMetricsResponse {
  total_complaints: number;
  total_resolved: number;
  resolution_rate: number;
  median_resolution_hours?: number;
  active_clusters: number;
  h3_cells: H3CellMetrics[];
  departments: DepartmentMetrics[];
  categories: CategoryMetrics[];
  summary?: {
    total_volume?: number;
    resolution_pct?: number;
    median_resolution_hours?: number;
    top_categories?: CategoryMetrics[];
  };
  hexes?: H3CellMetrics[];
}

// --- Helpers ---

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Accept': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`API error ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

// --- API calls ---

export async function ingestComplaint(formData: FormData): Promise<FeedbackResponse> {
  const res = await fetch(`${API_BASE}/ingest`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`API error ${res.status}: ${text}`);
  }
  return res.json();
}

export async function getClusters(): Promise<ClusterListItem[]> {
  return apiFetch<ClusterListItem[]>('/clusters');
}

export async function getCluster(id: string): Promise<ClusterDetail> {
  return apiFetch<ClusterDetail>(`/clusters/${id}`);
}

export async function updateTicketStatus(ticketId: string, status: string): Promise<unknown> {
  return apiFetch(`/tickets/${ticketId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
}

export async function resolveTicket(ticketId: string, formData: FormData): Promise<unknown> {
  const res = await fetch(`${API_BASE}/tickets/${ticketId}/resolve`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`API error ${res.status}: ${text}`);
  }
  return res.json();
}

export async function confirmResolution(feedbackId: string, confirmed: boolean): Promise<unknown> {
  return apiFetch(`/citizen/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ feedback_id: feedbackId, confirmed }),
  });
}

export async function seedDemo(): Promise<unknown> {
  return apiFetch(`/demo/seed`, { method: 'POST' });
}

export async function simulateReopen(): Promise<unknown> {
  return apiFetch(`/demo/simulate-reopen`, { method: 'POST' });
}

export async function getPublicMetrics(): Promise<PublicMetricsResponse> {
  return apiFetch<PublicMetricsResponse>('/public/metrics');
}

