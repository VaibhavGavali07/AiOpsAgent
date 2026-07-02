import { useState } from "react";
import { Bot, ChevronDown, RefreshCw, Save } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { llmApi } from "../api/client";
import type { AgentAssignment, ModelEntry, ProviderEntry, Recommendation } from "../types/llm";
import { AGENT_DISPLAY_NAMES, TIER_BADGE } from "../types/llm";

interface Props {
  providers: Record<string, ProviderEntry>;
  assignments: AgentAssignment[];
}

interface RowState {
  provider: string;
  modelId: string;
  baseUrl: string;
}

export function AgentModelTable({ providers, assignments }: Props) {
  const qc = useQueryClient();
  const existingMap = Object.fromEntries(assignments.map((a) => [a.agent_name, a]));

  const agentNames = [
    "ceo_supervisor",
    "analytical",
    "graphical_representer",
    "security",
    "servicenow_pulling",
  ];

  const [rows, setRows] = useState<Record<string, RowState>>(() =>
    Object.fromEntries(
      agentNames.map((name) => [
        name,
        {
          provider: existingMap[name]?.provider ?? "anthropic",
          modelId: existingMap[name]?.model_id ?? "",
          baseUrl: existingMap[name]?.base_url ?? "",
        },
      ])
    )
  );

  const [activeRecommendProvider, setActiveRecommendProvider] = useState("anthropic");

  const { data: _recommendations, refetch: fetchRecs, isFetching: loadingRecs } = useQuery<
    Recommendation[]
  >({
    queryKey: ["recommendations", activeRecommendProvider],
    queryFn: () => llmApi.getRecommendations(activeRecommendProvider),
    enabled: false,
  });

  function applyRecommendations(recs: Recommendation[]) {
    setRows((prev) => {
      const next = { ...prev };
      for (const rec of recs) {
        if (rec.agent_name in next) {
          next[rec.agent_name] = {
            provider: rec.provider,
            modelId: rec.model_id,
            baseUrl: next[rec.agent_name].baseUrl,
          };
        }
      }
      return next;
    });
  }

  const saveMut = useMutation({
    mutationFn: async () => {
      for (const [agentName, row] of Object.entries(rows)) {
        if (row.modelId) {
          await llmApi.upsertAgentAssignment({
            agent_name: agentName,
            provider: row.provider,
            model_id: row.modelId,
            base_url: row.baseUrl || undefined,
          });
        }
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["agentAssignments"] }),
  });

  function modelsForProvider(providerKey: string): ModelEntry[] {
    return providers[providerKey]?.models ?? [];
  }

  return (
    <div className="space-y-4">
      {/* Auto-recommend toolbar */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-700 bg-gray-900 p-4">
        <span className="text-sm text-gray-400">Auto-fill from recommendations for:</span>
        <div className="relative">
          <select
            value={activeRecommendProvider}
            onChange={(e) => setActiveRecommendProvider(e.target.value)}
            className="appearance-none rounded-lg border border-gray-700 bg-gray-800 pl-3 pr-8 py-1.5 text-sm text-gray-100 focus:border-brand-500 focus:outline-none"
          >
            {Object.entries(providers).map(([key, p]) => (
              <option key={key} value={key}>
                {p.display_name}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-2 h-4 w-4 text-gray-400" />
        </div>
        <button
          onClick={async () => {
            const res = await fetchRecs();
            if (res.data) applyRecommendations(res.data);
          }}
          disabled={loadingRecs}
          className="inline-flex items-center gap-2 rounded-md border border-brand-600 px-3 py-1.5 text-sm text-brand-400 hover:bg-brand-900/30 disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`h-4 w-4 ${loadingRecs ? "animate-spin" : ""}`} />
          Apply Recommendations
        </button>
      </div>

      {/* Agent rows */}
      <div className="overflow-x-auto rounded-xl border border-gray-700">
        <table className="min-w-full divide-y divide-gray-800">
          <thead className="bg-gray-900">
            <tr>
              {["Agent", "Provider", "Model", "Tier"].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800 bg-gray-950">
            {agentNames.map((agentName) => {
              const row = rows[agentName];
              const models = modelsForProvider(row.provider);
              const selectedModel = models.find((m) => m.id === row.modelId);
              const tier = selectedModel?.tier;

              return (
                <tr key={agentName} className="hover:bg-gray-900/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Bot className="h-4 w-4 text-brand-400 shrink-0" />
                      <span className="text-sm font-medium text-gray-200">
                        {AGENT_DISPLAY_NAMES[agentName] ?? agentName}
                      </span>
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <div className="relative w-36">
                      <select
                        value={row.provider}
                        onChange={(e) =>
                          setRows((prev) => ({
                            ...prev,
                            [agentName]: { ...prev[agentName], provider: e.target.value, modelId: "" },
                          }))
                        }
                        className="w-full appearance-none rounded-lg border border-gray-700 bg-gray-800 pl-2.5 pr-7 py-1.5 text-sm text-gray-100 focus:border-brand-500 focus:outline-none"
                      >
                        {Object.entries(providers).map(([key, p]) => (
                          <option key={key} value={key}>
                            {p.display_name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-2 top-2 h-4 w-4 text-gray-400" />
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    {models.length > 0 ? (
                      <div className="relative w-52">
                        <select
                          value={row.modelId}
                          onChange={(e) =>
                            setRows((prev) => ({
                              ...prev,
                              [agentName]: { ...prev[agentName], modelId: e.target.value },
                            }))
                          }
                          className="w-full appearance-none rounded-lg border border-gray-700 bg-gray-800 pl-2.5 pr-7 py-1.5 text-sm text-gray-100 focus:border-brand-500 focus:outline-none"
                        >
                          <option value="">— select —</option>
                          {models.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.id}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-2 top-2 h-4 w-4 text-gray-400" />
                      </div>
                    ) : (
                      <input
                        type="text"
                        value={row.modelId}
                        onChange={(e) =>
                          setRows((prev) => ({
                            ...prev,
                            [agentName]: { ...prev[agentName], modelId: e.target.value },
                          }))
                        }
                        placeholder="e.g. llama3:8b"
                        className="w-48 rounded-lg border border-gray-700 bg-gray-800 px-2.5 py-1.5 text-sm text-gray-100 placeholder-gray-600 focus:border-brand-500 focus:outline-none"
                      />
                    )}
                  </td>

                  <td className="px-4 py-3">
                    {tier ? (
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${TIER_BADGE[tier].color}`}
                      >
                        {TIER_BADGE[tier].label}
                      </span>
                    ) : (
                      <span className="text-gray-600 text-xs">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => saveMut.mutate()}
          disabled={saveMut.isPending}
          className="inline-flex items-center gap-2 rounded-md bg-brand-600 px-5 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50 transition-colors"
        >
          <Save className="h-4 w-4" />
          {saveMut.isPending ? "Saving…" : "Save All Assignments"}
        </button>
      </div>
    </div>
  );
}
