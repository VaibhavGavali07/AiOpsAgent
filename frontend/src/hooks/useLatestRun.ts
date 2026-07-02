import { useQuery } from "@tanstack/react-query";
import { agentsApi } from "@/api/client";
import { useRuns } from "@/hooks/useRuns";

export function useLatestRun() {
  const { data: runs, isLoading: runsLoading } = useRuns();

  const latestCompleted = runs
    ? [...runs].sort((a, b) => (b.started_at > a.started_at ? 1 : -1))
        .find((r) => r.status === "completed")
    : undefined;

  const runQuery = useQuery({
    queryKey: ["run", latestCompleted?.run_id],
    queryFn: () => agentsApi.getRun(latestCompleted!.run_id),
    enabled: !!latestCompleted?.run_id,
    staleTime: 10_000,
  });

  return {
    run: runQuery.data ?? null,
    runId: latestCompleted?.run_id ?? null,
    isLoading: runsLoading || (!!latestCompleted && runQuery.isLoading),
    error: runQuery.error ? String(runQuery.error) : null,
    hasNoRuns: !runsLoading && (!runs || runs.length === 0),
    hasNoCompleted: !runsLoading && !!runs && runs.length > 0 && !latestCompleted,
  };
}
