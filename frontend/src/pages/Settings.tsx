import { useQuery } from "@tanstack/react-query";
import { Bot, Key, Loader2, Settings as SettingsIcon, ShieldCheck, ClipboardCheck } from "lucide-react";
import { llmApi } from "../api/client";
import { AgentModelTable } from "../components/AgentModelTable";
import { ProviderCredentialForm } from "../components/ProviderCredentialForm";
import { RulesPanel } from "../components/RulesPanel";

type Tab = "providers" | "agents" | "approval_rules" | "compliance_rules";

import { useState } from "react";

export function Settings() {
  const [tab, setTab] = useState<Tab>("providers");

  const { data: providersResp, isLoading: loadingProviders } = useQuery({
    queryKey: ["providers"],
    queryFn: llmApi.getProviders,
  });

  const { data: credentials = [], isLoading: loadingCreds } = useQuery({
    queryKey: ["credentials"],
    queryFn: llmApi.getCredentials,
  });

  const { data: assignments = [], isLoading: loadingAssignments } = useQuery({
    queryKey: ["agentAssignments"],
    queryFn: llmApi.getAgentAssignments,
  });

  const loading = loadingProviders || loadingCreds || loadingAssignments;

  const credMap = Object.fromEntries(credentials.map((c) => [c.provider, c]));

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-900">
          <SettingsIcon className="h-5 w-5 text-brand-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-100">LLM Configuration</h1>
          <p className="text-sm text-gray-400">
            Connect your preferred AI provider and assign models to each agent
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 rounded-xl border border-gray-700 bg-gray-900 p-1 w-fit">
        {(
          [
            { id: "providers" as Tab,        label: "API Credentials",  icon: Key },
            { id: "agents" as Tab,           label: "Agent Models",     icon: Bot },
            { id: "approval_rules" as Tab,   label: "Approval Rules",   icon: ShieldCheck },
            { id: "compliance_rules" as Tab, label: "Compliance Rules", icon: ClipboardCheck },
          ] as const
        ).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              tab === id
                ? "bg-brand-600 text-white"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Rules tabs render independently of LLM provider loading */}
      {tab === "approval_rules" && (
        <RulesPanel
          ruleType="approval"
          title="Approval Rule"
          description="Define when a RITM ticket requires approval. The LLM uses these rules when analysing ticket descriptions and comments to flag tickets that need sign-off."
          placeholder="e.g. Any change to production infrastructure costing more than $5,000 requires manager approval."
        />
      )}

      {tab === "compliance_rules" && (
        <RulesPanel
          ruleType="compliance"
          title="Compliance Rule"
          description="Define compliance criteria for RITM tickets. Tickets that violate any enabled rule will be flagged as non-compliant in the dashboard."
          placeholder="e.g. All database schema changes must include a rollback plan in the comments before closure."
        />
      )}

      {(tab === "providers" || tab === "agents") && (
        loading ? (
          <div className="flex items-center justify-center py-20 text-gray-500">
            <Loader2 className="h-6 w-6 animate-spin mr-3" />
            Loading configuration…
          </div>
        ) : (
          <>
            {/* Provider Credentials Tab */}
            {tab === "providers" && providersResp && (
              <div className="space-y-4">
                <p className="text-sm text-gray-400">
                  API keys are encrypted with AES-256 (Fernet) before being stored. They are never
                  returned in plaintext.
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  {Object.entries(providersResp.providers).map(([key, meta]) => (
                    <ProviderCredentialForm
                      key={key}
                      providerKey={key}
                      providerMeta={meta}
                      existingCred={credMap[key]}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Agent Model Assignments Tab */}
            {tab === "agents" && providersResp && (
              <div className="space-y-4">
                <p className="text-sm text-gray-400">
                  Select a provider and model for each agent. Use{" "}
                  <span className="text-brand-400">Apply Recommendations</span> to auto-fill
                  sensible defaults based on each agent's reasoning needs.
                </p>
                <AgentModelTable
                  providers={providersResp.providers}
                  assignments={assignments}
                />
              </div>
            )}
          </>
        )
      )}
    </div>
  );
}
