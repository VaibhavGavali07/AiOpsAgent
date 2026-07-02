export type Tier = "reasoning" | "balanced" | "fast";

export interface ModelEntry {
  id: string;
  tier: Tier;
  context_window: number;
  description: string;
}

export interface ProviderEntry {
  display_name: string;
  litellm_prefix: string;
  requires_base_url: boolean;
  models: ModelEntry[];
}

export interface ProvidersResponse {
  providers: Record<string, ProviderEntry>;
}

export interface CredentialOut {
  provider: string;
  display_name: string;
  masked_key: string;
  base_url: string | null;
  configured: boolean;
}

export interface AgentAssignment {
  agent_name: string;
  provider: string;
  model_id: string;
  base_url: string | null;
  litellm_model: string;
}

export interface Recommendation {
  agent_name: string;
  tier: Tier;
  rationale: string;
  provider: string;
  model_id: string;
  model_description: string;
}

export interface ConnectionTestResult {
  ok: boolean;
  provider: string;
  model_id: string;
  latency_ms: number | null;
  error: string | null;
}

export const AGENT_DISPLAY_NAMES: Record<string, string> = {
  ceo_supervisor:        "CEO / Supervisor",
  analytical:            "Analytical",
  graphical_representer: "Graphical / Representer",
  security:              "Security",
  servicenow_pulling:    "ServiceNow Pulling",
};

export const TIER_BADGE: Record<Tier, { label: string; color: string }> = {
  reasoning: { label: "Reasoning",  color: "bg-violet-900 text-violet-200" },
  balanced:  { label: "Balanced",   color: "bg-blue-900 text-blue-200" },
  fast:      { label: "Fast",       color: "bg-emerald-900 text-emerald-200" },
};
