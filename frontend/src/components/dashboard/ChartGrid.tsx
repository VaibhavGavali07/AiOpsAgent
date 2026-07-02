import { ChartRenderer } from "./ChartRenderer";
import type { ChartSpec, Ticket } from "@/types/agents";

interface Props {
  specs: ChartSpec[];
  tickets?: Ticket[];
  analysis?: import("@/types/agents").AnalysisResult;
}

export function ChartGrid({ specs, tickets = [], analysis }: Props) {
  if (!specs.length) return null;
  return (
    /* flex-wrap so resized cards reflow naturally; align-items: flex-start
       is critical — prevents flex from overriding the explicit heights set
       when the user drags the resize handle on each card               */
    <div className="flex flex-wrap gap-4 items-start">
      {specs.map((spec) => (
        <ChartRenderer key={spec.id} spec={spec} tickets={tickets} analysis={analysis} />
      ))}
    </div>
  );
}
