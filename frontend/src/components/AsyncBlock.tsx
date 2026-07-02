import { Loader2, AlertTriangle, Inbox } from "lucide-react";

interface State<T> { data: T | null | undefined; loading: boolean; error: string | null | undefined; }

interface Props<T> {
  state: State<T>;
  children: (data: T) => React.ReactNode;
  height?: string;
  emptyMessage?: string;
}

function Loading({ height }: { height?: string }) {
  return (
    <div className={`flex items-center justify-center gap-2 text-ink-600 ${height ?? "min-h-[160px]"}`}>
      <Loader2 className="h-4 w-4 animate-spin text-brand-600" />
      <span className="text-sm">Loading…</span>
    </div>
  );
}

export function ErrorState({ message }: { message?: string | null }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 text-center min-h-[160px] p-6">
      <AlertTriangle className="h-7 w-7 text-red-400" />
      <p className="text-sm font-semibold text-ink-900">Something went wrong</p>
      {message && <p className="text-xs text-ink-600 max-w-xs">{message}</p>}
      <p className="text-xs text-ink-600">Is the backend running?</p>
    </div>
  );
}

export function EmptyState({ message }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 text-center min-h-[160px] p-6">
      <Inbox className="h-7 w-7 text-ink-600" />
      <p className="text-sm text-ink-600">{message ?? "No data for the current filters"}</p>
    </div>
  );
}

export function AsyncBlock<T>({ state, children, height, emptyMessage }: Props<T>) {
  if (state.loading && !state.data) return <Loading height={height} />;
  if (state.error)                  return <ErrorState message={state.error} />;
  if (!state.data || (Array.isArray(state.data) && state.data.length === 0))
    return <EmptyState message={emptyMessage} />;
  return <>{children(state.data as T)}</>;
}
