export type RunStatus = "initialized" | "running" | "completed" | "blocked" | "failed";

export interface Ticket {
  number: string;
  short_description: string;
  priority: string;           // "1" | "2" | "3"
  state: string;
  category: string;
  subcategory: string;
  assignment_group: string;
  assigned_to: string | null;
  department: string;
  opened_at: string;
  resolved_at: string | null;
  close_code: string | null;
  business_service?: string;
  sla_breached: boolean;
  approval_required: boolean;
  approval_obtained: boolean;
  approval_comment: string | null;
  delay_reason: string | null;
  compliant: boolean;
  compliance_reason: string | null;
}

export type RuleType = "approval" | "compliance";

export interface Rule {
  id: number;
  name: string;
  rule_type: RuleType;
  rule_text: string;
  compiled_json: string | null;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface RunSummary {
  run_id: string;
  objective: string;
  status: RunStatus;
  current_step: string | null;
  started_at: string;
  completed_at: string | null;
  final_summary: string | null;
}

export interface ChartSpec {
  id: string;
  type: "bar" | "pie" | "line" | "area";
  title: string;
  subtitle?: string;
  x_key: string;
  y_keys: string[];
  data: Record<string, string | number>[];
  config: { colors: string[] };
}

export interface Metrics {
  total_tickets: number;
  p1_count: number;
  p2_count: number;
  p3_count: number;
  avg_resolution_hours: number;
  sla_breach_rate: number;
  open_tickets: number;
  resolved_tickets: number;
}

export interface TopIssue {
  issue: string;
  count: number;
  impact: "high" | "medium" | "low";
}

export interface Trend {
  observation: string;
  direction: "up" | "down" | "stable";
}

export interface Recommendation {
  action: string;
  priority: "high" | "medium" | "low";
  effort: "low" | "medium" | "high";
}

export interface SpikeEvent {
  period: string;
  date_range: string;
  incidents: number;
  baseline: number;
  direction: "up" | "down";
  pct_above_baseline: number;
  area: string;
  root_cause: string;
  tickets: string[];
}

export interface RitmSummary {
  total_requiring_approval: number;
  compliant: number;
  non_compliant: number;
  compliance_rate: number;
  non_compliant_tickets: string[];
  detail: string;
}

export interface AnalysisResult {
  summary: string;
  metrics: Metrics;
  top_issues: TopIssue[];
  trends: Trend[];
  recommendations: Recommendation[];
  spike_analysis?: SpikeEvent[];
  ritm_summary?: RitmSummary;
}

export interface RunDetail extends RunSummary {
  filters: Record<string, unknown>;
  chart_specs: ChartSpec[] | null;
  analysis_result: AnalysisResult | null;
  tickets: Ticket[] | null;
  error: string | null;
  security_flags: string[] | null;
}

export interface RunRequest {
  objective: string;
  filters: {
    priority?: string[];
    state?: string;
    days_back?: number;
    limit?: number;
  };
}

export interface RunResponse {
  run_id: string;
  status: string;
  message: string;
}

export interface AgentMessage {
  id: number;
  agent_name: string;
  role: string;
  content: string;
  created_at: string;
}
