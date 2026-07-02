import { useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Filter, TicketCheck, ArrowLeft } from "lucide-react";
import { PageHeader } from "@/App";
import { TicketTable } from "@/components/dashboard/DrillDownModal";
import { useLatestRun } from "@/hooks/useLatestRun";
import type { Ticket } from "@/types/agents";

const PRIORITIES = ["1", "2", "3"];
const STATES     = ["Open", "In Progress", "Resolved", "Closed"];

function unique<T extends string>(arr: T[]): T[] {
  return Array.from(new Set(arr)).sort() as T[];
}

export function Incidents() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { run, isLoading } = useLatestRun();

  const tickets: Ticket[] = run?.tickets ?? [];

  // Read filters from URL
  const fPriority    = params.get("priority")     ?? "";
  const fState       = params.get("state")         ?? "";
  const fCategory    = params.get("category")      ?? "";
  const fDept        = params.get("department")    ?? "";
  const fApproval    = params.get("approval")      ?? "";  // "required"
  const fSla         = params.get("sla")           ?? "";  // "breached"
  const fDelay       = params.get("delay")         ?? "";  // "1"
  const fCompliant   = params.get("compliant")     ?? "";  // "yes" | "no"
  const fDelayReason = params.get("delay_reason")  ?? "";
  const fApplication = params.get("application")   ?? "";

  const set = (key: string, val: string) => {
    const next = new URLSearchParams(params);
    if (val) { next.set(key, val); } else { next.delete(key); }
    setParams(next);
  };
  const clear = () => setParams(new URLSearchParams());

  const filtered = useMemo(() => {
    let list = tickets;
    if (fPriority)                list = list.filter((t) => t.priority === fPriority);
    if (fState)                   list = list.filter((t) => t.state === fState);
    if (fCategory)                list = list.filter((t) => t.category === fCategory);
    if (fDept)                    list = list.filter((t) => (t.department ?? "") === fDept);
    if (fApproval === "required") list = list.filter((t) => t.approval_required);
    if (fSla === "breached")      list = list.filter((t) => t.sla_breached);
    if (fDelay === "1")           list = list.filter((t) => t.sla_breached && !!t.delay_reason);
    if (fCompliant === "yes")     list = list.filter((t) => t.compliant);
    if (fCompliant === "no")      list = list.filter((t) => !t.compliant);
    if (fDelayReason)             list = list.filter((t) => t.delay_reason === fDelayReason);
    if (fApplication)             list = list.filter((t) => (t.application ?? t.category) === fApplication);
    return list;
  }, [tickets, fPriority, fState, fCategory, fDept, fApproval, fSla, fDelay, fCompliant, fDelayReason, fApplication]);

  const categories  = unique(tickets.map((t) => t.category));
  const departments = unique(tickets.map((t) => t.department ?? "").filter(Boolean));

  const hasFilter = [fPriority, fState, fCategory, fDept, fApproval, fSla, fDelay, fCompliant, fDelayReason, fApplication].some(Boolean);

  const showDelayReason      = fDelay === "1" || fSla === "breached";
  const showComplianceReason = fCompliant === "no";

  return (
    <div className="fade-in">
      <PageHeader
        title="Incident Analytics"
        subtitle={`${filtered.length} of ${tickets.length} tickets`}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(-1)}
              className="btn-ghost text-xs flex items-center gap-1"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back
            </button>
            {hasFilter && (
              <button onClick={clear} className="btn-ghost text-xs">Clear filters</button>
            )}
          </div>
        }
      />

      <div className="p-6 space-y-4">
        {/* Filter bar */}
        <div className="card px-4 py-3">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="h-3.5 w-3.5 text-ink-600" />
            <span className="text-xs font-semibold text-ink-700">Filters</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              value={fPriority}
              onChange={(e) => set("priority", e.target.value)}
              className="input h-7 text-xs pr-6 w-28"
            >
              <option value="">All priorities</option>
              {PRIORITIES.map((p) => <option key={p} value={p}>P{p}</option>)}
            </select>

            <select
              value={fState}
              onChange={(e) => set("state", e.target.value)}
              className="input h-7 text-xs pr-6 w-32"
            >
              <option value="">All states</option>
              {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>

            <select
              value={fCategory}
              onChange={(e) => set("category", e.target.value)}
              className="input h-7 text-xs pr-6 w-36"
            >
              <option value="">All categories</option>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>

            <select
              value={fDept}
              onChange={(e) => set("department", e.target.value)}
              className="input h-7 text-xs pr-6 w-40"
            >
              <option value="">All departments</option>
              {departments.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>

            <select
              value={fApproval}
              onChange={(e) => set("approval", e.target.value)}
              className="input h-7 text-xs pr-6 w-36"
            >
              <option value="">Any approval</option>
              <option value="required">Approval required</option>
            </select>

            <select
              value={fCompliant}
              onChange={(e) => set("compliant", e.target.value)}
              className="input h-7 text-xs pr-6 w-32"
            >
              <option value="">Any compliance</option>
              <option value="yes">Compliant</option>
              <option value="no">Non-compliant</option>
            </select>

            <select
              value={fSla}
              onChange={(e) => set("sla", e.target.value)}
              className="input h-7 text-xs pr-6 w-36"
            >
              <option value="">Any SLA status</option>
              <option value="breached">SLA breached</option>
            </select>

            <select
              value={fDelay}
              onChange={(e) => set("delay", e.target.value)}
              className="input h-7 text-xs pr-6 w-36"
            >
              <option value="">All tickets</option>
              <option value="1">Delayed with reason</option>
            </select>
          </div>
        </div>

        {/* Delay reasons summary */}
        {showDelayReason && filtered.length > 0 && (
          <DelayReasonsBar tickets={filtered} />
        )}

        {/* Compliance summary */}
        {showComplianceReason && filtered.length > 0 && (
          <ComplianceSummaryBar tickets={filtered} />
        )}

        {/* Ticket table */}
        {isLoading ? (
          <div className="card px-4 py-6 text-xs text-ink-600 text-center">Loading tickets…</div>
        ) : (
          <div className="card overflow-x-auto">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 bg-slate-50">
              <TicketCheck className="h-3.5 w-3.5 text-brand-600" />
              <span className="card-title">{filtered.length} ticket{filtered.length !== 1 ? "s" : ""}</span>
              {hasFilter && <span className="pill pill-blue ml-1">filtered</span>}
            </div>
            <TicketTable
              tickets={filtered}
              showDelayReason={showDelayReason}
              showComplianceReason={showComplianceReason}
              noMargin
            />
          </div>
        )}
      </div>
    </div>
  );
}

