import { useRun } from "@/hooks/useRuns";
import type { RunSummary } from "@/types/agents";

const STEPS: { key: string; label: string; detail: string }[] = [
  { key: "ceo_initial",        label: "Plan",        detail: "CEO agent drafts the analysis plan" },
  { key: "security_pre",       label: "Pre-check",   detail: "Security validates the objective" },
  { key: "servicenow_pulling", label: "Data pull",   detail: "Fetching ServiceNow ticket data" },
  { key: "security_data",      label: "Data scan",   detail: "Scanning raw data for threats" },
  { key: "analytical",         label: "Analysis",    detail: "AI analyses tickets & patterns" },
  { key: "security_output",    label: "Output scan", detail: "Validating analysis output" },
  { key: "graphical",          label: "Charts",      detail: "Generating charts & visualisations" },
  { key: "ceo_final",          label: "Finalise",    detail: "CEO agent reviews & signs off" },
];

const STEP_INDEX = Object.fromEntries(STEPS.map((s, i) => [s.key, i]));

interface Props {
  run: RunSummary;
}

export function RunProgressBar({ run }: Props) {
  const isActive  = run.status === "running" || run.status === "initialized";
  const isFailed  = run.status === "failed" || run.status === "blocked";
  const isDone    = run.status === "completed";

  // Poll detail only while running (the list endpoint has current_step too for cheapness)
  const { data: detail } = useRun(run.run_id);
  const currentStep = detail?.current_step ?? run.current_step;

  const activeIdx = currentStep ? (STEP_INDEX[currentStep] ?? -1) : -1;

  // Progress fraction: initializing=0, each completed step adds 1/8, done=100%
  const pct = isDone ? 100 : isFailed ? 0 : activeIdx >= 0 ? Math.round(((activeIdx + 1) / STEPS.length) * 100) : 4;

  const barColor = isFailed ? "bg-red-500" : isDone ? "bg-emerald-500" : "bg-brand-500";

  const activeStep = STEPS[activeIdx];

  return (
    <div className="card px-4 py-4 space-y-3 fade-in">
      {/* Header row */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 min-w-0">
          {isActive && (
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-500" />
            </span>
          )}
          <span className="text-xs font-semibold text-ink-800 truncate">
            {isDone ? "Analysis complete" : isFailed ? "Analysis failed" : activeStep ? activeStep.detail : "Initialising pipeline…"}
          </span>
        </div>
        <span className="text-xs font-bold text-ink-700 shrink-0 tabular-nums">{pct}%</span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Step pills */}
      <div className="flex gap-1 flex-wrap">
        {STEPS.map((step, i) => {
          const done    = isDone || i < activeIdx;
          const active  = i === activeIdx && isActive;
          const failed  = isFailed && i === activeIdx;
          return (
            <span
              key={step.key}
              title={step.detail}
              className={`rounded-full px-2 py-0.5 text-[10px] font-medium border transition-colors
                ${failed  ? "border-red-300 bg-red-50 text-red-600" :
                  active  ? "border-brand-400 bg-brand-50 text-brand-700 ring-1 ring-brand-300" :
                  done    ? "border-emerald-200 bg-emerald-50 text-emerald-700" :
                            "border-slate-200 bg-white text-ink-500"}`}
            >
              {active && (
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-brand-500 mr-1 animate-pulse" />
              )}
              {step.label}
            </span>
          );
        })}
      </div>
    </div>
  );
}
