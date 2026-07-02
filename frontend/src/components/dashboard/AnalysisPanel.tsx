import type { AnalysisResult } from "@/types/agents";
import { ArrowDown, ArrowRight, ArrowUp, Lightbulb, Minus, TrendingUp } from "lucide-react";

interface Props { analysis: AnalysisResult; }

const IMPACT_CLS: Record<string, string> = {
  high:   "pill pill-red",
  medium: "pill pill-yellow",
  low:    "pill pill-green",
};
const EFFORT_CLS: Record<string, string> = {
  low:    "pill pill-green",
  medium: "pill pill-yellow",
  high:   "pill pill-red",
};

function DirectionIcon({ direction }: { direction: string }) {
  if (direction === "up")     return <ArrowUp    className="h-3.5 w-3.5 text-red-500 shrink-0 mt-0.5" />;
  if (direction === "down")   return <ArrowDown  className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />;
  if (direction === "stable") return <Minus      className="h-3.5 w-3.5 text-ink-600 shrink-0 mt-0.5" />;
  return                             <ArrowRight className="h-3.5 w-3.5 text-ink-600 shrink-0 mt-0.5" />;
}

function Panel({ title, icon: Icon, iconCls, children }: {
  title: string; icon: React.ElementType; iconCls: string; children: React.ReactNode;
}) {
  return (
    <div className="card flex flex-col overflow-hidden fade-in">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 bg-slate-50">
        <Icon className={`h-3.5 w-3.5 ${iconCls}`} />
        <span className="card-title">{title}</span>
      </div>
      <div className="flex-1 px-4 py-3 space-y-2.5">{children}</div>
    </div>
  );
}

export function AnalysisPanel({ analysis }: Props) {
  return (
    <div className="grid gap-4 lg:grid-cols-3 fade-in">
        <Panel title="Top Issues" icon={TrendingUp} iconCls="text-violet-600">
          {analysis.top_issues.map((issue, i) => (
            <div key={i} className="flex items-center justify-between gap-2 py-0.5">
              <span className="text-xs text-ink-800 flex-1 min-w-0 truncate">{issue.issue}</span>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-xs font-bold text-ink-900">{issue.count}</span>
                <span className={IMPACT_CLS[issue.impact] ?? "pill pill-gray"}>{issue.impact}</span>
              </div>
            </div>
          ))}
        </Panel>

        <Panel title="Trends" icon={ArrowUp} iconCls="text-brand-600">
          {analysis.trends.map((trend, i) => (
            <div key={i} className="flex items-start gap-2">
              <DirectionIcon direction={trend.direction} />
              <span className="text-xs text-ink-800 leading-snug">{trend.observation}</span>
            </div>
          ))}
        </Panel>

        <Panel title="Recommendations" icon={Lightbulb} iconCls="text-amber-500">
          {analysis.recommendations.map((rec, i) => (
            <div key={i}>
              {i > 0 && <div className="h-px bg-slate-100 my-2" />}
              <p className="text-xs text-ink-800 leading-snug mb-1.5">{rec.action}</p>
              <div className="flex gap-1.5">
                <span className={IMPACT_CLS[rec.priority] ?? "pill pill-gray"}>{rec.priority}</span>
                <span className={EFFORT_CLS[rec.effort]   ?? "pill pill-gray"}>{rec.effort} effort</span>
              </div>
            </div>
          ))}
        </Panel>
    </div>
  );
}
