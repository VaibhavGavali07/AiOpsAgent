import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AreaChart, Area, BarChart, Bar, Cell, Legend,
  LineChart, Line, PieChart, Pie,
  ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid,
} from "recharts";
import { Maximize2 } from "lucide-react";
import { DrillDownModal, ChartDetail } from "./DrillDownModal";
import type { ChartSpec, Ticket, AnalysisResult } from "@/types/agents";

/* ── Atlassian categorical palette ──────────────────────────────── */
export const CHART_COLORS = [
  "#0c66e4","#2898bd","#22a06b","#e2b203",
  "#e2483d","#8270db","#da62ac","#4cae4f",
  "#f18d13","#758195",
];

const TT: React.CSSProperties = {
  backgroundColor: "#fff",
  border: "1px solid #dfe1e6",
  borderRadius: 6,
  color: "#172B4D",
  fontSize: 11,
  padding: "6px 10px",
  boxShadow: "0 1px 1px rgba(9,30,66,.13),0 0 1px rgba(9,30,66,.18)",
};
const GRID = { stroke: "#eef2f7", strokeDasharray: "4 4", vertical: false as const };
const AX   = { tick: { fill: "#5E6C84", fontSize: 11 }, tickLine: false as const, axisLine: false as const };

interface Props {
  spec: ChartSpec;
  tickets?: Ticket[];
  analysis?: AnalysisResult;
  linkTo?: string;
  barFilterParam?: string;
}

export function ChartRenderer({ spec, tickets = [], analysis, linkTo, barFilterParam }: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const navigate = useNavigate();

  const handleClick = () => {
    if (linkTo) { navigate(linkTo); }
    else { setModalOpen(true); }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleBarClick = (data: any, _index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!linkTo) { setModalOpen(true); return; }
    const xVal = barFilterParam ? data[spec.x_key] : null;
    if (xVal != null) {
      const sep = linkTo.includes("?") ? "&" : "?";
      navigate(`${linkTo}${sep}${barFilterParam}=${encodeURIComponent(String(xVal))}`);
    } else {
      navigate(linkTo);
    }
  };

  const colors = spec.config?.colors?.length ? spec.config.colors : CHART_COLORS;

  let chart: React.ReactNode;

  if (spec.type === "bar") {
    chart = (
      <BarChart data={spec.data} margin={{ top: 4, right: 8, bottom: 4, left: -12 }} barCategoryGap="20%">
        <CartesianGrid {...GRID} />
        <XAxis dataKey={spec.x_key} {...AX} />
        <YAxis {...AX} />
        <Tooltip contentStyle={TT} cursor={{ fill: "rgba(12,102,228,0.06)" }} />
        {spec.y_keys.length > 1 && (
          <Legend formatter={(v) => <span style={{ color: "#5E6C84", fontSize: 10 }}>{v}</span>} iconSize={8} />
        )}
        {spec.y_keys.map((key, i) => (
          <Bar key={key} dataKey={key} fill={colors[i % colors.length]}
            radius={[4, 4, 0, 0]}
            style={{ cursor: "pointer" }}
            onClick={handleBarClick}
          />
        ))}
      </BarChart>
    );
  } else if (spec.type === "pie") {
    chart = (
      <PieChart>
        <Pie data={spec.data} dataKey={spec.y_keys[0]} nameKey={spec.x_key}
          cx="50%" cy="46%" outerRadius="80%" innerRadius="55%" paddingAngle={2}
          label={({ percent }: { percent?: number }) =>
            percent && percent > 0.1 ? `${((percent) * 100).toFixed(0)}%` : ""}
          labelLine={false}
        >
          {spec.data.map((_e, i) => (
            <Cell key={i} fill={colors[i % colors.length]} stroke="transparent" />
          ))}
        </Pie>
        <Tooltip contentStyle={TT} />
        <Legend formatter={(v) => <span style={{ color: "#5E6C84", fontSize: 10 }}>{v}</span>} iconSize={8} />
      </PieChart>
    );
  } else if (spec.type === "line") {
    chart = (
      <LineChart data={spec.data} margin={{ top: 4, right: 8, bottom: 4, left: -12 }}>
        <CartesianGrid {...GRID} />
        <XAxis dataKey={spec.x_key} {...AX} />
        <YAxis {...AX} />
        <Tooltip contentStyle={TT} />
        <Legend formatter={(v) => <span style={{ color: "#5E6C84", fontSize: 10 }}>{v}</span>} iconSize={8} />
        {spec.y_keys.map((key, i) => (
          <Line key={key} type="monotone" dataKey={key}
            stroke={colors[i % colors.length]} strokeWidth={2.5}
            dot={{ fill: colors[i % colors.length], r: 4, strokeWidth: 0 }}
            activeDot={{ r: 6, strokeWidth: 2, stroke: "#fff" }}
          />
        ))}
      </LineChart>
    );
  } else if (spec.type === "area") {
    chart = (
      <AreaChart data={spec.data} margin={{ top: 4, right: 8, bottom: 4, left: -12 }}>
        <defs>
          {spec.y_keys.map((key, i) => (
            <linearGradient key={key} id={`ag-${spec.id}-${i}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={colors[i % colors.length]} stopOpacity={0.2} />
              <stop offset="95%" stopColor={colors[i % colors.length]} stopOpacity={0.02} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid {...GRID} />
        <XAxis dataKey={spec.x_key} {...AX} />
        <YAxis {...AX} />
        <Tooltip contentStyle={TT} />
        {spec.y_keys.map((key, i) => (
          <Area key={key} type="monotone" dataKey={key}
            stroke={colors[i % colors.length]} fill={`url(#ag-${spec.id}-${i})`}
            strokeWidth={2.5} />
        ))}
      </AreaChart>
    );
  } else {
    chart = (
      <div className="flex items-center justify-center h-full text-ink-600 text-xs">
        Unknown chart type: {spec.type}
      </div>
    );
  }

  return (
    <>
      <div
        className="card lift chart-resizable flex flex-col group w-full"
        style={{ height: spec.type === "pie" ? "380px" : "310px" }}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-4 py-3 border-b border-slate-100 shrink-0">
          <div>
            <p className="card-title">{spec.title}</p>
            {spec.subtitle && <p className="text-[10px] muted mt-0.5">{spec.subtitle}</p>}
          </div>
          {!linkTo && (
            <button
              onClick={() => setModalOpen(true)}
              title="Expand"
              className="opacity-0 group-hover:opacity-100 transition-opacity text-ink-600 hover:text-brand-600 hover:bg-brand-50 rounded p-1"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Chart body */}
        <div className="flex-1 min-h-0 px-2 py-2 cursor-pointer" onClick={handleClick}>
          <ResponsiveContainer width="100%" height="100%">
            {chart as React.ReactElement}
          </ResponsiveContainer>
        </div>

      </div>

      {!linkTo && (
        <DrillDownModal open={modalOpen} onClose={() => setModalOpen(false)} title={spec.title} subtitle={spec.subtitle}>
          <ChartDetail spec={spec} tickets={tickets} analysis={analysis} />
        </DrillDownModal>
      )}
    </>
  );
}
