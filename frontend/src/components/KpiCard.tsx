import { ArrowUpRight, ArrowDownRight, Sparkles } from "lucide-react";

type Tone = "default" | "danger" | "success" | "warn";

interface Props {
  title: string;
  value: string | number;
  unit?: string;
  hint?: string;
  delta?: { value: number; good: "up" | "down" };
  tone?: Tone;
  icon?: React.ElementType;
  onClick?: () => void;
  onExplain?: () => void;
}

const TONE_STYLES: Record<Tone, { bar: string; icon: string; iconBg: string; value: string }> = {
  default: { bar: "bg-brand-600",   icon: "text-brand-600",   iconBg: "bg-brand-50",   value: "text-ink-900" },
  danger:  { bar: "bg-red-500",     icon: "text-red-600",     iconBg: "bg-red-50",     value: "text-red-600" },
  success: { bar: "bg-emerald-500", icon: "text-emerald-600", iconBg: "bg-emerald-50", value: "text-emerald-700" },
  warn:    { bar: "bg-amber-400",   icon: "text-amber-600",   iconBg: "bg-amber-50",   value: "text-amber-700" },
};

export function KpiCard({ title, value, unit, hint, delta, tone = "default", icon: Icon, onClick, onExplain }: Props) {
  const s = TONE_STYLES[tone];

  const deltaGood = delta
    ? (delta.value >= 0 && delta.good === "up") || (delta.value < 0 && delta.good === "down")
    : null;
  const DeltaIcon = delta && delta.value >= 0 ? ArrowUpRight : ArrowDownRight;

  return (
    <div
      className={`card lift fade-in relative overflow-hidden p-4 flex flex-col gap-3 ${onClick ? "cursor-pointer" : ""}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
    >
      {/* Colored left accent bar */}
      <span className={`absolute inset-y-0 left-0 w-1 rounded-l-lg ${s.bar}`} />

      <div className="flex items-start justify-between pl-2">
        {Icon && (
          <span className={`inline-flex p-1.5 rounded-md ${s.iconBg}`}>
            <Icon style={{ width: 16, height: 16 }} className={s.icon} />
          </span>
        )}
        {onExplain && (
          <button
            onClick={(e) => { e.stopPropagation(); onExplain(); }}
            className="ml-auto btn-ghost !px-1.5 !py-1 text-[11px] gap-1 text-ink-600"
            title="AI Explain"
          >
            <Sparkles style={{ width: 11, height: 11 }} />
          </button>
        )}
      </div>

      <div className="pl-2">
        <div className="flex items-baseline gap-1.5">
          <span className={`text-3xl font-extrabold leading-none ${s.value}`}>{value}</span>
          {unit && <span className="text-sm font-medium text-ink-600">{unit}</span>}
          {delta && (
            <span className={`flex items-center gap-0.5 text-[11px] font-bold ml-1 ${deltaGood ? "text-emerald-600" : "text-red-500"}`}>
              <DeltaIcon style={{ width: 12, height: 12 }} />
              {Math.abs(delta.value)}%
            </span>
          )}
        </div>
        <p className="text-xs font-semibold text-ink-700 uppercase tracking-wide mt-1.5">{title}</p>
        {hint && <p className="text-[11px] text-ink-600 mt-0.5 leading-snug">{hint}</p>}
      </div>
    </div>
  );
}
