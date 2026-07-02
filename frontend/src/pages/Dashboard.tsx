import { useState } from "react";
import {
  Plus, Activity, CheckCircle2, CheckCircle, XCircle,
  Loader2, AlertTriangle, BarChart3, ShieldCheck, ShieldOff,
  TrendingUp, TrendingDown, Clock, AlertCircle,
} from "lucide-react";
import { PageHeader } from "@/App";
import { RunLauncher } from "@/components/dashboard/RunLauncher";
import { RunHistoryTable } from "@/components/dashboard/RunHistoryTable";
import { KpiCard } from "@/components/KpiCard";
import { SectionGrid } from "@/components/SectionGrid";
import { SectionGroup } from "@/components/dashboard/SectionGroup";
import { RunProgressBar } from "@/components/dashboard/RunProgressBar";
import { ChartRenderer } from "@/components/dashboard/ChartRenderer";
import { AnalysisPanel } from "@/components/dashboard/AnalysisPanel";
import { MetricsCards } from "@/components/dashboard/MetricsCards";
import { AsyncBlock } from "@/components/AsyncBlock";
import { useRuns } from "@/hooks/useRuns";
import { useLatestRun } from "@/hooks/useLatestRun";
import type { AnalysisResult, SpikeEvent, Ticket } from "@/types/agents";

const CHART_LINKS: Record<string, string> = {
  delay_reasons:     "/incidents?delay=1",
  approval_required: "/incidents?approval=required",
  application_dist:  "/incidents",
  department_dist:   "/incidents",
};

const CHART_BAR_FILTER: Record<string, string> = {
  delay_reasons:    "delay_reason",
  application_dist: "application",
  department_dist:  "department",
};

