import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL ?? "/api";
const API_KEY = import.meta.env.VITE_API_KEY ?? "";

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
    ...(API_KEY ? { "X-API-Key": API_KEY } : {}),
  },
});

// ── LLM Settings ──────────────────────────────────────────────────────────────

import type {
  AgentAssignment,
  ConnectionTestResult,
  CredentialOut,
  ProvidersResponse,
  Recommendation,
} from "../types/llm";

export const llmApi = {
  getProviders: () =>
    apiClient.get<ProvidersResponse>("/settings/llm/providers").then((r) => r.data),

  getCredentials: () =>
    apiClient.get<CredentialOut[]>("/settings/llm/credentials").then((r) => r.data),

  upsertCredential: (payload: { provider: string; api_key: string; base_url?: string }) =>
    apiClient.post("/settings/llm/credentials", payload).then((r) => r.data),

  deleteCredential: (provider: string) =>
    apiClient.delete(`/settings/llm/credentials/${provider}`).then((r) => r.data),

  testConnection: (payload: {
    provider: string;
    model_id: string;
    api_key?: string;
    base_url?: string;
  }) =>
    apiClient.post<ConnectionTestResult>("/settings/llm/test", payload).then((r) => r.data),

  getRecommendations: (provider: string) =>
    apiClient
      .get<Recommendation[]>("/settings/llm/recommendations", { params: { provider } })
      .then((r) => r.data),

  getAgentAssignments: () =>
    apiClient.get<AgentAssignment[]>("/settings/llm/agents").then((r) => r.data),

  upsertAgentAssignment: (payload: {
    agent_name: string;
    provider: string;
    model_id: string;
    base_url?: string;
  }) => apiClient.post("/settings/llm/agents", payload).then((r) => r.data),
};

// ── Agent Runs ────────────────────────────────────────────────────────────────

import type {
  AgentMessage,
  Rule,
  RuleType,
  RunDetail,
  RunRequest,
  RunResponse,
  RunSummary,
} from "../types/agents";

export const agentsApi = {
  startRun: (body: RunRequest) =>
    apiClient.post<RunResponse>("/agents/run", body).then((r) => r.data),

  listRuns: () =>
    apiClient.get<RunSummary[]>("/agents/runs").then((r) => r.data),

  getRun: (runId: string) =>
    apiClient.get<RunDetail>(`/agents/runs/${runId}`).then((r) => r.data),

  getMessages: (runId: string) =>
    apiClient.get<AgentMessage[]>(`/agents/runs/${runId}/messages`).then((r) => r.data),
};

// ── Rules ─────────────────────────────────────────────────────────────────────

export const rulesApi = {
  list: (rule_type?: RuleType) =>
    apiClient.get<Rule[]>("/rules", { params: rule_type ? { rule_type } : {} }).then((r) => r.data),

  create: (body: { name: string; rule_type: RuleType; rule_text: string }) =>
    apiClient.post<Rule>("/rules", body).then((r) => r.data),

  update: (id: number, body: { enabled?: boolean; rule_text?: string; name?: string }) =>
    apiClient.patch<Rule>(`/rules/${id}`, body).then((r) => r.data),

  remove: (id: number) =>
    apiClient.delete(`/rules/${id}`).then((r) => r.data),
};
