import { useState } from "react";
import { Eye, EyeOff, Key, Trash2, Save } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { llmApi } from "../api/client";
import { ConnectionTestButton } from "./ConnectionTestButton";
import type { CredentialOut, ProviderEntry } from "../types/llm";

interface Props {
  providerKey: string;
  providerMeta: ProviderEntry;
  existingCred: CredentialOut | undefined;
}

export function ProviderCredentialForm({ providerKey, providerMeta, existingCred }: Props) {
  const qc = useQueryClient();
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState(existingCred?.base_url ?? "");
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);

  const saveMut = useMutation({
    mutationFn: () =>
      llmApi.upsertCredential({
        provider: providerKey,
        api_key: apiKey,
        base_url: baseUrl || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["credentials"] });
      setApiKey("");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  const deleteMut = useMutation({
    mutationFn: () => llmApi.deleteCredential(providerKey),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["credentials"] }),
  });

  const activeModel = providerMeta.models.find((m) => m.tier === "fast") ?? providerMeta.models[0];

  return (
    <div className="rounded-xl border border-gray-700 bg-gray-900 p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-900/60">
            <Key className="h-4 w-4 text-brand-400" />
          </div>
          <div>
            <p className="font-semibold text-gray-100">{providerMeta.display_name}</p>
            {existingCred ? (
              <p className="text-xs text-emerald-400">Configured · {existingCred.masked_key}</p>
            ) : (
              <p className="text-xs text-gray-500">Not configured</p>
            )}
          </div>
        </div>
        {existingCred && (
          <button
            onClick={() => deleteMut.mutate()}
            disabled={deleteMut.isPending}
            className="rounded-md p-1.5 text-gray-500 hover:bg-red-900/40 hover:text-red-400 transition-colors"
            title="Remove credential"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* API Key input */}
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1.5">
          {providerKey === "ollama" ? "API Key (optional)" : "API Key"}
        </label>
        <div className="relative">
          <input
            type={showKey ? "text" : "password"}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={existingCred ? "Enter new key to replace existing" : "sk-…"}
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 pr-10 text-sm text-gray-100 placeholder-gray-600 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
          <button
            type="button"
            onClick={() => setShowKey((v) => !v)}
            className="absolute right-2.5 top-2.5 text-gray-500 hover:text-gray-300"
          >
            {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Base URL (required for Ollama/self-hosted) */}
      {providerMeta.requires_base_url && (
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Base URL</label>
          <input
            type="text"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="http://localhost:11434"
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-3 pt-1">
        <button
          onClick={() => saveMut.mutate()}
          disabled={saveMut.isPending || (!apiKey && !providerMeta.requires_base_url)}
          className="inline-flex items-center gap-2 rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-40 transition-colors"
        >
          <Save className="h-4 w-4" />
          {saveMut.isPending ? "Saving…" : saved ? "Saved!" : "Save Credential"}
        </button>

        {activeModel && (existingCred || apiKey) && (
          <ConnectionTestButton
            provider={providerKey}
            modelId={activeModel.id}
            apiKey={apiKey || undefined}
            baseUrl={baseUrl || undefined}
          />
        )}
      </div>
    </div>
  );
}
