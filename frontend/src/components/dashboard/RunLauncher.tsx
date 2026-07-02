import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStartRun } from "@/hooks/useRuns";
import { Play } from "lucide-react";

export function RunLauncher() {
  const [objective, setObjective]   = useState("");
  const [state, setState]           = useState("any");
  const [limit, setLimit]           = useState("50");
  const [priorities, setPriorities] = useState<string[]>([]);

  const { mutate: startRun, isPending, error } = useStartRun();

  const togglePriority = (p: string) =>
    setPriorities((prev) => prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (objective.trim().length < 5) return;
    const filters: Record<string, unknown> = {};
    if (priorities.length) filters.priority = priorities;
    if (state !== "any") filters.state = state;
    if (limit) filters.limit = Number(limit);
    startRun({ objective: objective.trim(), filters });
  };

  const PRIORITY_STYLES: Record<string, { active: string; inactive: string }> = {
    "1": { active: "border-red-400    bg-red-50    text-red-700",    inactive: "border-slate-200 bg-white text-ink-600 hover:border-red-200 hover:text-red-600" },
    "2": { active: "border-orange-400 bg-orange-50 text-orange-700", inactive: "border-slate-200 bg-white text-ink-600 hover:border-orange-200" },
    "3": { active: "border-sky-400    bg-sky-50    text-sky-700",    inactive: "border-slate-200 bg-white text-ink-600 hover:border-sky-200" },
  };

  return (
    <div className="card p-5 fade-in">
      <p className="card-title mb-1">New Analysis Run</p>
      <p className="text-xs muted mb-4">Describe what to analyse from your ServiceNow data.</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Objective */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-ink-600 mb-1">Objective</p>
          <textarea
            placeholder="e.g. Summarise all P1 and P2 incidents from the last 30 days and identify recurring patterns"
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
            rows={3}
            className="input resize-none"
            required
            minLength={5}
            maxLength={2000}
          />
          <p className="text-[11px] text-ink-600 mt-1">{objective.length} / 2000</p>
        </div>

        {/* Filter row */}
        <div className="grid gap-4 sm:grid-cols-3">
          {/* Priority */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-ink-600 mb-1.5">Priority</p>
            <div className="flex gap-1.5">
              {["1", "2", "3"].map((p) => {
                const active = priorities.includes(p);
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => togglePriority(p)}
                    className={`flex-1 rounded border py-1.5 text-xs font-bold transition-colors ${
                      active ? PRIORITY_STYLES[p].active : PRIORITY_STYLES[p].inactive
                    }`}
                  >
                    P{p}
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-ink-600 mt-1">None = all</p>
          </div>

          {/* State */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-ink-600 mb-1.5">State</p>
            <Select value={state} onValueChange={setState}>
              <SelectTrigger className="input h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any state</SelectItem>
                <SelectItem value="Open">Open</SelectItem>
                <SelectItem value="In Progress">In Progress</SelectItem>
                <SelectItem value="Resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Limit */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-ink-600 mb-1.5">Ticket limit</p>
            <input
              type="number"
              min={1}
              max={500}
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
              className="input h-8 text-xs"
            />
          </div>
        </div>

        {error && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
            Failed to start run — check backend connection.
          </p>
        )}

        <button
          type="submit"
          disabled={isPending || objective.trim().length < 5}
          className="btn-primary w-full justify-center"
        >
          <Play className="h-3.5 w-3.5" />
          {isPending ? "Starting…" : "Launch Analysis"}
        </button>
      </form>
    </div>
  );
}
