import { Link } from "react-router-dom";
import { Clock, BarChart2 } from "lucide-react";
import { StatusBadge } from "@/components/Badges";
import type { RunSummary } from "@/types/agents";

interface Props { runs: RunSummary[]; }

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export function RunHistoryTable({ runs }: Props) {
  if (!runs.length) {
    return (
      <div className="card flex flex-col items-center justify-center py-16 text-center fade-in">
        <BarChart2 className="h-8 w-8 text-ink-600 mb-3" />
        <p className="text-sm font-semibold text-ink-900 mb-1">No analysis runs yet</p>
        <p className="text-xs text-ink-600">Launch your first run using the form above.</p>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden fade-in">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <p className="card-title">Analysis Runs</p>
        <span className="pill pill-blue">{runs.length} run{runs.length !== 1 ? "s" : ""}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="th w-10">#</th>
              <th className="th">Objective</th>
              <th className="th">Status</th>
              <th className="th">Started</th>
              <th className="th">Finished</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((run, idx) => (
              <tr
                key={run.run_id}
                className="hover:bg-brand-50/60 transition-colors even:bg-slate-50/50"
              >
                <td className="td text-ink-600 font-mono text-[11px]">{runs.length - idx}</td>
                <td className="td max-w-xs">
                  <Link
                    to={`/runs/${run.run_id}`}
                    className="font-medium text-brand-600 hover:text-brand-700 hover:underline block truncate"
                  >
                    {run.objective}
                  </Link>
                  {run.final_summary && (
                    <p className="text-[11px] text-ink-600 truncate mt-0.5">
                      {run.final_summary.slice(0, 100)}
                    </p>
                  )}
                </td>
                <td className="td whitespace-nowrap">
                  <StatusBadge status={run.status} />
                </td>
                <td className="td whitespace-nowrap text-ink-600">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3 shrink-0" />
                    {formatDate(run.started_at)}
                  </span>
                </td>
                <td className="td whitespace-nowrap text-ink-600">
                  {run.completed_at ? formatDate(run.completed_at) : <span className="text-ink-600/50">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