export function Dashboard() {
  const [showLauncher, setShowLauncher] = useState(false);

  const { data: runs, isLoading: runsLoading, error: runsError } = useRuns();
  const { run, isLoading: runLoading, hasNoCompleted } = useLatestRun();

  const runList    = runs ?? [];
  const total      = runList.length;
  const activeRuns = runList.filter((r) => r.status === "running" || r.status === "initialized");
  const running    = activeRuns.length;
  const completed  = runList.filter((r) => r.status === "completed").length;
  const failed     = runList.filter((r) => r.status === "failed"   || r.status === "blocked").length;

  const runsState = {
    data:    runs ?? null,
    loading: runsLoading,
    error:   runsError ? String(runsError) : null,
  };

  const getCharts = (ids: string[]) =>
    (run?.chart_specs ?? []).filter((s) => ids.includes(s.id));

  const incidentCharts = getCharts(["application_dist", "approval_required", "department_dist", "delay_reasons"]);
  const ritmCharts     = getCharts(["ritm_compliance"]);
  const spikeCharts    = getCharts(["spike_analysis"]);

  return (
    <div className="fade-in">
      <PageHeader
        title="Executive Dashboard"
        subtitle="RITM operations intelligence · latest completed analysis"
        actions={
          <button onClick={() => setShowLauncher((v) => !v)} className="btn-primary">
            <Plus className="h-3.5 w-3.5" />
            {showLauncher ? "Hide Form" : "New Analysis"}
          </button>
        }
      />

      <div className="p-6 space-y-6">
        {/* Run stats */}
        <SectionGrid cols={4}>
          <KpiCard title="Total Runs"  value={total}     icon={Activity}      tone="default" hint="All time analysis runs" />
          <KpiCard title="Running"     value={running}   icon={Loader2}       tone={running > 0 ? "default" : "success"} hint={running > 0 ? "In progress now" : "No active runs"} />
          <KpiCard title="Completed"   value={completed} icon={CheckCircle2}  tone="success" hint="Successfully finished" />
          <KpiCard title="Errors"      value={failed}    icon={AlertTriangle} tone={failed > 0 ? "danger" : "success"} hint={failed > 0 ? "Failed or blocked" : "No errors"} />
        </SectionGrid>

        {showLauncher && <RunLauncher />}

        {/* Active run progress — one bar per running/initialised run */}
        {activeRuns.map((r) => (
          <RunProgressBar key={r.run_id} run={r} />
        ))}

        {runLoading && (
          <div className="flex items-center gap-2 text-xs text-ink-600 py-4">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-600" />
            Loading latest analysis…
          </div>
        )}

        {hasNoCompleted && !runLoading && (
          <div className="card border-brand-200 bg-brand-50 px-4 py-3 flex items-center gap-2 fade-in">
            <BarChart3 className="h-4 w-4 text-brand-500 shrink-0" />
            <p className="text-xs text-brand-700">
              No completed analysis yet — use <span className="font-semibold">New Analysis</span> above to run your first RITM intelligence pass.
            </p>
          </div>
        )}

        {run && (
          <>
            {/* Ticket KPI matrix */}
            {run.analysis_result?.metrics && (
              <MetricsCards
                metrics={run.analysis_result.metrics}
                chartSpecs={run.chart_specs ?? []}
                analysis={run.analysis_result}
                tickets={run.tickets ?? []}
                cardRoutes={{
                  total_tickets:        "/incidents",
                  p1_count:             "/incidents?priority=1",
                  sla_breach_rate:      "/incidents?sla=breached",
                  avg_resolution_hours: "/incidents?state=Resolved",
                  resolved_tickets:     "/incidents?state=Resolved",
                }}
              />
            )}

            {/* Group 1: Incident Analytics */}
            {(incidentCharts.length > 0 || (run.tickets ?? []).some((t) => t.sla_breached)) && (
              <SectionGroup
                label="Incident Analytics"
                description="Tickets by application, approval status, department, and delay reason"
              >
                {incidentCharts.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 w-full">
                    {incidentCharts.map((spec) => (
                      <ChartRenderer
                        key={spec.id}
                        spec={spec}
                        tickets={run.tickets ?? []}
                        analysis={run.analysis_result ?? undefined}
                        linkTo={CHART_LINKS[spec.id]}
                        barFilterParam={CHART_BAR_FILTER[spec.id]}
                      />
                    ))}
                  </div>
                )}
                <SlaBreachRootCauseCard tickets={run.tickets ?? []} />
              </SectionGroup>
            )}

            {/* Group 2: RITM Compliance */}
            {(ritmCharts.length > 0 || run.analysis_result?.ritm_summary) && (
              <SectionGroup
                label="RITM Compliance"
                description="Approval-required tickets and compliance tracking against defined rules"
              >
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  {ritmCharts.map((spec) => (
                    <ChartRenderer
                      key={spec.id}
                      spec={spec}
                      tickets={run.tickets ?? []}
                      analysis={run.analysis_result ?? undefined}
                    />
                  ))}
                  {run.analysis_result?.ritm_summary && (
                    <RitmSummaryCard analysis={run.analysis_result} />
                  )}
                </div>
              </SectionGroup>
            )}

            {/* Group 3: Spike Detection */}
            {(spikeCharts.length > 0 || (run.analysis_result?.spike_analysis?.length ?? 0) > 0) && (
              <SectionGroup
                label="Spike & Dip Detection"
                description="Anomalous incident volume periods vs rolling baseline"
              >
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  {spikeCharts.map((spec) => (
                    <ChartRenderer
                      key={spec.id}
                      spec={spec}
                      tickets={run.tickets ?? []}
                      analysis={run.analysis_result ?? undefined}
                    />
                  ))}
                  {run.analysis_result?.spike_analysis && (
                    <SpikeReasonsCard spikes={run.analysis_result.spike_analysis} />
                  )}
                </div>
              </SectionGroup>
            )}

            {/* Insights / recommendations */}
            {run.analysis_result && (
              <SectionGroup label="Insights & Recommendations">
                <AnalysisPanel analysis={run.analysis_result} />
              </SectionGroup>
            )}
          </>
        )}

        {/* Run history */}
        <SectionGroup label="Run History">
          <AsyncBlock state={runsState} emptyMessage="No runs yet — launch your first analysis above.">
            {(data) => <RunHistoryTable runs={[...data].reverse()} />}
          </AsyncBlock>
        </SectionGroup>
      </div>
    </div>
  );
}

