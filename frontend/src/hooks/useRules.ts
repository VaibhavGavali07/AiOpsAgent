import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { rulesApi } from "@/api/client";
import type { RuleType } from "@/types/agents";

export function useRules(ruleType?: RuleType) {
  return useQuery({
    queryKey: ["rules", ruleType ?? "all"],
    queryFn: () => rulesApi.list(ruleType),
    staleTime: 30_000,
  });
}

export function useCreateRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: rulesApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rules"] }),
  });
}

export function useUpdateRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: number; enabled?: boolean; rule_text?: string; name?: string }) =>
      rulesApi.update(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rules"] }),
  });
}

export function useDeleteRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => rulesApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rules"] }),
  });
}
