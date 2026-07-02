import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, CheckCircle2, Clock, TicketCheck, Timer } from "lucide-react";
import { DrillDownModal, KpiDetail } from "./DrillDownModal";
import { KpiCard } from "@/components/KpiCard";
import { SectionGrid } from "@/components/SectionGrid";
import type { Metrics, ChartSpec, AnalysisResult, Ticket } from "@/types/agents";

interface Props {
  metrics: Metrics;
  chartSpecs?: ChartSpec[];
  analysis?: AnalysisResult;
  tickets?: Ticket[];
  onCardClick?: (key: string) => void;
  cardRoutes?: Record<string, string>;
}

export function MetricsCards({ metrics, chartSpecs = [], analysis, tickets = [], onCardClick, cardRoutes }: Props) {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const navigate = useNavigate();

  const slaBreachPct = Math.round(metrics.sla_breach_rate * 100);
  const breachHigh   = slaBreachPct > 20;
  const resolutionRate = Math.round((metrics.resolved_tickets / Math.max(metrics.total_tickets, 1)) * 100);

  const cards = [
    {
      key:   "total_tickets",
      title: "Total Tickets",
      value: metrics.total_tickets,
      hint:  `${metrics.open_tickets} open · ${metrics.resolved_tickets} resolved`,
      icon:  TicketCheck,
      tone:  "default" as const,
    },
    {
      key:   "p1_count",
      title: "P1 Critical",
      value: metrics.p1_count,
      hint:  `${metrics.p2_count} P2 high priority`,
      icon:  AlertTriangle,
      tone:  metrics.p1_count > 3 ? "danger" as const : "warn" as const,
    },
    {
      key:   "sla_breach_rate",
      title: "SLA Breach Rate",
      value: `${slaBreachPct}%`,
      hint:  "of tickets breached SLA",
      icon:  Timer,
      tone:  breachHigh ? "danger" as const : "success" as const,
    },
    {
      key:   "avg_resolution_hours",
      title: "Avg Resolution",
      value: metrics.avg_resolution_hours,
      unit:  "h",
      hint:  "mean time to resolve",
      icon:  Clock,
      tone:  "default" as const,
    },
    {
      key:   "resolved_tickets",
      title: "Resolved",
      value: metrics.resolved_tickets,
      hint:  `${resolutionRate}% resolution rate`,
      icon:  CheckCircle2,
      tone:  "success" as const,
    },
  ];

  const openCard = cards.find((c) => c.key === openKey);

  return (
    <>
      <SectionGrid cols={5}>
        {cards.map(({ key, title, value, unit, hint, icon, tone }) => (
          <KpiCard
            key={key}
            title={title}
            value={value}
            unit={unit}
            hint={hint}
            icon={icon}
            tone={tone}
            onClick={() => {
              if (cardRoutes?.[key]) { navigate(cardRoutes[key]); }
              else if (onCardClick) { onCardClick(key); }
              else { setOpenKey(key); }
            }}
          />
        ))}
      </SectionGrid>

      {openCard && analysis && (
        <DrillDownModal
          open={!!openKey}
          onClose={() => setOpenKey(null)}
          title={openCard.title}
          subtitle={`${openCard.value}${openCard.unit ?? ""} · Click outside or press Esc to close`}
        >
          <KpiDetail
            metricKey={openKey!}
            metrics={metrics}
            chartSpecs={chartSpecs}
            analysis={analysis}
            tickets={tickets}
          />
        </DrillDownModal>
      )}
    </>
  );
}
