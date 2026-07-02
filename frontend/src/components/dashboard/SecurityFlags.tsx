import { ShieldAlert } from "lucide-react";

interface Props { flags: string[]; }

export function SecurityFlags({ flags }: Props) {
  if (!flags.length) return null;
  return (
    <div className="card border-red-200 bg-red-50 p-4 fade-in">
      <div className="flex items-start gap-3">
        <ShieldAlert className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
        <div>
          <p className="card-title text-red-700 mb-2">Security Flags</p>
          <ul className="space-y-1">
            {flags.map((f, i) => (
              <li key={i} className="text-xs text-red-700 flex items-start gap-1.5">
                <span className="text-red-400 mt-0.5 shrink-0">▸</span>
                {f}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
