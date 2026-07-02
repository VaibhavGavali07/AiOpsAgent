/* Severity, Priority, Status badges using the .pill utility class */

export function SeverityBadge({ value }: { value: string }) {
  const v = value?.toLowerCase();
  const cls =
    v === "critical" ? "pill-critical" :
    v === "high"     ? "pill-high"     :
    v === "medium"   ? "pill-medium"   :
    v === "low"      ? "pill-low"      : "pill-gray";
  return <span className={`pill ${cls}`}>{value}</span>;
}

export function PriorityBadge({ value }: { value: string | number }) {
  const v = String(value);
  const label = v === "1" ? "P1 Critical" : v === "2" ? "P2 High" : v === "3" ? "P3 Medium" : `P${v}`;
  const cls   = v === "1" ? "pill-p1" : v === "2" ? "pill-p2" : v === "3" ? "pill-p3" : "pill-p4";
  return <span className={`pill ${cls}`}>{label}</span>;
}

export function StatusBadge({ status }: { status: string }) {
  const s = status?.toLowerCase().replace(/ /g, "-");
  const label =
    s === "initialized" ? "Queued"      :
    s === "running"     ? "Running"     :
    s === "completed"   ? "Done"        :
    s === "blocked"     ? "Blocked"     :
    s === "failed"      ? "Failed"      :
    s === "open"        ? "Open"        :
    s === "in-progress" ? "In Progress" :
    s === "resolved"    ? "Resolved"    :
    s === "closed"      ? "Closed"      : status;
  const cls =
    s === "initialized" ? "pill-gray"        :
    s === "running"     ? "pill-running"     :
    s === "completed"   ? "pill-completed"   :
    s === "blocked"     ? "pill-blocked"     :
    s === "failed"      ? "pill-failed"      :
    s === "open"        ? "pill-open"        :
    s === "in-progress" ? "pill-in-progress" :
    s === "resolved"    ? "pill-resolved"    :
    s === "closed"      ? "pill-closed"      : "pill-gray";
  const pulse = s === "running" ? " animate-pulse" : "";
  return <span className={`pill ${cls}${pulse}`}>{label}</span>;
}
