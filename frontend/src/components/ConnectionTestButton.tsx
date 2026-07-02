import { useState } from "react";
import { CheckCircle, Loader2, WifiOff, Zap } from "lucide-react";
import { llmApi } from "../api/client";
import type { ConnectionTestResult } from "../types/llm";

interface Props {
  provider: string;
  modelId: string;
  apiKey?: string;
  baseUrl?: string;
}

export function ConnectionTestButton({ provider, modelId, apiKey, baseUrl }: Props) {
  const [result, setResult] = useState<ConnectionTestResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function runTest() {
    setLoading(true);
    setResult(null);
    try {
      const res = await llmApi.testConnection({ provider, model_id: modelId, api_key: apiKey, base_url: baseUrl });
      setResult(res);
    } catch {
      setResult({ ok: false, provider, model_id: modelId, latency_ms: null, error: "Request failed" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={runTest}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50 transition-colors"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
        Test Connection
      </button>

      {result && (
        <div
          className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm ${
            result.ok
              ? "bg-emerald-900/40 text-emerald-300 border border-emerald-700"
              : "bg-red-900/40 text-red-300 border border-red-700"
          }`}
        >
          {result.ok ? (
            <>
              <CheckCircle className="h-4 w-4 shrink-0" />
              <span>Connected · {result.latency_ms}ms</span>
            </>
          ) : (
            <>
              <WifiOff className="h-4 w-4 shrink-0" />
              <span className="truncate max-w-xs">{result.error ?? "Failed"}</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