function DelayReasonsBar({ tickets }: { tickets: Ticket[] }) {
  const counts: Record<string, number> = {};
  for (const t of tickets) {
    if (t.delay_reason) counts[t.delay_reason] = (counts[t.delay_reason] ?? 0) + 1;
  }
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  if (!sorted.length) return null;
  const max = sorted[0][1];
  return (
    <div className="card px-4 py-3 space-y-1.5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-ink-600 mb-2">Delay Reasons</p>
      {sorted.map(([reason, count]) => (
        <div key={reason} className="flex items-center gap-2">
          <span className="text-xs text-ink-700 w-28 shrink-0">{reason}</span>
          <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
            <div className="h-full bg-amber-400 rounded-full transition-all" style={{ width: `${(count / max) * 100}%` }} />
          </div>
          <span className="text-xs font-bold text-ink-900 w-4 text-right">{count}</span>
        </div>
      ))}
    </div>
  );
}

function ComplianceSummaryBar({ tickets }: { tickets: Ticket[] }) {
  const counts: Record<string, number> = {};
  for (const t of tickets) {
    const reason = t.compliance_reason ?? "Unknown compliance issue";
    counts[reason] = (counts[reason] ?? 0) + 1;
  }
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  if (!sorted.length) return null;
  const max = sorted[0][1];
  return (
    <div className="card px-4 py-3 space-y-1.5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-ink-600 mb-2">Compliance Issues</p>
      {sorted.map(([reason, count]) => (
        <div key={reason} className="flex items-center gap-2">
          <span className="text-xs text-red-700 flex-1 min-w-0 truncate" title={reason}>{reason}</span>
          <div className="w-24 shrink-0 h-1.5 rounded-full bg-slate-100 overflow-hidden">
            <div className="h-full bg-red-400 rounded-full transition-all" style={{ width: `${(count / max) * 100}%` }} />
          </div>
          <span className="text-xs font-bold text-ink-900 w-4 text-right shrink-0">{count}</span>
        </div>
      ))}
    </div>
  );
}
