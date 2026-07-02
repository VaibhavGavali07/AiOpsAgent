import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/App";
import { AnalysisPanel } from "@/components/dashboard/AnalysisPanel";
import { ChartGrid } from "@/components/dashboard/ChartGrid";
import { MetricsCards } from "@/components/dashboard/MetricsCards";
import { SecurityFlags } from "@/components/dashboard/SecurityFlags";
import { StatusBadge } from "@/components/Badges";
import { useRun, useRunMessages } from "@/hooks/useRuns";
import {
  ArrowLeft, Bot, ChevronDown, ChevronUp,
  Loader2, ShieldOff, XCircle, Clock, Calendar,
} from "lucide-react";

function fmt(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}
function duration(start: string, end?: string | null) {
  const s = Math.floor((new Date(end ?? new Date()).getTime() - new Date(start).getTime()) / 1000);
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;
}

function SkeletonState() {
  return (
    <div className="space-y-5 p-6">
      <div className="flex items-center gap-2.5 text-xs text-brand-700 bg-brand-50 border border-brand-100 rounded-lg px-4 py-3">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-600" />
        AI agents are running — polling for updates every 2.5 s…
      </div>
      <div className="grid grid-cols-5 gap-3">
        {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-24 rounded-lg bg-slate-100" />)}
      </div>
      <div className="flex flex-wrap gap-4">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-72 rounded-lg bg-slate-100" style={{ width: "460px" }} />)}
      </div>
    </div>
  );
}

function InfoCard({ children, tone = "default" }: {
  children: React.ReactNode;
  tone?: "default" | "warn" | "error";
}) {
  const cls = {
    default: "border-slate-200  bg-white",
    warn:    "border-amber-200  bg-amber-50",
    error:   "border-red-200    bg-red-50",
  }[tone];
  return <div className={`card ${cls} p-5`}>{children}</div>;
}

export function RunDetail() {
  const { runId } = useParams<{ runId: string }>();
  const { data: run, isLoading, error } = useRun(runId!);
  const [showMessages, setShowMessages] = useState(false);
  const isTerminal = run && ["completed", "blocked", "failed"].includes(run.status);
  const { data: messages = [] } = useRunMessages(runId!, showMessages && !!isTerminal);

  const pageTitle = run?.objective ?? "Run Detail";
  const pageSubtitle = run
    ? `${run.status} · #${runId?.slice(-8)}`
    : undefined;

  if (isLoading || (!run && !error)) {
    return (
      <div className="fade-in">
        <PageHeader title="Run Detail" />
        <SkeletonState />
      </div>
    );
  }

  if (error || !run) {
    return (
      <div className="fade-in">
        <PageHeader title="Run Detail" />
        <div className="p-6">
          <Link to="/" className="inline-flex items-center gap-1.5 text-xs text-ink-600 hover:text-brand-600 mb-4">
            <ArrowLeft className="h-3.5 w-3.5" /> Dashboard
          </Link>
          <InfoCard tone="error">
            <p className="text-sm font-semibold text-red-700">Run not found or could not be loaded.</p>
          </InfoCard>
        </div>
      </div>
    );
  }

  const isRunning   = run.status === "initialized" || run.status === "running";
  const isBlocked   = run.status === "blocked";
  const isFailed    = run.status === "failed";
  const isCompleted = run.status === "completed";

  return (
    <div className="fade-in">
      <PageHeader
        title={pageTitle}
        subtitle={pageSubtitle}
        actions={
          <Link to="/" className="btn-ghost text-xs gap-1.5">
            <ArrowLeft className="h-3.5 w-3.5" /> Dashboard
          </Link>
        }
      />

      <div className="p-6 space-y-5">
        {/* Run meta strip */}
        <div className="card px-4 py-3 flex items-center flex-wrap gap-3">
          <StatusBadge status={run.status} />
          <span className="flex items-center gap-1 text-[11px] text-ink-600">
            <Calendar className="h-3 w-3" /> Started {fmt(run.started_at)}
          </span>
          {run.completed_at && (
            <span className="flex items-center gap-1 text-[11px] text-ink-600">
              <Clock className="h-3 w-3" /> Duration {duration(run.started_at, run.completed_at)}
            </span>
          )}
          <span className="ml-auto text-[11px] font-mono text-ink-600">#{runId?.slice(-8)}</span>
        </div>

        {isRunning && <SkeletonState />}

        {isBlocked && (
          <InfoCard tone="warn">
            <div className="flex items-start gap-3">
              <ShieldOff className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-ink-900 mb-1">Blocked by Security Check</p>
                <p className="text-sm text-ink-800">{run.final_summary || run.error}</p>
              </div>
            </div>
          </InfoCard>
        )}

        {isFailed && (
          <InfoCard tone="error">
            <div className="flex items-start gap-3">
              <XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-ink-900 mb-1">Analysis Failed</p>
                <p className="text-sm font-mono text-red-700">{run.error || "Unknown error"}</p>
              </div>
            </div>
          </InfoCard>
        )}

        {isCompleted && (
          <>
            {run.final_summary && (
              <InfoCard>
                <p className="text-[10px] font-bold uppercase tracking-widest text-ink-600 mb-2">Executive Summary</p>
                <p className="text-sm text-ink-800 leading-relaxed">{run.final_summary}</p>
              </InfoCard>
            )}

            {run.security_flags && run.security_flags.length > 0 && (
              <SecurityFlags flags={run.security_flags} />
            )}

            {run.analysis_result?.metrics && (
              <MetricsCards
                metrics={run.analysis_result.metrics}
                chartSpecs={run.chart_specs ?? []}
                analysis={run.analysis_result}
                tickets={run.tickets ?? []}
              />
            )}

            {run.chart_specs && run.chart_specs.length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-ink-600 mb-3">
                  Charts &amp; Visualisations
                  <span className="normal-case font-normal ml-2 text-ink-600/60">— drag ↘ to resize · click to expand</span>
                </p>
                <ChartGrid
                  specs={run.chart_specs}
                  tickets={run.tickets ?? []}
                  analysis={run.analysis_result ?? undefined}
                />
              </div>
            )}

            {run.analysis_result && <AnalysisPanel analysis={run.analysis_result} />}
          </>
        )}

        {isBlocked && run.security_flags && run.security_flags.length > 0 && (
          <SecurityFlags flags={run.security_flags} />
        )}

        {/* Agent messages (collapsible) */}
        {isTerminal && (
          <div>
            <button
              onClick={() => setShowMessages((v) => !v)}
              className="btn-ghost text-xs gap-1.5"
            >
              <Bot className="h-3.5 w-3.5" />
              Agent messages
              {showMessages ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>

            {showMessages && messages.length > 0 && (
              <div className="mt-3 space-y-2 fade-in">
                {messages.map((msg) => (
                  <div key={msg.id} className="card p-3">
                    <div className="flex items-center gap-2 text-[10px] text-ink-600 mb-2">
                      <Bot className="h-3 w-3" />
                      <span className="font-mono text-brand-600">{msg.agent_name}</span>
                      <span>·</span>
                      <span className="pill pill-gray">{msg.role}</span>
                      <span className="ml-auto">{fmt(msg.created_at)}</span>
                    </div>
                    <pre className="text-[11px] text-ink-600 whitespace-pre-wrap break-all max-h-40 overflow-y-auto font-mono">
                      {msg.content}
                    </pre>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
