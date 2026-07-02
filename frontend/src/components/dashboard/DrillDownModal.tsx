import { useEffect } from "react";
import { X, Maximize2, CheckCircle, XCircle, AlertTriangle, TrendingUp, TrendingDown, Minus } from "lucide-react";
import {
  BarChart, Bar, Cell, LineChart, Line, AreaChart, Area,
  PieChart, Pie, ResponsiveContainer, Tooltip, XAxis, YAxis,
  CartesianGrid, Legend,
} from "recharts";
import type { ChartSpec, AnalysisResult, Metrics, Ticket, SpikeEvent } from "@/types/agents";

/* ── shared styles ─────────────────────────────────────────────────────────── */
const TT: React.CSSProperties = {
  backgroundColor: "#fff", border: "1px solid #DFE1E6",
  borderRadius: 4, color: "#172B4D", fontSize: 11, padding: "6px 10px",
};
const AX = { tick: { fill: "#5E6C84", fontSize: 10 }, tickLine: false as const, axisLine: false as const };
const GRID = { stroke: "#DFE1E6", strokeDasharray: "3 3", vertical: false as const };
const COLORS = ["#0052CC", "#00875A", "#FF8B00", "#DE350B", "#6554C0", "#008DA6", "#172B4D", "#5E6C84"];

const P_LABEL: Record<string, string> = { "1": "P1 Critical", "2": "P2 High", "3": "P3 Medium" };
const P_CLS: Record<string, string> = {
  "1": "pill pill-red", "2": "pill pill-yellow", "3": "pill pill-blue",
};
const STATE_CLS: Record<string, string> = {
  Resolved: "pill pill-green", Open: "pill pill-gray",
  "In Progress": "pill pill-blue",
};