/* ── Inline card sub-components ──────────────────────────────────── */

function RitmSummaryCard({ analysis }: { analysis: AnalysisResult }) {
  const ritm = analysis.ritm_summary;
  if (!ritm) return null;
  const pct = Math.round(ritm.compliance_rate * 100);
  return (
    <div className="card overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 bg-slate-50">
        <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
        <span className="card-title">RITM Compliance Summary</span>
        <span className={`pill ml-auto ${pct >= 80 ? "pill-green" : pct >= 60 ? "pill-yellow" : "pill-red"}`}>{pct}%</span>
      </div>
      <div className="px-4 py-4 space-y-3">
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Require Approval", value: ritm.total_requiring_approval, cls: "text-ink-900",    icon: null },
            { label: "Compliant",        value: ritm.compliant,               cls: "text-emerald-700", icon: <CheckCircle className="h-3 w-3 inline mr-0.5 text-emerald-500" /> },
            { label: "Non-Compliant",    value: ritm.non_compliant,           cls: "text-red-600",     icon: <XCircle     className="h-3 w-3 inline mr-0.5 text-red-400" /> },
          ].map(({ label, value, cls, icon }) => (
            <div key={label} className="rounded border border-slate-200 bg-slate-50 p-2 text-center">
              <p className={`text-xl font-extrabold ${cls}`}>{icon}{value}</p>
              <p className="text-[10px] text-ink-600 mt-0.5 leading-tight">{label}</p>
            </div>
          ))}
        </div>
        <div className="flex rounded-full h-1.5 overflow-hidden bg-red-100">
          <div className="bg-emerald-500 h-full transition-all" style={{ width: `${pct}%` }} />
        </div>
        <p className="text-xs text-ink-800 leading-relaxed">{ritm.detail}</p>
        {ritm.non_compliant_tickets.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {ritm.non_compliant_tickets.map((n) => (
              <span key={n} className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-red-50 text-red-700 border border-red-200">{n}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function deriveSlaRootCause(t: Ticket): { cause: string; detail: string | null } {
  if (t.delay_reason) {
    return { cause: t.delay_reason, detail: t.approval_comment ?? null };
  }
  if (t.approval_required && !t.approval_obtained) {
    return {
      cause: "Approval not obtained",
      detail: t.approval_comment ?? "Ticket required approval but none was recorded before SLA expired.",
    };
  }
  if (!t.compliant && t.compliance_reason) {
    return { cause: "Compliance violation", detail: t.compliance_reason };
  }
  if (t.close_code) {
    return { cause: `Closed as: ${t.close_code}`, detail: null };
  }
  if (t.state === "Open" || t.state === "In Progress") {
    return { cause: "Ticket still unresolved", detail: `Assigned to ${t.assignment_group || "unassigned"} — no resolution before SLA expired.` };
  }
  return { cause: "Root cause not recorded", detail: `Category: ${t.category}${t.subcategory ? ` › ${t.subcategory}` : ""}` };
}

function breachDuration(t: Ticket): string {
  const opened = new Date(t.opened_at).getTime();
  const ended  = t.resolved_at ? new Date(t.resolved_at).getTime() : Date.now();
  const hours  = Math.round((ended - opened) / 36e5);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  const rem  = hours % 24;
  return rem > 0 ? `${days}d ${rem}h` : `${days}d`;
}

const PRIORITY_CLS: Record<string, string> = {
  "1": "pill pill-red",
  "2": "pill pill-yellow",
  "3": "pill pill-green",
};

function SlaBreachRootCauseCard({ tickets }: { tickets: Ticket[] }) {
  const breached = tickets.filter((t) => t.sla_breached);
  if (!breached.length) return null;

  return (
    <div className="card overflow-hidden w-full">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 bg-slate-50">
        <AlertCircle className="h-3.5 w-3.5 text-red-500" />
        <span className="card-title">SLA Breached Tickets</span>
        <span className="pill pill-red ml-auto">{breached.length} breach{breached.length !== 1 ? "es" : ""}</span>
      </div>
      <div className="divide-y divide-slate-100 overflow-y-auto max-h-[520px]">
        {breached.map((t) => {
          const { cause, detail } = deriveSlaRootCause(t);
          const duration = breachDuration(t);
          const resolved = !!t.resolved_at;
          return (
            <div key={t.number} className="px-4 py-3 flex items-start gap-3">
              <div className="mt-0.5 shrink-0 rounded-full p-1.5 bg-red-50">
                <Clock className="h-3.5 w-3.5 text-red-500" />
              </div>
              <div className="flex-1 min-w-0">
                {/* Header row */}
                <div className="flex items-center flex-wrap gap-1.5 mb-1">
                  <span className="font-mono text-[11px] font-semibold text-ink-900 bg-slate-100 px-1.5 py-0.5 rounded">{t.number}</span>
                  <span className={PRIORITY_CLS[t.priority] ?? "pill pill-gray"}>P{t.priority}</span>
                  <span className="pill pill-gray">{t.state}</span>
                  <span className={`pill ml-auto ${resolved ? "pill-yellow" : "pill-red"}`}>
                    {resolved ? `Resolved in ${duration}` : `Open · ${duration} elapsed`}
                  </span>
                </div>
                {/* Description */}
                <p className="text-xs text-ink-800 leading-snug mb-1.5 truncate" title={t.short_description}>
                  {t.short_description}
                </p>
                {/* Root cause */}
                <div className="rounded-md bg-red-50 border border-red-100 px-3 py-2">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-red-600 mb-0.5">Root Cause</p>
                  <p className="text-xs font-medium text-red-800">{cause}</p>
                  {detail && <p className="text-[11px] text-red-700 mt-0.5 leading-snug">{detail}</p>}
                </div>
                {/* Extra context */}
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  <span className="text-[10px] text-ink-600">{t.category}{t.subcategory ? ` › ${t.subcategory}` : ""}</span>
                  {t.assignment_group && (
                    <span className="text-[10px] text-ink-500">· {t.assignment_group}</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SpikeReasonsCard({ spikes }: { spikes: SpikeEvent[] }) {
  if (!spikes.length) return null;
  return (
    <div className="card overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 bg-slate-50">
        <ShieldOff className="h-3.5 w-3.5 text-amber-500" />
        <span className="card-title">Spike Reasons</span>
        <span className="pill pill-yellow ml-auto">{spikes.length} event{spikes.length !== 1 ? "s" : ""}</span>
      </div>
      <div className="divide-y divide-slate-100 overflow-y-auto max-h-72">
        {spikes.map((s) => (
          <div key={s.period} className="px-4 py-3 flex items-start gap-2">
            <div className={`mt-0.5 shrink-0 rounded-full p-1 ${s.direction === "up" ? "bg-red-50" : "bg-emerald-50"}`}>
              {s.direction === "up"
                ? <TrendingUp   className="h-3 w-3 text-red-500" />
                : <TrendingDown className="h-3 w-3 text-emerald-600" />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                <span className="text-xs font-semibold text-ink-900">{s.period}</span>
                <span className={`pill ${s.direction === "up" ? "pill-red" : "pill-green"}`}>
                  {s.direction === "up" ? "+" : ""}{s.pct_above_baseline}%
                </span>
                <span className="pill pill-blue text-[10px]">{s.area}</span>
              </div>
              <p className="text-[11px] text-ink-700 leading-snug">{s.root_cause}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
