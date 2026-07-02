import { useState, useEffect, useRef, useCallback } from "react";

export interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

function extractMessage(e: unknown): string {
  if (e && typeof e === "object") {
    const err = e as Record<string, unknown>;
    const detail = (err.response as Record<string, unknown> | undefined)?.data;
    if (detail && typeof detail === "object") {
      const d = detail as Record<string, unknown>;
      if (typeof d.detail === "string") return d.detail;
    }
    if (typeof err.message === "string") return err.message;
  }
  return "Request failed";
}

export function useApi<T>(
  fetcher: () => Promise<T>,
  deps: unknown[],
  opts?: { skip?: boolean }
): ApiState<T> {
  const [data, setData]       = useState<T | null>(null);
  const [loading, setLoading] = useState(!opts?.skip);
  const [error, setError]     = useState<string | null>(null);
  const alive = useRef(true);
  const [rev, setRev]         = useState(0);

  const reload = useCallback(() => setRev((v) => v + 1), []);

  useEffect(() => {
    alive.current = true;
    if (opts?.skip) { setLoading(false); return; }

    setLoading(true);
    setError(null);

    fetcher()
      .then((d) => { if (alive.current) { setData(d); setLoading(false); } })
      .catch((e) => { if (alive.current) { setError(extractMessage(e)); setLoading(false); } });

    return () => { alive.current = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, rev, opts?.skip]);

  return { data, loading, error, reload };
}