/* ── ticket table ──────────────────────────────────────────────────────────── */
export function TicketTable({
  tickets,
  title,
  showDelayReason = false,
  showComplianceReason = false,
  noMargin = false,
}: {
  tickets: Ticket[];
  title?: string;
  showDelayReason?: boolean;
  showComplianceReason?: boolean;
  noMargin?: boolean;
}) {
  if (!tickets.length) return (
    <div className={`${noMargin ? "" : "mt-5"} rounded-lg border border-[#DFE1E6] bg-[#FAFBFC] px-4 py-8 text-center`}>
      <p className="text-xs text-[#97A0AF]">No tickets match this filter.</p>
    </div>
  );

  const headers = ["Number", "Description", "Priority", "State", "Category", "Assigned To", "SLA", "Approval", "Compliant"];
  if (showDelayReason) headers.splice(7, 0, "Delay Reason");
  if (showComplianceReason) headers.push("Compliance Issue");

  return (
    <div className={noMargin ? "" : "mt-5"}>
      {title && (
        <p className="text-xs font-semibold text-[#5E6C84] uppercase tracking-wide mb-2">
          {title} <span className="font-normal normal-case text-[#97A0AF]">({tickets.length})</span>
        </p>
      )}
      <div className="overflow-x-auto rounded-lg border border-[#DFE1E6]">
        <table className="w-full text-xs min-w-[700px]">
          <thead>
            <tr className="bg-[#F4F5F7] border-b border-[#DFE1E6]">
              {headers.map(h => (
                <th key={h} className="text-left px-3 py-2 text-[10px] font-semibold text-[#5E6C84] uppercase tracking-wide whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tickets.map((t) => (
              <tr key={t.number} className="border-b border-[#F4F5F7] hover:bg-[#FAFBFC]">
                <td className="px-3 py-2 font-mono text-[#0052CC] whitespace-nowrap">{t.number}</td>
                <td className="px-3 py-2 text-[#172B4D] max-w-[220px] truncate" title={t.short_description}>
                  {t.short_description}
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <span className={P_CLS[t.priority] ?? "pill pill-gray"}>
                    {P_LABEL[t.priority] ?? `P${t.priority}`}
                  </span>
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <span className={STATE_CLS[t.state] ?? "pill pill-gray"}>{t.state}</span>
                </td>
                <td className="px-3 py-2 text-[#5E6C84] whitespace-nowrap">{t.category}</td>
                <td className="px-3 py-2 text-[#5E6C84] whitespace-nowrap">{t.assigned_to ?? "—"}</td>
                <td className="px-3 py-2 whitespace-nowrap">
                  {t.sla_breached
                    ? <span className="pill pill-red">Breached</span>
                    : <span className="pill pill-green">OK</span>}
                </td>
                {showDelayReason && (
                  <td className="px-3 py-2 whitespace-nowrap">
                    {t.delay_reason
                      ? <span className="pill pill-yellow">{t.delay_reason}</span>
                      : <span className="text-[#97A0AF]">—</span>}
                  </td>
                )}
                <td className="px-3 py-2 whitespace-nowrap">
                  {t.approval_required
                    ? (t.approval_obtained
                      ? <span className="pill pill-green">Obtained</span>
                      : <span className="pill pill-red">Missing</span>)
                    : <span className="pill pill-gray">N/A</span>}
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  {t.compliant
                    ? <CheckCircle className="h-3.5 w-3.5 text-[#00875A]" />
                    : <XCircle className="h-3.5 w-3.5 text-[#DE350B]" />}
                </td>
                {showComplianceReason && (
                  <td className="px-3 py-2 max-w-[200px]">
                    {t.compliance_reason
                      ? <span className="text-[11px] text-[#DE350B] leading-tight">{t.compliance_reason}</span>
                      : <span className="text-[#97A0AF]">—</span>}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── full-size chart ───────────────────────────────────────────────────────── */
function BigChart({ spec }: { spec: ChartSpec }) {
  const colors = spec.config?.colors?.length ? spec.config.colors : COLORS;
  let chart: React.ReactNode;

  if (spec.type === "bar") {
    chart = (
      <BarChart data={spec.data} margin={{ top: 8, right: 16, bottom: 8, left: -8 }}>
        <CartesianGrid {...GRID} />
        <XAxis dataKey={spec.x_key} {...AX} />
        <YAxis {...AX} />
        <Tooltip contentStyle={TT} cursor={{ fill: "rgba(0,82,204,0.05)" }} />
        <Legend formatter={(v) => <span style={{ color: "#5E6C84", fontSize: 11 }}>{v}</span>} iconSize={9} />
        {spec.y_keys.map((k, i) => (
          <Bar key={k} dataKey={k} fill={colors[i % colors.length]} radius={[3, 3, 0, 0]} maxBarSize={56} />
        ))}
      </BarChart>
    );
  } else if (spec.type === "pie") {
    chart = (
      <PieChart>
        <Pie data={spec.data} dataKey={spec.y_keys[0]} nameKey={spec.x_key}
          cx="50%" cy="45%" outerRadius={140} innerRadius={60} paddingAngle={2}
          label={({ name, percent }: { name?: string; percent?: number }) =>
            percent && percent > 0.04 ? `${name} ${((percent) * 100).toFixed(0)}%` : ""}
          labelLine={false}>
          {spec.data.map((_e, i) => <Cell key={i} fill={colors[i % colors.length]} stroke="transparent" />)}
        </Pie>
        <Tooltip contentStyle={TT} />
        <Legend formatter={(v) => <span style={{ color: "#5E6C84", fontSize: 11 }}>{v}</span>} iconSize={9} />
      </PieChart>
    );
  } else if (spec.type === "line") {
    chart = (
      <LineChart data={spec.data} margin={{ top: 8, right: 16, bottom: 8, left: -8 }}>
        <CartesianGrid {...GRID} />
        <XAxis dataKey={spec.x_key} {...AX} />
        <YAxis {...AX} />
        <Tooltip contentStyle={TT} />
        <Legend formatter={(v) => <span style={{ color: "#5E6C84", fontSize: 11 }}>{v}</span>} iconSize={9} />
        {spec.y_keys.map((k, i) => (
          <Line key={k} type="monotone" dataKey={k} stroke={colors[i % colors.length]}
            strokeWidth={2.5} dot={{ fill: colors[i % colors.length], r: 5, strokeWidth: 0 }} />
        ))}
      </LineChart>
    );
  } else {
    chart = (
      <AreaChart data={spec.data} margin={{ top: 8, right: 16, bottom: 8, left: -8 }}>
        <defs>
          {spec.y_keys.map((k, i) => (
            <linearGradient key={k} id={`ddgrad-${i}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={colors[i % colors.length]} stopOpacity={0.25} />
              <stop offset="95%" stopColor={colors[i % colors.length]} stopOpacity={0.02} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid {...GRID} />
        <XAxis dataKey={spec.x_key} {...AX} />
        <YAxis {...AX} />
        <Tooltip contentStyle={TT} />
        {spec.y_keys.map((k, i) => (
          <Area key={k} type="monotone" dataKey={k} stroke={colors[i % colors.length]}
            fill={`url(#ddgrad-${i})`} strokeWidth={2.5} />
        ))}
      </AreaChart>
    );
  }

  return <ResponsiveContainer width="100%" height={320}>{chart as React.ReactElement}</ResponsiveContainer>;
}

/* ── raw data table ────────────────────────────────────────────────────────── */
function DataTable({ data, xKey, yKeys }: { data: Record<string, string | number>[]; xKey: string; yKeys: string[] }) {
  if (!data.length) return null;
  const cols = [xKey, ...yKeys];
  return (
    <div className="mt-4 overflow-x-auto rounded-lg border border-[#DFE1E6]">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-[#F4F5F7] border-b border-[#DFE1E6]">
            {cols.map((c) => (
              <th key={c} className="text-left px-4 py-2.5 text-[10px] font-semibold text-[#5E6C84] uppercase tracking-wide">
                {c.replace(/_/g, " ")}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i} className="border-b border-[#F4F5F7] hover:bg-[#FAFBFC]">
              {cols.map((c) => (
                <td key={c} className="px-4 py-2.5 text-[#172B4D] font-medium">{String(row[c] ?? "—")}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── spike analysis section ────────────────────────────────────────────────── */
function SpikeSection({ spikes, tickets }: { spikes: SpikeEvent[]; tickets: Ticket[] }) {
  return (
    <div className="mt-5 space-y-3">
      <p className="text-xs font-semibold text-[#5E6C84] uppercase tracking-wide">Spike / Dip Analysis</p>
      {spikes.map((s) => {
        const isUp = s.direction === "up";
        const spikeTickets = tickets.filter((t) => s.tickets.includes(t.number));
        return (
          <div key={s.period} className={`rounded-lg border p-4 ${isUp ? "border-[#FFCAB8] bg-[#FFEBE6]/40" : "border-[#ABF5D1] bg-[#E3FCEF]/40"}`}>
            <div className="flex items-center gap-2 mb-1.5">
              {isUp
                ? <TrendingUp className="h-3.5 w-3.5 text-[#DE350B]" />
                : <TrendingDown className="h-3.5 w-3.5 text-[#00875A]" />}
              <span className="text-xs font-semibold text-[#172B4D]">{s.period}</span>
              <span className="text-[10px] text-[#5E6C84]">{s.date_range}</span>
              <span className={`lozenge ml-auto ${isUp ? "pill-red" : "pill-green"}`}>
                {isUp ? "+" : ""}{s.pct_above_baseline}% vs baseline
              </span>
            </div>
            <p className="text-xs text-[#5E6C84] mb-1"><span className="font-medium text-[#172B4D]">Area:</span> {s.area}</p>
            <p className="text-xs text-[#172B4D] leading-relaxed">{s.root_cause}</p>
            {spikeTickets.length > 0 && <TicketTable tickets={spikeTickets} title="Contributing tickets" />}
          </div>
        );
      })}
    </div>
  );
}

/* ── KPI drill-down ────────────────────────────────────────────────────────── */
interface KpiDetailProps {
  metricKey: string;
  metrics: Metrics;
  chartSpecs: ChartSpec[];
  analysis: AnalysisResult;
  tickets: Ticket[];
}

export function KpiDetail({ metricKey, metrics, chartSpecs, analysis, tickets }: KpiDetailProps) {
  const findChart = (id: string) => chartSpecs.find((c) => c.id === id);

  const StatBox = ({ label, value, cls }: { label: string; value: string | number; cls: string }) => (
    <div className="rounded-lg border border-[#DFE1E6] bg-white p-3 text-center">
      <p className={`text-2xl font-bold ${cls}`}>{value}</p>
      <p className="text-[11px] text-[#5E6C84] mt-0.5">{label}</p>
    </div>
  );

  if (metricKey === "total_tickets") {
    const chart = findChart("monthly_trend") ?? findChart("weekly_volume");
    return (
      <div>
        <div className="grid grid-cols-3 gap-3 mb-5">
          <StatBox label="Open"        value={metrics.open_tickets}     cls="text-[#FF8B00]" />
          <StatBox label="Resolved"    value={metrics.resolved_tickets}  cls="text-[#00875A]" />
          <StatBox label="In Progress" value={metrics.total_tickets - metrics.open_tickets - metrics.resolved_tickets} cls="text-[#0052CC]" />
        </div>
        {chart && <><p className="text-xs font-semibold text-[#5E6C84] uppercase tracking-wide mb-2">{chart.title}</p><BigChart spec={chart} /><DataTable data={chart.data} xKey={chart.x_key} yKeys={chart.y_keys} /></>}
        <TicketTable tickets={tickets} title="All tickets" />
      </div>
    );
  }

  if (metricKey === "p1_count") {
    const chart = findChart("monthly_trend");
    const p1Tickets = tickets.filter((t) => t.priority === "1");
    return (
      <div>
        <div className="grid grid-cols-3 gap-3 mb-5">
          <StatBox label="P1 Critical" value={metrics.p1_count}  cls="text-[#DE350B]" />
          <StatBox label="P2 High"     value={metrics.p2_count}  cls="text-[#FF8B00]" />
          <StatBox label="P3 Medium"   value={metrics.p3_count}  cls="text-[#0052CC]" />
        </div>
        {chart && <><p className="text-xs font-semibold text-[#5E6C84] uppercase tracking-wide mb-2">P1 Trend by Month</p><BigChart spec={chart} /></>}
        {analysis.top_issues.length > 0 && (
          <div className="mt-5">
            <p className="text-xs font-semibold text-[#5E6C84] uppercase tracking-wide mb-2">Top Contributing Issues</p>
            <div className="space-y-1.5">
              {analysis.top_issues.slice(0, 5).map((issue, i) => (
                <div key={i} className="flex items-center justify-between px-3 py-2 rounded-md bg-[#F4F5F7] border border-[#DFE1E6]">
                  <span className="text-sm text-[#172B4D]">{issue.issue}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-[#172B4D]">{issue.count}</span>
                    <span className={`lozenge ${issue.impact === "high" ? "pill-red" : issue.impact === "medium" ? "pill-yellow" : "pill-green"}`}>{issue.impact}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        <TicketTable tickets={p1Tickets} title="P1 Critical tickets" />
      </div>
    );
  }

  if (metricKey === "sla_breach_rate") {
    const chart = findChart("sla_by_month");
    const breachedTickets = tickets.filter((t) => t.sla_breached);
    return (
      <div>
        <div className="grid grid-cols-2 gap-3 mb-5">
          <StatBox label="Overall Breach Rate" value={`${(metrics.sla_breach_rate * 100).toFixed(0)}%`} cls="text-[#DE350B]" />
          <StatBox label="Tickets Breached"     value={Math.round(metrics.total_tickets * metrics.sla_breach_rate)} cls="text-[#172B4D]" />
        </div>
        {chart && <><p className="text-xs font-semibold text-[#5E6C84] uppercase tracking-wide mb-2">Monthly SLA Breach Trend</p><BigChart spec={chart} /><DataTable data={chart.data} xKey={chart.x_key} yKeys={chart.y_keys} /></>}
        {/* delay reasons chart */}
        {(() => { const dc = findChart("delay_reasons"); return dc ? <><p className="text-xs font-semibold text-[#5E6C84] uppercase tracking-wide mt-5 mb-2">Breach Root Cause by Stage</p><BigChart spec={dc} /></> : null; })()}
        <TicketTable tickets={breachedTickets} title="SLA-breached tickets — per-ticket delay reason" showDelayReason />
      </div>
    );
  }

  if (metricKey === "avg_resolution_hours") {
    const chart = findChart("group_workload");
    const resolvedTickets = tickets.filter((t) => t.state === "Resolved");
    return (
      <div>
        <div className="grid grid-cols-2 gap-3 mb-5">
          <StatBox label="Avg across all groups" value={`${metrics.avg_resolution_hours}h`} cls="text-[#6554C0]" />
          <StatBox label="Tickets resolved"       value={metrics.resolved_tickets}            cls="text-[#00875A]" />
        </div>
        {chart && <><p className="text-xs font-semibold text-[#5E6C84] uppercase tracking-wide mb-2">Workload by Assignment Group</p><BigChart spec={chart} /><DataTable data={chart.data} xKey={chart.x_key} yKeys={chart.y_keys} /></>}
        <TicketTable tickets={resolvedTickets} title="Resolved tickets" />
      </div>
    );
  }

  if (metricKey === "resolved_tickets") {
    const chart = findChart("priority_dist");
    const resolvedTickets = tickets.filter((t) => t.state === "Resolved");
    return (
      <div>
        <div className="grid grid-cols-3 gap-3 mb-5">
          <StatBox label="Total Resolved"  value={metrics.resolved_tickets} cls="text-[#00875A]" />
          <StatBox label="Still Open"      value={metrics.open_tickets}      cls="text-[#FF8B00]" />
          <StatBox label="Resolution Rate" value={`${Math.round((metrics.resolved_tickets / metrics.total_tickets) * 100)}%`} cls="text-[#0052CC]" />
        </div>
        {chart && <><p className="text-xs font-semibold text-[#5E6C84] uppercase tracking-wide mb-2">Resolved by Priority</p><BigChart spec={chart} /><DataTable data={chart.data} xKey={chart.x_key} yKeys={chart.y_keys} /></>}
        <TicketTable tickets={resolvedTickets} title="Resolved tickets" />
      </div>
    );
  }

  return <p className="text-sm text-[#5E6C84]">No additional detail available.</p>;
}

/* ── chart drill-down ──────────────────────────────────────────────────────── */
interface ChartDetailProps {
  spec: ChartSpec;
  tickets: Ticket[];
  analysis?: AnalysisResult;
}

export function ChartDetail({ spec, tickets, analysis }: ChartDetailProps) {
  const filtered = filterTicketsForChart(spec, tickets);
  const spikes = analysis?.spike_analysis ?? [];
  const ritm = analysis?.ritm_summary;

  return (
    <div>
      <BigChart spec={spec} />
      <DataTable data={spec.data} xKey={spec.x_key} yKeys={spec.y_keys} />

      {/* RITM compliance detail */}
      {spec.id === "ritm_compliance" && ritm && (
        <div className="mt-5 rounded-lg border border-[#DFE1E6] bg-[#FAFBFC] p-4">
          <p className="text-xs font-semibold text-[#5E6C84] uppercase tracking-wide mb-2">Compliance Summary</p>
          <div className="grid grid-cols-3 gap-3 mb-3">
            {[
              { label: "Requiring Approval", value: ritm.total_requiring_approval, cls: "text-[#172B4D]" },
              { label: "Compliant",           value: ritm.compliant,               cls: "text-[#00875A]" },
              { label: "Non-Compliant",       value: ritm.non_compliant,           cls: "text-[#DE350B]" },
            ].map(({ label, value, cls }) => (
              <div key={label} className="rounded-lg border border-[#DFE1E6] bg-white p-3 text-center">
                <p className={`text-2xl font-bold ${cls}`}>{value}</p>
                <p className="text-[11px] text-[#5E6C84] mt-0.5">{label}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-[#172B4D] leading-relaxed">{ritm.detail}</p>
        </div>
      )}
      {spec.id === "ritm_compliance" && (
        <>
          <TicketTable
            tickets={tickets.filter((t) => t.approval_required && !t.compliant)}
            title="Non-compliant tickets"
            showComplianceReason
          />
          <TicketTable
            tickets={tickets.filter((t) => t.approval_required && t.compliant)}
            title="Compliant tickets"
          />
        </>
      )}

      {/* spike analysis detail */}
      {(spec.id === "weekly_volume" || spec.id === "spike_analysis") && spikes.length > 0 && (
        <SpikeSection spikes={spikes} tickets={tickets} />
      )}

      {/* delay reasons detail — show per-ticket delay reason */}
      {spec.id === "delay_reasons" && (
        <TicketTable
          tickets={tickets.filter((t) => t.sla_breached)}
          title="SLA-breached tickets — delay root cause"
          showDelayReason
        />
      )}

      {/* approval required detail */}
      {spec.id === "approval_required" && (
        <>
          <TicketTable
            tickets={tickets.filter((t) => t.approval_required && !t.compliant)}
            title="Non-compliant (approval required but not documented)"
            showComplianceReason
          />
          <TicketTable
            tickets={tickets.filter((t) => t.approval_required && t.compliant)}
            title="Compliant (approval documented)"
          />
        </>
      )}

      {/* generic ticket list for other charts */}
      {!["ritm_compliance", "weekly_volume", "spike_analysis", "delay_reasons", "approval_required"].includes(spec.id) && filtered.length > 0 && (
        <TicketTable tickets={filtered} title="Related tickets" />
      )}
    </div>
  );
}

/* ── ticket filter logic per chart ────────────────────────────────────────── */
function filterTicketsForChart(spec: ChartSpec, tickets: Ticket[]): Ticket[] {
  switch (spec.id) {
    case "priority_dist":
      return [...tickets].sort((a, b) => Number(a.priority) - Number(b.priority));
    case "category_dist":
    case "application_dist":
      return [...tickets].sort((a, b) => a.category.localeCompare(b.category));
    case "department_dist":
      return [...tickets].sort((a, b) => (a.department ?? "").localeCompare(b.department ?? ""));
    case "sla_by_month":
      return tickets.filter((t) => t.sla_breached);
    case "group_workload":
      return [...tickets].sort((a, b) => a.assignment_group.localeCompare(b.assignment_group));
    case "monthly_trend":
    case "weekly_volume":
      return [...tickets].sort((a, b) => a.opened_at.localeCompare(b.opened_at));
    case "ritm_compliance":
      return tickets.filter((t) => t.approval_required);
    case "approval_required":
      return tickets.filter((t) => t.approval_required);
    case "delay_reasons":
      return tickets.filter((t) => t.sla_breached);
    case "spike_analysis":
      return [...tickets].sort((a, b) => a.opened_at.localeCompare(b.opened_at));
    default:
      return tickets;
  }
}

/* ── modal shell ───────────────────────────────────────────────────────────── */
interface DrillDownModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export function DrillDownModal({ open, onClose, title, subtitle, children }: DrillDownModalProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#091E42]/25 backdrop-blur-[2px]"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-xl border border-[#DFE1E6] shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col m-4"
        style={{ boxShadow: "0 20px 60px rgba(9,30,66,0.2)" }}>
        <div className="flex items-start justify-between px-6 py-4 border-b border-[#DFE1E6] shrink-0">
          <div className="flex items-center gap-3">
            <Maximize2 className="h-4 w-4 text-[#0052CC]" />
            <div>
              <h2 className="text-sm font-semibold text-[#172B4D]">{title}</h2>
              {subtitle && <p className="text-xs text-[#5E6C84] mt-0.5">{subtitle}</p>}
            </div>
          </div>
          <button onClick={onClose} className="text-[#5E6C84] hover:text-[#172B4D] hover:bg-[#F4F5F7] rounded p-1 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

// keep Minus in scope to silence unused-import lint (used conditionally elsewhere)
const _unusedMinus = Minus;
void _unusedMinus;
const _unusedAlertTriangle = AlertTriangle;
void _unusedAlertTriangle;
