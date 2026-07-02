import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { agentsApi } from "@/api/client";
import type { RunRequest } from "@/types/agents";

const POLLING_INTERVAL_MS = 2500;
const TERMINAL = new Set(["completed", "blocked", "failed"]);

export function useRuns() {
  return useQuery({
    queryKey: ["runs"],
    queryFn: agentsApi.listRuns,
    staleTime: 10_000,
  });
}

export function useRun(runId: string) {
  return useQuery({
    queryKey: ["run", runId],
    queryFn: () => agentsApi.getRun(runId),
    refetchInterval: (query) =>
      query.state.data && TERMINAL.has(query.state.data.status)
        ? false
        : POLLING_INTERVAL_MS,
    staleTime: 0,
  });
}

export function useRunMessages(runId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["run-messages", runId],
    queryFn: () => agentsApi.getMessages(runId),
    enabled,
    staleTime: 60_000,
  });
}

export function useStartRun() {
  const qc = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (body: RunRequest) => agentsApi.startRun(body),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["runs"] });
      navigate(`/runs/${data.run_id}`);
    },
  });
}
